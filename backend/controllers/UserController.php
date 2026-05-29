<?php
require_once __DIR__ . '/../models/User.php';

/**
 * Kullanıcı uç noktaları. Kullanıcı kendi profilini görür/günceller; admin
 * tüm kullanıcıları listeler ve silebilir. Profil güncelleme multipart olabilir
 * (profil fotoğrafı yüklemesi için).
 */
class UserController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function list(): void {
        Auth::requireAdmin();
        $result = (new User($this->db))->listAll([
            'search' => Request::query('search'),
            'role'   => Request::query('role'),
            'sort'   => Request::query('sort'),
        ]);
        Response::json(['data' => $result['data'], 'total' => $result['total']], 200);
    }

    public function get($id): void {
        $userId = Auth::requireAuth();
        if (!Auth::isAdmin() && $userId != $id) {
            Response::error('Yetkiniz yok.', 403);
        }
        $user = (new User($this->db))->findById($id);
        $user ? Response::json($user, 200) : Response::error('Kullanıcı bulunamadı.', 404);
    }

    public function update($id): void {
        $userId = Auth::requireAuth();
        if (!Auth::isAdmin() && $userId != $id) {
            Response::error('Yetkiniz yok.', 403);
        }
        $data = Request::body();

        // Rol yalnızca admin tarafından değiştirilebilir.
        if (!Auth::isAdmin()) {
            unset($data['role']);
        }

        // Şifre güncelleme: boşsa dokunma, doluysa doğrula ve hash'le.
        if (array_key_exists('password', $data)) {
            if ($data['password'] === '' || $data['password'] === null) {
                unset($data['password']);
            } elseif (strlen($data['password']) < 6) {
                Response::error('Şifre en az 6 karakter olmalıdır.', 422);
            } else {
                $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
            }
        }

        // Profil fotoğrafı yüklendiyse
        $photos = Uploader::handleImages('profile_photo', 'user_');
        if (!empty($photos)) {
            $data['profile_photo'] = $photos[0];
        }

        $model = new User($this->db);
        $model->update($id, $data);
        Response::json(['message' => 'Profil güncellendi.', 'user' => $model->findById($id)], 200);
    }

    public function delete($id): void {
        Auth::requireAdmin();
        (new User($this->db))->delete($id);
        Response::ok('Kullanıcı silindi.');
    }
}
