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
        $name = trim($data['name'] ?? '');
        $identifier = trim($data['identifier'] ?? $data['email'] ?? '');
        $password = $data['password'] ?? '';

        if ($name === '' || $identifier === '' || $password === '') {
            Response::error('Ad, e-posta/telefon ve şifre zorunludur.', 422);
        }
        if (strlen($password) < 6) {
            Response::error('Şifre en az 6 karakter olmalıdır.', 422);
        }

        // Girilen değer e-posta mı, telefon mu?
        $email = null;
        $phone = null;
        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            $email = $identifier;
        } else {
            $norm = preg_replace('/[\s\-()]/', '', $identifier);
            if (!preg_match('/^\+?\d{7,15}$/', $norm)) {
                Response::error('Geçerli bir e-posta adresi veya telefon numarası girin.', 422);
            }
            $phone = $norm;
        }

        $userModel = new User($this->db);
        if ($userModel->findByLogin($email ?? $phone)) {
            Response::error('Bu e-posta veya telefon zaten kayıtlı.', 409);
        }

        $ok = $userModel->create([
            'email'        => $email,
            'phone_number' => $phone,
            'password'     => password_hash($password, PASSWORD_BCRYPT),
            'name'         => $name,
            'role'         => 'user',
        ]);

        $ok ? Response::created('Kayıt başarılı. Giriş yapabilirsiniz.')
            : Response::error('Kayıt yapılamadı.', 500);
    }

    public function login(): void {
        $data = Request::body();
        $identifier = trim($data['identifier'] ?? $data['email'] ?? '');
        $password = $data['password'] ?? '';
        if ($identifier === '' || $password === '') {
            Response::error('E-posta/telefon ve şifre zorunludur.', 422);
        }
        $userModel = new User($this->db);
        $user = $userModel->findByLogin($identifier);
        if (!$user || !password_verify($password, $user['password'])) {
            Response::error('E-posta/telefon veya şifre hatalı.', 401);
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
