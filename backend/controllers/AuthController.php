<?php
require_once __DIR__ . '/../models/User.php';

/**
 * Kayıt ve giriş. Şifreler bcrypt ile saklanır. Giriş başarılıysa basit bir
 * token (base64 "id:timestamp") ve kullanıcı bilgisi döner.
 */
class AuthController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function register(): void {
        $data = Request::body();
        if (empty($data['email']) || empty($data['password']) || empty($data['name'])) {
            Response::error('E-posta, şifre ve ad zorunludur.', 422);
        }
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            Response::error('Geçersiz e-posta adresi.', 422);
        }
        if (strlen($data['password']) < 6) {
            Response::error('Şifre en az 6 karakter olmalıdır.', 422);
        }

        $userModel = new User($this->db);
        if ($userModel->findByEmail($data['email'])) {
            Response::error('Bu e-posta zaten kayıtlı.', 409);
        }

        $ok = $userModel->create([
            'email'        => $data['email'],
            'phone_number' => $data['phone_number'] ?? null,
            'password'     => password_hash($data['password'], PASSWORD_BCRYPT),
            'name'         => $data['name'],
            'role'         => 'user',
        ]);

        $ok ? Response::created('Kayıt başarılı. Giriş yapabilirsiniz.')
            : Response::error('Kayıt yapılamadı.', 500);
    }

    public function login(): void {
        $data = Request::body();
        if (empty($data['email']) || empty($data['password'])) {
            Response::error('E-posta ve şifre zorunludur.', 422);
        }
        $userModel = new User($this->db);
        $user = $userModel->findByEmail($data['email']);
        if (!$user || !password_verify($data['password'], $user['password'])) {
            Response::error('E-posta veya şifre hatalı.', 401);
        }

        Response::json([
            'token' => base64_encode($user['id'] . ':' . time()),
            'user'  => [
                'id'            => (int) $user['id'],
                'email'         => $user['email'],
                'name'          => $user['name'],
                'role'          => $user['role'],
                'profile_photo' => $user['profile_photo'],
            ],
        ], 200);
    }
}
