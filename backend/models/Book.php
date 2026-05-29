<?php
/**
 * Book modeli — kitap listeleme (filtre/arama/sıralama/sayfalama), detay,
 * oluşturma, güncelleme, yumuşak silme (is_active=0) ve görsel yönetimi.
 */
class Book {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function list(array $p): array {
        $where = "WHERE b.is_active = 1";
        $bind = [];

        if (!empty($p['search'])) {
            $where .= " AND (b.title LIKE :s OR b.author LIKE :s)";
            $bind[':s'] = '%' . $p['search'] . '%';
        }
        if (!empty($p['category_id'])) {
            $where .= " AND b.category_id = :cat";
            $bind[':cat'] = (int) $p['category_id'];
        }
        if (!empty($p['condition'])) {
            $where .= " AND b.`condition` = :cond";
            $bind[':cond'] = $p['condition'];
        }
        if (!empty($p['in_stock'])) {
            $where .= " AND b.stock > 0";
        }

        $sortMap = [
            'newest'      => 'b.created_at DESC',
            'oldest'      => 'b.created_at ASC',
            'price_asc'   => 'b.price ASC',
            'price_desc'  => 'b.price DESC',
            'title_asc'   => 'b.title ASC',
            'rating_desc' => 'avg_rating DESC',
        ];
        $order = $sortMap[$p['sort'] ?? 'newest'] ?? $sortMap['newest'];

        $page  = max(1, (int) ($p['page'] ?? 1));
        $limit = min(50, max(1, (int) ($p['limit'] ?? 12)));
        $offset = ($page - 1) * $limit;

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM books b $where");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT b.id, b.title, b.author, b.price, b.`condition`, b.stock, b.category_id,
                       c.name AS category_name,
                       (SELECT image_path FROM book_images WHERE book_id = b.id ORDER BY id ASC LIMIT 1) AS primary_image,
                       (SELECT ROUND(AVG(rating),1) FROM reviews WHERE book_id = b.id) AS avg_rating,
                       (SELECT COUNT(*) FROM reviews WHERE book_id = b.id) AS review_count
                FROM books b
                LEFT JOIN categories c ON b.category_id = c.id
                $where
                ORDER BY $order
                LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        foreach ($bind as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['data' => $stmt->fetchAll(), 'total' => $total, 'page' => $page, 'limit' => $limit];
    }

    public function find($id) {
        $sql = "SELECT b.*, c.name AS category_name,
                       (SELECT ROUND(AVG(rating),1) FROM reviews WHERE book_id = b.id) AS avg_rating,
                       (SELECT COUNT(*) FROM reviews WHERE book_id = b.id) AS review_count
                FROM books b
                LEFT JOIN categories c ON b.category_id = c.id
                WHERE b.id = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $book = $stmt->fetch();
        if (!$book) {
            return null;
        }
        $imgStmt = $this->db->prepare("SELECT id, image_path FROM book_images WHERE book_id = :id ORDER BY id ASC");
        $imgStmt->execute([':id' => $id]);
        $book['images'] = $imgStmt->fetchAll();          // [{id, image_path}, ...]
        $book['primary_image'] = $book['images'][0]['image_path'] ?? null;
        return $book;
    }

    public function create(array $d): int {
        $sql = "INSERT INTO books (category_id, title, author, price, description, `condition`, stock, is_active, added_by, created_at, updated_at)
                VALUES (:category_id, :title, :author, :price, :description, :condition, :stock, 1, :added_by, NOW(), NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':category_id' => !empty($d['category_id']) ? (int) $d['category_id'] : null,
            ':title'       => $d['title'],
            ':author'      => $d['author'],
            ':price'       => $d['price'],
            ':description' => $d['description'] ?? null,
            ':condition'   => $d['condition'] ?? 'good',
            ':stock'       => (int) ($d['stock'] ?? 0),
            ':added_by'    => $d['added_by'] ?? null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update($id, array $d): bool {
        $allowed = ['category_id', 'title', 'author', 'price', 'description', 'condition', 'stock', 'is_active'];
        $set = [];
        $bind = [':id' => $id];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $d)) {
                $col = $f === 'condition' ? '`condition`' : $f;
                $set[] = "$col = :$f";
                $bind[":$f"] = ($f === 'category_id' && ($d[$f] === '' || $d[$f] === null)) ? null : $d[$f];
            }
        }
        if (empty($set)) {
            return false;
        }
        $sql = "UPDATE books SET " . implode(', ', $set) . ", updated_at = NOW() WHERE id = :id";
        return $this->db->prepare($sql)->execute($bind);
    }

    /** Yumuşak silme: is_active = 0 (sipariş geçmişi korunur). */
    public function softDelete($id): bool {
        return $this->db->prepare("UPDATE books SET is_active = 0, updated_at = NOW() WHERE id = :id")
                        ->execute([':id' => $id]);
    }

    public function saveImages($bookId, array $paths): void {
        if (empty($paths)) {
            return;
        }
        $stmt = $this->db->prepare("INSERT INTO book_images (book_id, image_path, created_at) VALUES (:b, :p, NOW())");
        foreach ($paths as $path) {
            $stmt->execute([':b' => $bookId, ':p' => $path]);
        }
    }

    public function getImagePaths($bookId): array {
        $stmt = $this->db->prepare("SELECT image_path FROM book_images WHERE book_id = :id");
        $stmt->execute([':id' => $bookId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function deleteImages($bookId): bool {
        // Önce diskteki dosyaları temizle, sonra satırları sil.
        foreach ($this->getImagePaths($bookId) as $path) {
            $file = __DIR__ . '/../' . $path;
            if (is_file($file)) {
                @unlink($file);
            }
        }
        return $this->db->prepare("DELETE FROM book_images WHERE book_id = :id")->execute([':id' => $bookId]);
    }

    /** Tek bir görseli (ve dosyasını) siler. */
    public function deleteImage($bookId, $imageId): bool {
        $sel = $this->db->prepare("SELECT image_path FROM book_images WHERE id = :img AND book_id = :b");
        $sel->execute([':img' => $imageId, ':b' => $bookId]);
        $path = $sel->fetchColumn();
        if ($path === false) {
            return false;
        }
        $file = __DIR__ . '/../' . $path;
        if (is_file($file)) {
            @unlink($file);
        }
        return $this->db->prepare("DELETE FROM book_images WHERE id = :img AND book_id = :b")
                        ->execute([':img' => $imageId, ':b' => $bookId]);
    }
}
