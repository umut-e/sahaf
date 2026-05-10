<?php
// Database configuration and connection class
// This class encapsulates the PDO connection to the MySQL database. It reads
// configuration parameters like host, database name, username and password.
// If the connection fails, it sends a 500 response with an error message.

class Database {
    private $host = "localhost";
    private $db_name = "sahaf_db";
    private $username = "root";
    private $password = "";
    public $conn;

    /**
     * Returns a PDO connection to the MySQL database. On error it outputs a
     * JSON error message and stops execution. In a production environment you
     * would likely throw the exception or log it instead of echoing it.
     */
    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8",
                $this->username,
                $this->password
            );
            // Use exceptions for error handling
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $exception) {
            http_response_code(500);
            echo json_encode([
                "error" => "Database connection error: " . $exception->getMessage()
            ]);
            exit;
        }
        return $this->conn;
    }
}
?>