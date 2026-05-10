<?php
require_once __DIR__ . '/../models/Favorite.php';

/**
 * FavoriteController lets users manage their favorite books. Users can
 * retrieve their favorites, add a new favorite, or remove one. Each user
 * can only mark a book once.
 */
class FavoriteController {
    private $db;
    public function __construct($db) {
        $this->db = $db;
    }

    // List favorites for current user
    public function list() {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $favModel = new Favorite($this->db);
        $favorites = $favModel->getByUser($userId);
        http_response_code(200);
        echo json_encode($favorites);
    }

    // Add a book to favorites
    public function add() {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['book_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'book_id is required']);
            return;
        }
        $favModel = new Favorite($this->db);
        if ($favModel->add($userId, $data['book_id'])) {
            http_response_code(201);
            echo json_encode(['message' => 'Added to favorites']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Unable to add favorite']);
        }
    }

    // Remove a favorite
    public function delete($book_id) {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $favModel = new Favorite($this->db);
        if ($favModel->delete($userId, $book_id)) {
            http_response_code(200);
            echo json_encode(['message' => 'Removed from favorites']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to remove favorite']);
        }
    }
}
?>