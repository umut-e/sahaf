<?php
require_once __DIR__ . '/../models/Review.php';

/**
 * ReviewController exposes endpoints for listing reviews of a book and
 * submitting a rating/comment. Users must be authenticated to post a
 * review. A user can only leave one review per book; additional posts
 * update the existing entry.
 */
class ReviewController {
    private $db;
    public function __construct($db) {
        $this->db = $db;
    }

    // List reviews for a book
    public function list($book_id) {
        $reviewModel = new Review($this->db);
        $reviews = $reviewModel->getByBook($book_id);
        http_response_code(200);
        echo json_encode($reviews);
    }

    // Post a review for a book
    public function create($book_id) {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['rating'])) {
            http_response_code(400);
            echo json_encode(['error' => 'rating is required']);
            return;
        }
        $rating = (int)$data['rating'];
        if ($rating < 1 || $rating > 5) {
            http_response_code(400);
            echo json_encode(['error' => 'rating must be between 1 and 5']);
            return;
        }
        $comment = $data['comment'] ?? '';
        $reviewModel = new Review($this->db);
        if ($reviewModel->upsert($userId, $book_id, $rating, $comment)) {
            http_response_code(201);
            echo json_encode(['message' => 'Review saved']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save review']);
        }
    }
}
?>