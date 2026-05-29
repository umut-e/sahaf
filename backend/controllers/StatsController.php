<?php
/**
 * Admin dashboard istatistikleri. Sayılar, ciro, durum dağılımı, düşük stok
 * ve son siparişleri tek çağrıda döner.
 */
class StatsController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function index(): void {
        Auth::requireAdmin();
        $db = $this->db;

        $scalar = fn(string $sql): int => (int) $db->query($sql)->fetchColumn();

        $totals = [
            'books'      => $scalar("SELECT COUNT(*) FROM books WHERE is_active = 1"),
            'users'      => $scalar("SELECT COUNT(*) FROM users"),
            'orders'     => $scalar("SELECT COUNT(*) FROM orders"),
            'categories' => $scalar("SELECT COUNT(*) FROM categories"),
            'reviews'    => $scalar("SELECT COUNT(*) FROM reviews"),
        ];

        $revenue = (float) $db->query(
            "SELECT COALESCE(SUM(total_price),0) FROM orders WHERE status != 'cancelled'"
        )->fetchColumn();

        // Sipariş durumu dağılımı
        $statusRows = $db->query("SELECT status, COUNT(*) AS c FROM orders GROUP BY status")->fetchAll();
        $byStatus = [];
        foreach ($statusRows as $r) {
            $byStatus[$r['status']] = (int) $r['c'];
        }

        // Düşük stok (stok <= 3, aktif)
        $lowStock = $db->query(
            "SELECT id, title, author, stock FROM books WHERE is_active = 1 AND stock <= 3 ORDER BY stock ASC LIMIT 8"
        )->fetchAll();

        // Son siparişler
        $recent = $db->query(
            "SELECT o.id, o.total_price, o.status, o.created_at, u.name AS user_name
             FROM orders o LEFT JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC LIMIT 6"
        )->fetchAll();

        // En çok satan kitaplar
        $topBooks = $db->query(
            "SELECT b.title, b.author, SUM(oi.quantity) AS sold
             FROM order_items oi JOIN books b ON oi.book_id = b.id
             GROUP BY oi.book_id ORDER BY sold DESC LIMIT 5"
        )->fetchAll();

        Response::json([
            'totals'    => $totals,
            'revenue'   => $revenue,
            'by_status' => $byStatus,
            'low_stock' => $lowStock,
            'recent'    => $recent,
            'top_books' => $topBooks,
        ], 200);
    }
}
