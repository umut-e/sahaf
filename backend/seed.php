<?php
require_once __DIR__ . '/config/db.php';
$db = (new Database())->getConnection();

$categories = [
    [1, 'Roman'],
    [2, 'Bilim'],
    [3, 'Tarih'],
    [4, 'Edebiyat'],
    [5, 'Çocuk']
];

foreach ($categories as $cat) {
    $stmt = $db->prepare("INSERT IGNORE INTO categories (id, name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())");
    $stmt->execute([$cat[0], $cat[1]]);
}

echo "Categories seeded successfully.\n";
