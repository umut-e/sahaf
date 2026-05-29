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
    public function create($user_id, $items, $address = null) {
        // begin transaction
        $this->conn->beginTransaction();
        try {
            // calculate total and check stock
            $total = 0;
            $stockCheckStmt = $this->conn->prepare("SELECT title, stock FROM books WHERE id = :id FOR UPDATE");
            
            foreach ($items as $item) {
                $stockCheckStmt->execute([':id' => $item['book_id']]);
                $book = $stockCheckStmt->fetch(PDO::FETCH_ASSOC);
                if (!$book || $book['stock'] < $item['quantity']) {
                    throw new Exception("Yetersiz stok: " . ($book['title'] ?? 'Bilinmeyen Kitap'));
                }
                $total += $item['price'] * $item['quantity'];
            }
            $stmt = $this->conn->prepare("INSERT INTO " . $this->table_name . " (user_id, total_price, address, status, created_at, updated_at) VALUES (:user_id, :total_price, :address, 'pending', NOW(), NOW())");
            $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindParam(':total_price', $total);
            $stmt->bindParam(':address', $address);
            $stmt->execute();
            $order_id = $this->conn->lastInsertId();
            // insert order items and deduct stock
            $itemStmt = $this->conn->prepare("INSERT INTO order_items (order_id, book_id, quantity, price, created_at) VALUES (:order_id, :book_id, :quantity, :price, NOW())");
            $updateStockStmt = $this->conn->prepare("UPDATE books SET stock = stock - :quantity WHERE id = :book_id");

            foreach ($items as $item) {
                $itemStmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
                $itemStmt->bindParam(':book_id', $item['book_id'], PDO::PARAM_INT);
                $itemStmt->bindParam(':quantity', $item['quantity'], PDO::PARAM_INT);
                $itemStmt->bindParam(':price', $item['price']);
                $itemStmt->execute();

                $updateStockStmt->bindParam(':quantity', $item['quantity'], PDO::PARAM_INT);
                $updateStockStmt->bindParam(':book_id', $item['book_id'], PDO::PARAM_INT);
                $updateStockStmt->execute();
            }
            // clear cart
            $clear = $this->conn->prepare("DELETE FROM cart_items WHERE user_id = :user_id");
            $clear->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $clear->execute();
            $this->conn->commit();
            return $order_id;
        } catch (Exception $e) {





    // Get orders for a user; if admin, return all
    public function getOrders($user_id = null, $params = []) {
        $query = "SELECT o.*, u.name as user_name FROM " . $this->table_name . " o
                  LEFT JOIN users u ON o.user_id = u.id
                  WHERE 1=1";
        
        $bindings = [];
        if ($user_id) {
            $query .= " AND o.user_id = :user_id";
            $bindings[':user_id'] = $user_id;
        }

        if (!empty($params['search'])) {
            $query .= " AND (o.id LIKE :search OR u.name LIKE :search OR o.address LIKE :search)";
            $bindings[':search'] = "%" . $params['search'] . "%";
        }

        if (!empty($params['status']) && $params['status'] !== 'all') {
            $query .= " AND o.status = :status";
            $bindings[':status'] = $params['status'];
        }

        // Count total
        $countQuery = preg_replace('/SELECT .*? FROM/', 'SELECT COUNT(*) as total FROM', $query);
        $countStmt = $this->conn->prepare($countQuery);
        $countStmt->execute($bindings);
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Sort
        $sort = $params['sort'] ?? 'date-desc';
        if ($sort === 'date-desc') {
            $query .= " ORDER BY o.created_at DESC";
        } elseif ($sort === 'date-asc') {
            $query .= " ORDER BY o.created_at ASC";
        } elseif ($sort === 'price-desc') {
            $query .= " ORDER BY o.to























        }

        return ['data' => $orders, 'total' => (int)$total, 'page' => $page, 'limit' => $limit];
    }

    // Get order details by id
    public function getById($id) {
        $stmt = $this->conn->prepare("SELECT * FROM " . $this->table_name . " WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($order) {
            $itemsStmt = $this->conn->prepare("SELECT oi.*, b.title, (SELECT image_path FROM book_images WHERE book_id = b.id ORDER BY id ASC LIMIT 1) as primary_image FROM order_items oi JOIN books b ON oi.book_id = b.id WHERE oi.order_id = :order_id");
            $itemsStmt->bindParam(':order_id', $id, PDO::PARAM_INT);
            $itemsStmt->execute();
            $order['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return $order;
    }

    // Update order status and optionally cancellation reason
    public function updateStatus($id, $status, $reason = null) {
        if ($status === 'cancelled') {
            $stmt = $this->conn->prepare("UPDATE " . $this->table_name . " SET status = :status, cancellation_reason = :reason, updated_at = NOW() WHERE id = :id");
            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':reason', $reason);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            return $stmt->execute();
        } else {
            $stmt = $this->conn->prepare("UPDATE " . $this->table_name . " SET status = :status, updated_at = NOW() WHERE id = :id");
            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            return $stmt->execute();
        }
    }
}
?>
