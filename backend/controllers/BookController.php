<?php
require_once __DIR__ . '/../models/Book.php';
require_once __DIR__ . '/../models/Category.php';

/**
 * BookController manages book-related operations such as listing all books,
 * retrieving a specific book, creating new books (admin only), updating and
 * deleting books. It also handles uploading multiple images for a book.
 */
class BookController {
    private $db;
    private $uploadDir;

    public function __construct($db) {
        $this->db = $db;
        $this->uploadDir = __DIR__ . '/../uploads/';
    }

    // List books with optional filters and pagination
    public function list() {
        $params = [
            'page' => $_GET['page'] ?? 1,
            'limit' => $_GET['limit'] ?? 10,
            'search' => $_GET['search'] ?? null,
            'author' => $_GET['author'] ?? null,
            'category_id' => $_GET['category_id'] ?? null,
            'condition' => $_GET['condition'] ?? null,
        ];
        $bookModel = new Book($this->db);
        $result = $bookModel->list($params);
        http_response_code(200);
        echo json_encode($result);
    }

    // Retrieve a single book by id
    public function get($id) {
        $bookModel = new Book($this->db);
        $book = $bookModel->find($id);
        if ($book) {
            http_response_code(200);
            echo json_encode($book);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Book not found']);
        }
    }

    // Create a new book (admin only). Accepts JSON or form-data and multiple
    // image uploads under field name images[].
    public function create() {
        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if ($role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Only admin can add books']);
            return;
        }
        // Determine input content type
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $bookModel = new Book($this->db);
        if (strpos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents('php://input'), true);
        } else {
            $data = $_POST;
        }
        if (!isset($data['title'], $data['author'], $data['price'], $data['description'], $data['condition'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        $bookData = [
            'category_id' => !empty($data['category_id']) ? $data['category_id'] : null,
            'title' => $data['title'],
            'author' => $data['author'],
            'price' => $data['price'],
            'description' => $data['description'],
            'condition' => $data['condition'],
            'added_by' => $userId ?? null
        ];
        $bookId = $bookModel->create($bookData);
        if (!$bookId) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create book']);
            return;
        }
        // handle file uploads
        $savedImages = [];
        if (!empty($_FILES['images']['name'])) {
            foreach ($_FILES['images']['name'] as $index => $name) {
                $tmpName = $_FILES['images']['tmp_name'][$index];
                if (!$tmpName) continue;
                $ext = pathinfo($name, PATHINFO_EXTENSION);
                $newName = uniqid('book_') . '.' . $ext;
                $dest = $this->uploadDir . $newName;
                if (move_uploaded_file($tmpName, $dest)) {
                    $savedImages[] = 'uploads/' . $newName;
                }
            }
            if (!empty($savedImages)) {
                $bookModel->saveImages($bookId, $savedImages);
            }
        }
        http_response_code(201);
        echo json_encode(['message' => 'Book created', 'id' => $bookId]);
    }

    // Update a book (admin only)
    public function update($id) {
        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        if ($role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Only admin can update books']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['category_id']) && empty($data['category_id'])) {
            $data['category_id'] = null;
        }
        $bookModel = new Book($this->db);
        $success = $bookModel->update($id, $data);
        if ($success) {
            http_response_code(200);
            echo json_encode(['message' => 'Book updated']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to update book']);
        }
    }

    // Delete a book (admin only)
    public function delete($id) {
        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        if ($role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Only admin can delete books']);
            return;
        }
        $bookModel = new Book($this->db);
        if ($bookModel->delete($id)) {
            http_response_code(200);
            echo json_encode(['message' => 'Book deleted']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to delete book']);
        }
    }
}
?>