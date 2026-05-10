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
        $orders = $orderModel->getOrders($role === 'admin' ? null : $userId);
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
        $orderModel = new Order($this->db);
        try {
            $orderId = $orderModel->create($userId, $items);
            http_response_code(201);
            echo json_encode(['message' => 'Order placed', 'order_id' => $orderId]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Unable to place order']);
        }
    }

    // Get details of an order
    public function get($id) {
        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        $orderModel = new Order($this->db);
        $order = $orderModel->getById($id);
        if (!$order) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found']);
            return;
        }
        // ensure user can only access their own order unless admin
        if ($role !== 'admin' && $order['user_id'] != $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }
        http_response_code(200);
        echo json_encode($order);
    }
}
?>