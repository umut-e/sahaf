<?php
require_once __DIR__ . '/../config/db.php';

/**
 * User model provides CRUD operations for the users table. It includes
 * methods for registering a user, retrieving by email or id and updating
 * user profiles. Passwords should be stored hashed; this class uses
 * password_hash and password_verify.
 */
class User {
    private $conn;
    private $table_name = "users";

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create a new user (registration)
    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . " (email, password, name, profile_photo, role, created_at, updated_at) VALUES (:email, :password, :name, :profile_photo, :role, NOW(), NOW())";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':password', $data['password']);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':profile_photo', $data['profile_photo']);
        $stmt->bindParam(':role', $data['role']);
        return $stmt->execute();
    }

    // Find a user by email
    public function findByEmail($email) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Find a user by id
    public function findById($id) {
        $query = "SELECT id, email, name, profile_photo, role, created_at FROM " . $this->table_name . " WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Update user profile
    public function update($id, $data) {
        $fields = [];
        if (isset($data['name'])) {
            $fields['name'] = $data['name'];
        }
        if (isset($data['profile_photo'])) {
            $fields['profile_photo'] = $data['profile_photo'];
        }
        if (empty($fields)) {
            return false;
        }
        $setClause = [];
        foreach ($fields as $key => $val) {
            $setClause[] = "$key = :$key";
        }
        $query = "UPDATE " . $this->table_name . " SET " . implode(',', $setClause) . ", updated_at = NOW() WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        foreach ($fields as $key => $val) {
            $stmt->bindParam(':' . $key, $fields[$key]);
        }
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }
}
?>