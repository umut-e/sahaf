<?php
/**
 * User modeli — kullanıcı CRUD işlemleri.
 * Şifreler bcrypt ile saklanır (password_hash/password_verify).
 */
class User {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function create(array $data): bool {
        $sql = "INSERT INTO users (email, phone_number, password, name, profile_photo, role, created_at, updated_at)
                VALUES (:email, :phone, :password, :name, :photo, :role, NOW(), NOW())";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':email'    => $data['email'] ?? null,
            ':phone'    => $data['phone_number'] ?? null,
            ':password' => $data['password'],
            ':name'     => $data['name'],
            ':photo'    => $data['profile_photo'] ?? null,
            ':role'     => $data['role'] ?? 'user',
        ]);
    }

    public function lastId(): int {
        return (int) $this->db->lastInsertId();
    }

    /** Giriş için tam satır (şifre dahil) döner. */
    public function findByEmail(string $email) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :e LIMIT 1");
        $stmt->execute([':e' => $email]);
        return $stmt->fetch();
    }

    /** Profil görüntüleme için güvenli alanlar (şifre hariç). */
    public function findById($id) {
        $stmt = $this->db->prepare(
            "SELECT id, email, phone_number, name, profile_photo, role,
                    address, province, district, created_at
             FROM users WHERE id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }

    public function listAll(array $params = []): array {
        $where = "WHERE 1=1";
        $bind = [];
        if (!empty($params['search'])) {
            $where .= " AND (name LIKE :s OR email LIKE :s)";
            $bind[':s'] = '%' . $params['search'] . '%';
        }
        if (!empty($params['role']) && $params['role'] !== 'all') {
            $where .= " AND role = :role";
            $bind[':role'] = $params['role'];
        }

        $sort = $params['sort'] ?? 'newest';
        $order = $sort === 'oldest' ? 'created_at ASC'
               : ($sort === 'name'  ? 'name ASC' : 'created_at DESC');

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM users $where");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT id, email, phone_number, name, profile_photo, role, created_at,
                       (SELECT COUNT(*) FROM orders o WHERE o.user_id = users.id) AS order_count
                FROM users $where ORDER BY $order";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($bind);
        return ['data' => $stmt->fetchAll(), 'total' => $total];
    }

    /** İzinli alanları günceller. Rol sadece admin tarafından değiştirilebilir (controller'da kontrol). */
    public function update($id, array $data): bool {
        $allowed = ['name', 'phone_number', 'profile_photo', 'address', 'province', 'district', 'role'];
        $set = [];
        $bind = [':id' => $id];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) {
                $set[] = "$f = :$f";
                $bind[":$f"] = $data[$f];
            }
        }
        if (empty($set)) {
            return false;
        }
        $sql = "UPDATE users SET " . implode(', ', $set) . ", updated_at = NOW() WHERE id = :id";
        return $this->db->prepare($sql)->execute($bind);
    }

    public function delete($id): bool {
        return $this->db->prepare("DELETE FROM users WHERE id = :id")->execute([':id' => $id]);
    }
}
