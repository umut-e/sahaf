<?php
require_once __DIR__ . '/../models/User.php';

/**
 * AuthController handles user registration and login. It uses the User model
 * to interact with the database. Passwords are hashed using password_hash.
 * On successful login the controller returns a simple token (for demo
 * purposes). In a production system you should implement JWT or similar
 * standards as recommended for API security【236949772141159†L289-L360】.
 */
class AuthController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Handle user registration
    public function register() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['email'], $data['password'], $data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'email, password and name are required']);
            return;
        }
        $userModel = new User($this->db);
        if ($userModel->findByEmail($data['email'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already registered']);
            return;
        }
        $hashed = password_hash($data['password'], PASSWORD_BCRYPT);
        $userData = [
            'email' => $data['email'],
            'password' => $hashed,
            'name' => $data['name'],
            'profile_photo' => '',
            'role' => 'user'
        ];
        if ($userModel->create($userData)) {
            http_response_code(201);
            echo json_encode(['message' => 'User registered successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Unable to register user']);
        }
    }

    // Handle user login and return a simple token
    public function login() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['email'], $data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'email and password are required']);
            return;
        }
        $userModel = new User($this->db);
        $user = $userModel->findByEmail($data['email']);
        if ($user && password_verify($data['password'], $user['password'])) {
            // generate a dummy token: base64 encoded id:timestamp. In production
            // use JWT tokens with proper secret and claims【236949772141159†L289-L360】.
            $token = base64_encode($user['id'] . ':' . time());
            http_response_code(200);
            echo json_encode([
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'name' => $user['name'],
                    'role' => $user['role'],
                    'profile_photo' => $user['profile_photo']
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid email or password']);
        }
    }
}
?>