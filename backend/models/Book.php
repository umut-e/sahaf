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
        if (!empty($params['search'])) {
            $where[] = "(b.title LIKE :search OR b.author LIKE :search)";
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

        // Select books along with category name and first image (primary image)
        // Using a subquery to fetch the first image for each book ensures that
        // the front‑end can display thumbnails in lists. This avoids heavy
        // JOINs while keeping the API response lean. See docs for modern UI
        // recommendations on using images in card designs【910602885267269†L195-L209】.
        $query = "SELECT b.*, c.name as category_name,
                        (SELECT image_path FROM book_images bi WHERE bi.book_id = b.id ORDER BY bi.id ASC LIMIT 1) AS primary_image
                  FROM " . $this->table_name . " b
                  LEFT JOIN categories c ON b.category_id = c.id" . $whereSql .
                 " ORDER BY b.created_at DESC LIMIT :offset, :limit";
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

    // Delete a book and its images
    public function delete($id) {
        // delete images
        $imgStmt = $this->conn->prepare("DELETE FROM book_images WHERE book_id = :book_id");
        $imgStmt->bindParam(':book_id', $id, PDO::PARAM_INT);
        $imgStmt->execute();
        // delete book
        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
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
}
?>