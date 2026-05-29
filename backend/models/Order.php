<?php
/**
 * Order modeli — sipariş oluşturma (transaction + stok kontrolü), listeleme
 * (sayfalama/filtre, kalemlerle birlikte), detay ve durum güncelleme.
 */
class Order {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Sepet kalemlerinden sipariş oluşturur. Stok yetersizse Exception fırlatır.
     * @return int yeni sipariş id'si
     */
    public function create($userId, array $items, ?string $address = null): int {
        $this->db->beginTransaction();
        try {
            $total = 0;
            $stockStmt = $this->db->prepare("SELECT title, stock, price FROM books WHERE id = :id AND is_active = 1 FOR UPDATE");

            foreach ($items as $item) {
                $stockStmt->execute([':id' => $item['book_id']]);
                $book = $stockStmt->fetch();
                if (!$book) {
                    throw new Exception('Kitap bulunamadı.');
                }
                if ($book['stock'] < $item['quantity']) {
                    throw new Exception('Yetersiz stok: ' . $book['title']);
                }
                $total += $book['price'] * $item['quantity'];
            }

            $ins = $this->db->prepare(
                "INSERT INTO orders (user_id, total_price, address, status, created_at, updated_at)
                 VALUES (:uid, :total, :addr, 'pending', NOW(), NOW())"
            );
            $ins->execute([':uid' => $userId, ':total' => $total, ':addr' => $address]);
            $orderId = (int) $this->db->lastInsertId();

            $itemStmt  = $this->db->prepare(
                "INSERT INTO order_items (order_id, book_id, quantity, price, created_at)
                 SELECT :oid, :bid, :q, price, NOW() FROM books WHERE id = :bid2"
            );
            $stockDown = $this->db->prepare("UPDATE books SET stock = stock - :q WHERE id = :bid");

            foreach ($items as $item) {
                $itemStmt->execute([':oid' => $orderId, ':bid' => $item['book_id'], ':q' => $item['quantity'], ':bid2' => $item['book_id']]);
                $stockDown->execute([':q' => $item['quantity'], ':bid' => $item['book_id']]);
            }

            $this->db->prepare("DELETE FROM cart_items WHERE user_id = :uid")->execute([':uid' => $userId]);

            $this->db->commit();
            return $orderId;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /** Sipariş listesi. $userId null ise (admin) tüm siparişler. Her sipariş kalemleriyle döner. */
    public function getOrders($userId, array $params = []): array {
        $where = "WHERE 1=1";
        $bind = [];
        if ($userId !== null) {
            $where .= " AND o.user_id = :uid";
            $bind[':uid'] = $userId;
        }
        if (!empty($params['search'])) {
            $where .= " AND (o.id LIKE :s OR u.name LIKE :s OR u.email LIKE :s)";
            $bind[':s'] = '%' . $params['search'] . '%';
        }
        if (!empty($params['status']) && $params['status'] !== 'all') {
            $where .= " AND o.status = :st";
            $bind[':st'] = $params['status'];
        }

        $sort = $params['sort'] ?? 'date_desc';
        $orderBy = [
            'date_desc'  => 'o.created_at DESC',
            'date_asc'   => 'o.created_at ASC',
            'price_desc' => 'o.total_price DESC',
            'price_asc'  => 'o.total_price ASC',
        ][$sort] ?? 'o.created_at DESC';

        $page  = max(1, (int) ($params['page'] ?? 1));
        $limit = min(100, max(1, (int) ($params['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM orders o LEFT JOIN users u ON o.user_id = u.id $where");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT o.*, u.name AS user_name, u.email AS user_email
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                $where
                ORDER BY $orderBy
                LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        foreach ($bind as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $orders = $stmt->fetchAll();

        $itemStmt = $this->db->prepare(
            "SELECT oi.*, b.title,
                    (SELECT image_path FROM book_images WHERE book_id = b.id ORDER BY id ASC LIMIT 1) AS primary_image
             FROM order_items oi JOIN books b ON oi.book_id = b.id WHERE oi.order_id = :oid"
        );
        foreach ($orders as &$o) {
            $itemStmt->execute([':oid' => $o['id']]);
            $o['items'] = $itemStmt->fetchAll();
        }
        unset($o);

        return ['data' => $orders, 'total' => $total, 'page' => $page, 'limit' => $limit];
    }

    public function getById($id) {
        $stmt = $this->db->prepare(
            "SELECT o.*, u.name AS user_name, u.email AS user_email
             FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $order = $stmt->fetch();
        if (!$order) {
            return null;
        }
        $itemStmt = $this->db->prepare(
            "SELECT oi.*, b.title, b.author,
                    (SELECT image_path FROM book_images WHERE book_id = b.id ORDER BY id ASC LIMIT 1) AS primary_image
             FROM order_items oi JOIN books b ON oi.book_id = b.id WHERE oi.order_id = :oid"
        );
        $itemStmt->execute([':oid' => $id]);
        $order['items'] = $itemStmt->fetchAll();
        return $order;
    }

    public function updateStatus($id, string $status, ?string $reason = null): bool {
        $stmt = $this->db->prepare(
            "UPDATE orders SET status = :st, cancellation_reason = :r, updated_at = NOW() WHERE id = :id"
        );
        return $stmt->execute([':st' => $status, ':r' => ($status === 'cancelled' ? $reason : null), ':id' => $id]);
    }

    /** İptal edilen siparişteki ürünlerin stoğunu geri ekler. */
    public function restock($id): void {
        $stmt = $this->db->prepare(
            "UPDATE books b JOIN order_items oi ON oi.book_id = b.id
             SET b.stock = b.stock + oi.quantity WHERE oi.order_id = :oid"
        );
        $stmt->execute([':oid' => $id]);
    }
}
