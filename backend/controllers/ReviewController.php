<?php
require_once __DIR__ . '/../models/Review.php';

/**
 * Yorum uç noktaları. Listeleme açık; yorum yapma ve beğeni giriş gerektirir.
 */
class ReviewController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function list($bookId): void {
        $reviews = (new Review($this->db))->getByBook($bookId, Auth::userId());
        // EXISTS/bool alanlarını JSON için normalize et
        foreach ($reviews as &$r) {
            $r['like_count']  = (int) $r['like_count'];
            $r['liked_by_me'] = (bool) $r['liked_by_me'];
            $r['is_anonymous'] = (bool) $r['is_anonymous'];
        }
        unset($r);
        Response::json($reviews, 200);
    }

    public function create($bookId): void {
        $userId = Auth::requireAuth();
        $data = Request::body();
        $rating = (int) ($data['rating'] ?? 0);
        if ($rating < 1 || $rating > 5) {
            Response::error('Puan 1 ile 5 arasında olmalıdır.', 422);
        }
        (new Review($this->db))->upsert(
            $userId,
            $bookId,
            $rating,
            trim($data['comment'] ?? ''),
            !empty($data['is_anonymous'])
        );
        Response::created('Yorumunuz kaydedildi.');
    }

    public function like($reviewId): void {
        $userId = Auth::requireAuth();
        $model = new Review($this->db);
        $model->like($reviewId, $userId);
        Response::json(['message' => 'Beğenildi', 'like_count' => $model->likeCount($reviewId)], 200);
    }

    public function unlike($reviewId): void {
        $userId = Auth::requireAuth();
        $model = new Review($this->db);
        $model->unlike($reviewId, $userId);
        Response::json(['message' => 'Beğeni kaldırıldı', 'like_count' => $model->likeCount($reviewId)], 200);
    }
}
