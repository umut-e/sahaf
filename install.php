<?php
/**
 * Simple installer script to create the MySQL database and tables for the Sahaf
 * application automatically. It reads your database credentials from the
 * existing config/db.php file (host, username, password) and executes the
 * SQL statements in backend/schema.sql. Run this file once from your browser
 * (e.g. http://localhost/sahaf-app/install.php) or via the command line with
 * `php install.php` to set up the database. After running, you can remove or
 * secure this file.
 */

// Display output in browser
header('Content-Type: text/plain; charset=utf-8');

// Include DB configuration
require_once __DIR__ . '/backend/config/db.php';

// Create a new PDO connection using host, user and password only (no database yet)
$dbConfig = new Database();
$host = (new ReflectionClass('Database'))->getProperty('host');
$host->setAccessible(true);
$dbHost = $host->getValue($dbConfig);
$userProp = (new ReflectionClass('Database'))->getProperty('username');
$userProp->setAccessible(true);
$dbUser = $userProp->getValue($dbConfig);
$passProp = (new ReflectionClass('Database'))->getProperty('password');
$passProp->setAccessible(true);
$dbPass = $passProp->getValue($dbConfig);
$nameProp = (new ReflectionClass('Database'))->getProperty('db_name');
$nameProp->setAccessible(true);
$dbName = $nameProp->getValue($dbConfig);

try {
    // Connect without selecting a database so we can create it if needed
    $dsn = "mysql:host=$dbHost;charset=utf8";
    $pdo = new PDO($dsn, $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected to MySQL server on $dbHost\n";

    // Read schema file
    $schemaFile = __DIR__ . '/backend/schema.sql';
    if (!file_exists($schemaFile)) {
        throw new Exception("Schema file not found: $schemaFile");
    }
    $sql = file_get_contents($schemaFile);
    if ($sql === false) {
        throw new Exception("Unable to read schema file");
    }
    // Split statements by semicolon followed by a newline or end of file
    $statements = array_filter(array_map('trim', preg_split('/;\s*\n/', $sql)));
    // Execute each statement separately
    foreach ($statements as $statement) {
        if (empty($statement)) continue;
        // Remove any trailing semicolons to avoid errors when executing single statements
        $query = rtrim($statement, ';');
        $pdo->exec($query);
    }
    echo "Database and tables created successfully.\n";
    echo "You can now delete this install.php file for security purposes.";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}

?>