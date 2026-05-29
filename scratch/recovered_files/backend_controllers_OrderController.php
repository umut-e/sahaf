<?php
require_once __DIR__ . '/../models/Order.php';
require_once __DIR__ . '/../models/CartItem.php';
require_once __DIR__ . '/../models/Book.php';

/**
 * OrderController allows users to place orders from their cart and view
 * existing orders. Admins can view all orders. Each order consists of
 * multiple items.
 */
class OrderController {
    private $db;
    public function __construct($db) {
        $this->db = $db;
    }

    // List orders for current user or all orders for admin
    public function list() {
        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        $orderModel = new Order($this->db);
        
        $params = [
            'page' => $_GET['page'] ?? 1,
            'limit' => $_GET['limit'] ?? 20,
            'search' => $_GET['search'] ?? null,
            'status' => $_GET['status'] ?? null,
            'sort' => $_GET['sort'] ?? null,
        ];
        
        $orders = $orderModel->getOrders($role === 'admin' ? null : $userId, $params);
        http_response_code(200);
        echo json_encode($orders);
    }

    // Place a new order from cart
    public function create() {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        // get cart items
        $cartModel = new CartItem($this->db);
        $items = $cartModel->getByUser($userId);
        if (empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Cart is empty']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $address = $data['address'] ?? null;

        $orderModel = new Order($this->db);
        try {
            $orderId = $orderModel->create($userId, $items, $address);
            http_response_code(201);
            echo json_encode(['message' => 'Order placed', 'order_id' => $orderId]);
        } catch (Exception $e) {





























        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['status'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Status is required']);
            return;
        }

        $orderModel = new Order($this->db);
        $order = $orderModel->getById($id);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found']);
            return;
        }

        if ($role !== 'admin') {
            // User can only cancel their own pending orders
            if ($order['user_id'] != $user_id) {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                return;
            }
            if ($data['status'] !== 'user_cancelled' && $data['status'] !== 'cancelled') {
                http_response_code(403);
                echo json_encode(['error' => 'Users can only cancel orders']);
                return;
            }
            if ($order['status'] !== 'pending') {
                http_response_code(400);
                echo json_encode(['error' => 'Only pending orders can be cancelled']);
                return;
            }
        }

        $reason = $data['cancellation_reason'] ?? null;
        if ($orderModel->updateStatus($id, $data['status'], $reason)) {
            http_response_code(200);
            echo json_encode(['message' => 'Order status updated']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to update order status']);
        }
    }
}
?>
