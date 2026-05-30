<?php
require_once __DIR__ . '/../models/Order.php';
require_once __DIR__ . '/../models/CartItem.php';
require_once __DIR__ . '/../models/Notification.php';

/**
 * Sipariş uç noktaları. Kullanıcı kendi siparişlerini görür/oluşturur/iptal eder;
 * admin tüm siparişleri görür ve durumlarını günceller.
 */
class OrderController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function list(): void {
        $userId = Auth::requireAuth();
        $params = [
            'page'   => Request::int('page', 1),
            'limit'  => Request::int('limit', 20),
            'search' => Request::query('search'),
            'status' => Request::query('status'),
            'sort'   => Request::query('sort'),
        ];
        $model = new Order($this->db);
        $result = $model->getOrders(Auth::isAdmin() ? null : $userId, $params);
        Response::paginated($result['data'], $result['total'], $result['page'], $result['limit']);
    }

    public function get($id): void {
        $userId = Auth::requireAuth();
        $order = (new Order($this->db))->getById($id);
        if (!$order) {
            Response::error('Sipariş bulunamadı.', 404);
        }
        if (!Auth::isAdmin() && $order['user_id'] != $userId) {
            Response::error('Bu siparişi görüntüleme yetkiniz yok.', 403);
        }
        Response::json($order, 200);
    }

    public function create(): void {
        $userId = Auth::requireAuth();
        $cart = new CartItem($this->db);
        $items = $cart->getByUser($userId);
        if (empty($items)) {
            Response::error('Sepetiniz boş.', 400);
        }
        $data = Request::body();
        $address = $data['address'] ?? null;

        try {
            $orderId = (new Order($this->db))->create($userId, $items, $address);
            (new Notification($this->db))->add($userId, "Siparişiniz alındı (#$orderId). Teşekkürler!");
            Response::created('Siparişiniz alındı.', ['order_id' => $orderId]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function updateStatus($id): void {
        $userId = Auth::requireAuth();
        $data = Request::body();
        if (empty($data['status'])) {
            Response::error('Durum (status) zorunludur.', 422);
        }
        $status = $data['status'];
        $model = new Order($this->db);
        $order = $model->getById($id);
        if (!$order) {
            Response::error('Sipariş bulunamadı.', 404);
        }

        $allowed = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            Response::error('Geçersiz durum.', 422);
        }

        // Durum zaten aynıysa gereksiz bildirim/işlem yapma.
        if ($status === $order['status']) {
            Response::ok('Sipariş zaten bu durumda.');
        }

        if (!Auth::isAdmin()) {
            // Kullanıcı yalnızca kendi bekleyen siparişini iptal edebilir.
            if ($order['user_id'] != $userId) {
                Response::error('Yetkiniz yok.', 403);
            }
            if ($status !== 'cancelled') {
                Response::error('Yalnızca sipariş iptali yapabilirsiniz.', 403);
            }
            if ($order['status'] !== 'pending') {
                Response::error('Sadece bekleyen siparişler iptal edilebilir.', 400);
            }
        }

        $reason = $data['cancellation_reason'] ?? null;
        $model->updateStatus($id, $status, $reason);

        // İptal edildiyse (ve daha önce iptal değilse) stoğu geri yükle.
        if ($status === 'cancelled' && $order['status'] !== 'cancelled') {
            $model->restock($id);
        }

        // Sipariş sahibine bildirim
        $labels = [
            'pending' => 'beklemede', 'processing' => 'hazırlanıyor', 'shipped' => 'kargolandı',
            'completed' => 'tamamlandı', 'cancelled' => 'iptal edildi',
        ];
        (new Notification($this->db))->add($order['user_id'], "Siparişinizin (#$id) durumu: " . ($labels[$status] ?? $status) . ".");

        Response::ok('Sipariş durumu güncellendi.');
    }
}
