<?php
require_once __DIR__ . '/../models/Notification.php';

/**
 * NotificationController allows users to fetch their notifications and mark
 * them as read. Admins could create notifications through other parts of
 * the system (not implemented here). Notifications are returned in
 * descending order of creation.
 */
class NotificationController {
    private $db;
    public function __construct($db) {
        $this->db = $db;
    }

    // Get notifications for current user
    public function list() {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $notifModel = new Notification($this->db);
        $notifications = $notifModel->getByUser($userId);
        http_response_code(200);
        echo json_encode($notifications);
    }

    // Mark a notification as read
    public function markRead($id) {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $notifModel = new Notification($this->db);
        if ($notifModel->markRead($id)) {
            http_response_code(200);
            echo json_encode(['message' => 'Notification marked as read']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to mark notification']);
        }
    }
}
?>