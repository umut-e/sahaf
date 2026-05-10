<?php
require_once __DIR__ . '/../models/CartItem.php';
require_once __DIR__ . '/../models/Book.php';

/**
 * CartController manages the cart operations. Users can view their cart,
 * add books, update quantities and remove items. Cart is stored in
 * cart_items table.
 */
class CartController {
    private $db;
    public function __construct($db) {
        $this->db = $db;
    }

    // Get cart items for current user
    public function list() {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $cartModel = new CartItem($this->db);
        $items = $cartModel->getByUser($userId);
        http_response_code(200);
        echo json_encode($items);
    }

    // Add book to cart
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
        $quantity = $data['quantity'] ?? 1;
        $cartModel = new CartItem($this->db);
        if ($cartModel->add($userId, $data['book_id'], $quantity)) {
            http_response_code(201);
            echo json_encode(['message' => 'Added to cart']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to add to cart']);
        }
    }

    // Update cart item quantity
    public function update($id) {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['quantity'])) {
            http_response_code(400);
            echo json_encode(['error' => 'quantity is required']);
            return;
        }
        $cartModel = new CartItem($this->db);
        if ($cartModel->updateQuantity($id, $data['quantity'])) {
            http_response_code(200);
            echo json_encode(['message' => 'Cart updated']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to update cart']);
        }
    }

    // Remove cart item
    public function delete($id) {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $cartModel = new CartItem($this->db);
        if ($cartModel->delete($id)) {
            http_response_code(200);
            echo json_encode(['message' => 'Removed from cart']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to remove']);
        }
    }
}
?>