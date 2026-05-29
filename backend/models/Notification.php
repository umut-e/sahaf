<?php
/**
 * Notification modeli — kullanıcıya yönelik bildirimler (sipariş güncellemeleri vb.).
 */
class Notification {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getByUser($userId, int $limit = 30): array {
        $stmt = $this->db->prepare(
            "SELECT id, message, is_read, created_at FROM notifications
             WHERE user_id = :uid ORDER BY created_at DESC LIMIT :lim"
        );
        $stmt->bindValue(':uid', $userId);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function unreadCount($userId): int {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = :uid AND is_read = 0");
        $stmt->execute([':uid' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    public function add($userId, string $message): bool {
        $stmt = $this->db->prepare(
            "INSERT INTO notifications (user_id, message, is_read, created_at) VALUES (:uid, :msg, 0, NOW())"
        );
        return $stmt->execute([':uid' => $userId, ':msg' => $message]);
    }

    public function markRead($id, $userId): bool {
        $stmt = $this->db->prepare("UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid");
        return $stmt->execute([':id' => $id, ':uid' => $userId]);
    }

    public function markAllRead($userId): bool {
        return $this->db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = :uid")
                        ->execute([':uid' => $userId]);
    }
}
