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
        $page = $_GET['page'] ?? 1;
        $limit = $_GET['limit'] ?? 10;
        $search = $_GET['search'] ?? null;
        $author = $_GET['author'] ?? null;
        $category_id = $_GET['category_id'] ?? null;
        $condition = $_GET['condition'] ?? null;
        $sort = isset($_GET['sort']) ? $_GET['sort'] : 'newest';
        
        $params = [
            'page' => $page,
            'limit' => $limit,
            'search' => $search,
            'author' => $author,
            'category_id' => $category_id,
            'condition' => $condition,
            'sort' => $sort
        ];
        $bookModel = new Book($this->db);
        $result = $bookModel->list($params);
        http_response_code(200);
        echo json_encode($result);
    }

    public function get($id) {
        $bookModel = new Book($this->db);
        $book = $bookModel->find($id);
        if ($book) {
            $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
            $book['can_review'] = false;
            
            if ($userId) {
           
























































































































































































                $bookModel->deleteImages($id);
                $bookModel->saveImages($id, $savedImages);
            }
        }
        
        if ($success || !empty($savedImages)) {
            http_response_code(200);
            echo json_encode(['message' => 'Book updated']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to update book']);
        }
    }

    // Delete all images for a book (admin only)
    public function deleteImages($id) {
        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        if ($role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Only admin can delete images']);
            return;
        }
        $bookModel = new Book($this->db);
        if ($bookModel->deleteImages($id)) {
            http_response_code(200);
            echo json_encode(['message' => 'Images deleted']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to delete images']);
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
