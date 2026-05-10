<?php
/**
 * Notification model stores messages for users, such as order updates or
 * admin notices. Users can retrieve unread notifications and mark them as
 * read. Notifications include a simple is_read boolean.
 */
class Notification {
    private $conn;
    private $table_name = "notifications";

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get notifications for a user
    public function getByUser($user_id) {
        $stmt = $this->conn->prepare("SELECT * FROM " . $this->table_name . " WHERE user_id = :user_id ORDER BY created_at DESC");
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Add a notification
    public function add($user_id, $message) {
        $stmt = $this->conn->prepare("INSERT INTO " . $this->table_name . " (user_id, message, is_read, created_at) VALUES (:user_id, :message, 0, NOW())");
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindParam(':message', $message);
        return $stmt->execute();
    }

    // Mark a notification as read
    public function markRead($id) {
        $stmt = $this->conn->prepare("UPDATE " . $this->table_name . " SET is_read = 1 WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
?>