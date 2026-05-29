<?php
require_once __DIR__ . '/../models/Notification.php';

/**
 * Bildirim uç noktaları. Giriş gerektirir. Liste yanıtı okunmamış sayacını da
 * içerir (header'daki çan rozeti için).
 */
class NotificationController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function list(): void {
        $userId = Auth::requireAuth();
        $model = new Notification($this->db);
        $items = $model->getByUser($userId);
        foreach ($items as &$n) {
            $n['is_read'] = (bool) $n['is_read'];
        }
        unset($n);
        Response::json(['data' => $items, 'unread' => $model->unreadCount($userId)], 200);
    }

    public function markRead($id): void {
        $userId = Auth::requireAuth();
        (new Notification($this->db))->markRead($id, $userId);
        Response::ok('Okundu olarak işaretlendi.');
    }

    public function markAllRead(): void {
        $userId = Auth::requireAuth();
        (new Notification($this->db))->markAllRead($userId);
        Response::ok('Tüm bildirimler okundu.');
    }
}
