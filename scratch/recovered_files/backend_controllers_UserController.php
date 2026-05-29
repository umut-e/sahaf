<?php
require_once __DIR__ . '/../models/User.php';

/**
 * UserController exposes endpoints for retrieving and updating user
 * information. Normal users can fetch and update their own profile. Admins
 * can list all users and delete them. Role-based access control is
 * recommended as part of API design best practices【236949772141159†L350-L360】.
 */
class UserController {
    private $db;
    public function __construct($db) {
        $this->db = $db;
    }

    // Get current user profile or specific user (admin)
    public function get($id = null) {
        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        $userModel = new User($this->db);
        if ($id) {
            // only admin or the user themselves can access
            if ($role !== 'admin' && $userId != $id) {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                return;
            }
            $user = $userModel->findById($id);
            if ($user) {
                http_response_code(200);
                echo json_encode($user);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
            }
        } else {
            // list all users (admin only)
            if ($role !== 'admin') {
                http_response_code(403);
                echo jso







    }

    // Update user profile (name, photo)
    public function update($id) {
        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
        if ($role !== 'admin' && $userId != $id) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }
        
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents('php://input'), true);
        } else {
            $data = $_POST;
        }
        
        if ($role !== 'admin' && isset($data['role'])) {
            unset($data['role']);
        }
        
        $userModel = new User($this->db);
        if ($userModel->update($id, $data)) {
            http_response_code(200);
            echo json_encode(['message' => 'Profile updated']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to update profile']);
        }
    }

    // Delete a user (admin only)
    public function delete($id) {
        $role = $_SERVER['HTTP_X_USER_ROLE'] ?? 'user';
        if ($role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(['message' => 'User deleted']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to delete user']);
        }
    }
}
?>
