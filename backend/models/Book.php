<?php
require_once __DIR__ . '/../config/db.php';

/**
 * Book model encapsulates operations on the books table and related tables
 * such as book_images. It provides methods for listing books with
 * pagination and simple filtering, retrieving a single book, and performing
 * CRUD operations. For brevity only essential fields are handled here.
 */
class Book {
    private $conn;
    private $table_name = "books";

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Get a list of books with optional search, author, category and condition
     * filters. Supports pagination using page and limit parameters. Returns
     * an associative array containing the results and metadata.
     */
    public function list($params) {
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $limit = isset($params['limit']) ? (int)$params['limit'] : 10;
        $offset = ($page - 1) * $limit;

        $where = [];
        $bindings = [];
        
        // Admin or specific requests might want to include inactive books. Default is active only.
        if (empty($params['include_inactive'])) {
            $where[] = "b.is_active = 1";
        }

        if (!empty($params['search'])) {
            $where[] = "(b.title LIKE :search OR b.author LIKE :search OR b.description LIKE :search)";
            $bindings[':search'] = '%' . $params['search'] . '%';
        }
        if (!empty($params['author'])) {
            $where[] = "b.author = :author";
            $bindings[':author'] = $params['author'];
        }
        if (!empty($params['category_id'])) {
            $where[] = "b.category_id = :category_id";
            $bindings[':category_id'] = $params['category_id'];
        }
        if (!empty($params['condition'])) {
            $where[] = "b.`condition` = :condition";
            $bindings[':condition'] = $params['condition'];
        }
        $whereSql = '';
        if (count($where) > 0) {
            $whereSql = ' WHERE ' . implode(' AND ', $where);
        }

        // count total
        $countQuery = "SELECT COUNT(*) as total FROM " . $this->table_name . " b" . $whereSql;
        $stmt = $this->conn->prepare($countQuery);
        foreach ($bindings as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        $total = (int)$stmt->fetchColumn();

        $sort = isset($params['sort']) ? $params['sort'] : 'newest';
        $orderSql = " ORDER BY b.created_at DESC";
        if ($sort === 'price_asc') {
            $orderSql = " ORDER BY b.price ASC";
        } elseif ($sort === 'price_desc') {
            $orderSql = " ORDER BY b.price DESC";
        } elseif ($sort === 'condition_new') {
            $orderSql = " ORDER BY b.`condition` DESC";
        } elseif ($sort === 'rating_desc') {
            $orderSql = " ORDER BY avg_rating DESC";
        } elseif ($sort === 'oldest') {
            $orderSql = " ORDER BY b.created_at ASC";
        }

        // Select books along with category name, first image (primary image), and avg_rating
        $query = "SELECT b.*, c.name as category_name, COALESCE(r.avg_rating, 0) as avg_rating,
                        (SELECT image_path FROM book_images bi WHERE bi.book_id = b.id ORDER BY bi.id ASC LIMIT 1) AS primary_image
                  FROM " . $this->table_name . " b
                  LEFT JOIN categories c ON b.category_id = c.id
                  LEFT JOIN (SELECT book_id, AVG(rating) as avg_rating FROM reviews GROUP BY book_id) r ON b.id = r.book_id
                  " . $whereSql . $orderSql . " LIMIT :offset, :limit";
        $stmt = $this->conn->prepare($query);
        foreach ($bindings as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'data' => $items
        ];
    }

    // Retrieve a single book and its images
    public function find($id) {
        $query = "SELECT b.*, c.name as category_name FROM " . $this->table_name . " b
                  LEFT JOIN categories c ON b.category_id = c.id WHERE b.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $book = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($book) {
            // get images
            $imgStmt = $this->conn->prepare("SELECT image_path FROM book_images WHERE book_id = :book_id");
            $imgStmt->bindParam(':book_id', $id, PDO::PARAM_INT);
            $imgStmt->execute();
            $book['images'] = $imgStmt->fetchAll(PDO::FETCH_COLUMN);
        }
        return $book;
    }

    // Create a new book record; expects an associative array with keys matching
    // the table columns. Returns the inserted id.
    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . " (category_id, title, author, price, description, `condition`, added_by, created_at, updated_at) VALUES (:category_id, :title, :author, :price, :description, :condition, :added_by, NOW(), NOW())";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':category_id', $data['category_id']);
        $stmt->bindParam(':title', $data['title']);
        $stmt->bindParam(':author', $data['author']);
        $stmt->bindParam(':price', $data['price']);
        $stmt->bindParam(':description', $data['description']);
        $stmt->bindParam(':condition', $data['condition']);
        $stmt->bindParam(':added_by', $data['added_by']);
        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    // Update an existing book
    public function update($id, $data) {
        $fields = [];
        $allowed = ['category_id','title','author','price','description','condition'];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $fields[$field] = $data[$field];
            }
        }
        if (empty($fields)) {
            return false;
        }
        $setClause = [];
        foreach ($fields as $key => $val) {
            $setClause[] = "`$key` = :$key";
        }
        $query = "UPDATE " . $this->table_name . " SET " . implode(',', $setClause) . ", updated_at = NOW() WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        foreach ($fields as $key => $val) {
            $stmt->bindParam(':' . $key, $fields[$key]);
        }
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Delete a book (Soft delete to protect order history)
    public function delete($id) {
        $stmt = $this->conn->prepare("UPDATE " . $this->table_name . " SET is_active = 0 WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Save book images (multiple)
    public function saveImages($book_id, $images) {
        $stmt = $this->conn->prepare("INSERT INTO book_images (book_id, image_path, created_at) VALUES (:book_id, :image_path, NOW())");
        foreach ($images as $img) {
            $stmt->bindParam(':book_id', $book_id);
            $stmt->bindParam(':image_path', $img);
            $stmt->execute();
        }
    }

    // Delete all images for a specific book
    public function deleteImages($book_id) {
        $stmt = $this->conn->prepare("DELETE FROM book_images WHERE book_id = :book_id");
        $stmt->bindParam(':book_id', $book_id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
?>