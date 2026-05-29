<?php
/**
 * Veritabanı bağlantısı (MySQL / PDO).
 *
 * Kimlik bilgileri ortam değişkenleriyle (env) override edilebilir; aksi halde
 * yerel geliştirme için varsayılanlar kullanılır. Bağlantı PDO exception modunda
 * açılır ve hata olursa 500 JSON döner.
 *
 */
class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        $this->host     = getenv('DB_HOST') ?: 'localhost';
        $this->db_name  = getenv('DB_NAME') ?: 'sahaf_db';
        $this->username = getenv('DB_USER') ?: 'root';
        $this->password = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
    }

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host={$this->host};dbname={$this->db_name};charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    // Aynı isimli placeholder'ın birden çok kez kullanılabilmesi için
                    // (ör. arama: title LIKE :s OR author LIKE :s) emülasyon açık.
                    PDO::ATTR_EMULATE_PREPARES   => true,
                ]
            );
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Veritabanı bağlantı hatası'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        return $this->conn;
    }
}
