<?php
require_once __DIR__ . '/../models/Book.php';
require_once __DIR__ . '/../models/Review.php';

/**
 * Kitap uç noktaları. Listeleme/detay herkese açık; oluştur/güncelle/sil
 * sadece admin. Görseller multipart ile yüklenir (POST veya _method=PUT).
 */
class BookController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function list(): void {
        $model = new Book($this->db);
        $result = $model->list([
            'page'        => Request::int('page', 1),
            'limit'       => Request::int('limit', 12),
            'search'      => Request::query('search'),
            'category_id' => Request::query('category_id'),
            'condition'   => Request::query('condition'),
            'sort'        => Request::query('sort'),
            'in_stock'    => Request::query('in_stock'),
        ]);
        Response::paginated($result['data'], $result['total'], $result['page'], $result['limit']);
    }

    public function get($id): void {
        $model = new Book($this->db);
        $book = $model->find($id);
        if (!$book) {
            Response::error('Kitap bulunamadı.', 404);
        }
        // Yorum yapma hakkı: kitabı satın alıp henüz yorum yapmamış kullanıcı.
        $book['can_review'] = false;
        $userId = Auth::userId();
        if ($userId) {
            $review = new Review($this->db);
            $book['can_review'] = $review->canReview($userId, $id) && !$review->hasReviewed($userId, $id);
        }
        Response::json($book, 200);
    }

    public function create(): void {
        $adminId = Auth::requireAdmin();
        $data = Request::body();
        if (empty($data['title']) || empty($data['author']) || !isset($data['price'])) {
            Response::error('Başlık, yazar ve fiyat zorunludur.', 422);
        }
        $model = new Book($this->db);
        $data['added_by'] = $adminId;
        $bookId = $model->create($data);

        $images = Uploader::handleImages('images');
        $model->saveImages($bookId, $images);

        Response::created('Kitap eklendi.', ['id' => $bookId]);
    }

    public function update($id): void {
        Auth::requireAdmin();
        $model = new Book($this->db);
        if (!$model->find($id)) {
            Response::error('Kitap bulunamadı.', 404);
        }
        $data = Request::body();
        $model->update($id, $data);

        // Tek kapak görseli modeli: yeni görsel yüklendiyse mevcutu değiştir.
        $images = Uploader::handleImages('images');
        if (!empty($images)) {
            $model->deleteImages($id);
            $model->saveImages($id, $images);
        }
        Response::ok('Kitap güncellendi.');
    }

    public function delete($id): void {
        Auth::requireAdmin();
        $model = new Book($this->db);
        if (!$model->find($id)) {
            Response::error('Kitap bulunamadı.', 404);
        }
        $model->softDelete($id);
        Response::ok('Kitap silindi.');
    }

    public function deleteImages($id, $imageId = null): void {
        Auth::requireAdmin();
        $model = new Book($this->db);
        if ($imageId) {
            $model->deleteImage($id, $imageId);
            Response::ok('Görsel kaldırıldı.');
        }
        $model->deleteImages($id);
        Response::ok('Görseller silindi.');
    }
}
