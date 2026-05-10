<?php
/**
 * CartItem model handles operations on the cart_items table. Users can add
 * books to their cart before placing an order. Each record represents a
 * specific book and quantity for a particular user.
 */
class CartItem {
    private $conn;
    private $table_name = "cart_items";

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get cart items for a user
    public function getByUser($user_id) {
        $query = "SELECT ci.id, ci.book_id, ci.quantity, b.title, b.price FROM " . $this->table_name . " ci JOIN books b ON ci.book_id = b.id WHERE ci.user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Add item to cart (if exists, update quantity)
    public function add($user_id, $book_id, $quantity) {
        // Check if record exists
        $stmt = $this->conn->prepare("SELECT id, quantity FROM " . $this->table_name . " WHERE user_id = :user_id AND book_id = :book_id");
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindParam(':book_id', $book_id, PDO::PARAM_INT);
        $stmt->execute();
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            $newQty = $existing['quantity'] + $quantity;
            $update = $this->conn->prepare("UPDATE " . $this->table_name . " SET quantity = :qty, created_at = NOW() WHERE id = :id");
            $update->bindParam(':qty', $newQty, PDO::PARAM_INT);
            $update->bindParam(':id', $existing['id'], PDO::PARAM_INT);
            return $update->execute();
        } else {
            $insert = $this->conn->prepare("INSERT INTO " . $this->table_name . " (user_id, book_id, quantity, created_at) VALUES (:user_id, :book_id, :quantity, NOW())");
            $insert->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $insert->bindParam(':book_id', $book_id, PDO::PARAM_INT);
            $insert->bindParam(':quantity', $quantity, PDO::PARAM_INT);
            return $insert->execute();
        }
    }

    // Update quantity of a cart item
    public function updateQuantity($id, $quantity) {
        $stmt = $this->conn->prepare("UPDATE " . $this->table_name . " SET quantity = :quantity WHERE id = :id");
        $stmt->bindParam(':quantity', $quantity, PDO::PARAM_INT);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Remove item from cart
    public function delete($id) {
        $stmt = $this->conn->prepare("DELETE FROM " . $this->table_name . " WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
?>