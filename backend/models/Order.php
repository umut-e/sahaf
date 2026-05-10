<?php
/**
 * Order model handles creation and retrieval of orders. An order consists of
 * one or more order_items. When an order is placed, cart items are
 * transformed into order_items and the cart is cleared. Status field
 * indicates the progress of the order.
 */
class Order {
    private $conn;
    private $table_name = "orders";

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create a new order for a user from cart items
    public function create($user_id, $items) {
        // begin transaction
        $this->conn->beginTransaction();
        try {
            // calculate total
            $total = 0;
            foreach ($items as $item) {
                $total += $item['price'] * $item['quantity'];
            }
            $stmt = $this->conn->prepare("INSERT INTO " . $this->table_name . " (user_id, total_price, status, created_at, updated_at) VALUES (:user_id, :total_price, 'pending', NOW(), NOW())");
            $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindParam(':total_price', $total);
            $stmt->execute();
            $order_id = $this->conn->lastInsertId();
            // insert order items
            $itemStmt = $this->conn->prepare("INSERT INTO order_items (order_id, book_id, quantity, price, created_at) VALUES (:order_id, :book_id, :quantity, :price, NOW())");
            foreach ($items as $item) {
                $itemStmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
                $itemStmt->bindParam(':book_id', $item['book_id'], PDO::PARAM_INT);
                $itemStmt->bindParam(':quantity', $item['quantity'], PDO::PARAM_INT);
                $itemStmt->bindParam(':price', $item['price']);
                $itemStmt->execute();
            }
            // clear cart
            $clear = $this->conn->prepare("DELETE FROM cart_items WHERE user_id = :user_id");
            $clear->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $clear->execute();
            $this->conn->commit();
            return $order_id;
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    // Get orders for a user; if admin, return all
    public function getOrders($user_id = null) {
        if ($user_id) {
            $query = "SELECT * FROM " . $this->table_name . " WHERE user_id = :user_id ORDER BY created_at DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        } else {
            $query = "SELECT * FROM " . $this->table_name . " ORDER BY created_at DESC";
            $stmt = $this->conn->prepare($query);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get order details by id
    public function getById($id) {
        $stmt = $this->conn->prepare("SELECT * FROM " . $this->table_name . " WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($order) {
            $itemsStmt = $this->conn->prepare("SELECT oi.*, b.title FROM order_items oi JOIN books b ON oi.book_id = b.id WHERE oi.order_id = :order_id");
            $itemsStmt->bindParam(':order_id', $id, PDO::PARAM_INT);
            $itemsStmt->execute();
            $order['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return $order;
    }
}
?>