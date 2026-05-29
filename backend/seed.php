<?php
/**
 * Başlangıç verisi. Taze bir kurulumda `php seed.php` ile çalıştırın.
 * Idempotent: kategoriler INSERT IGNORE ile, demo admin ve örnek kitaplar
 * yalnızca yoksa eklenir. Mevcut (dolu) bir veritabanına zarar vermez.
 */
require_once __DIR__ . '/config/db.php';
$db = (new Database())->getConnection();

/* ---------- kategoriler ---------- */
$categories = ['Roman', 'Bilim', 'Tarih', 'Edebiyat', 'Çocuk', 'Bilim Kurgu', 'Felsefe', 'Kişisel Gelişim'];
$catStmt = $db->prepare("INSERT IGNORE INTO categories (name, created_at, updated_at) VALUES (?, NOW(), NOW())");
foreach ($categories as $name) {
    $catStmt->execute([$name]);
}
echo count($categories) . " kategori hazır.\n";

/* ---------- demo admin ---------- */
$adminEmail = 'admin@sahaf.local';
$exists = $db->prepare("SELECT id FROM users WHERE email = ?");
$exists->execute([$adminEmail]);
if (!$exists->fetch()) {
    $db->prepare("INSERT INTO users (email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, 'admin', NOW(), NOW())")
       ->execute([$adminEmail, password_hash('admin123', PASSWORD_BCRYPT), 'Demo Admin']);
    echo "Demo admin oluşturuldu: $adminEmail / admin123\n";
} else {
    echo "Admin zaten mevcut, atlandı.\n";
}

/* ---------- örnek kitaplar (yalnızca tablo boşsa) ---------- */
$count = (int) $db->query("SELECT COUNT(*) FROM books")->fetchColumn();
if ($count === 0) {
    $catId = [];
    foreach ($db->query("SELECT id, name FROM categories")->fetchAll() as $c) {
        $catId[$c['name']] = $c['id'];
    }
    $books = [
        ['Suç ve Ceza', 'Fyodor Dostoyevski', 150.00, 'Roman', 'good', 5, 'Dünya edebiyatının başyapıtlarından.'],
        ['1984', 'George Orwell', 120.00, 'Roman', 'new', 10, 'Distopik kurgunun klasiği.'],
        ['Sapiens', 'Yuval Noah Harari', 200.00, 'Tarih', 'good', 8, 'İnsanlığın kısa tarihi.'],
        ['Dune', 'Frank Herbert', 180.00, 'Bilim Kurgu', 'good', 6, 'Çöl gezegeni Arrakis destanı.'],
        ['Böyle Söyledi Zerdüşt', 'Friedrich Nietzsche', 110.00, 'Felsefe', 'fair', 4, 'Felsefi bir başyapıt.'],
        ['Atomik Alışkanlıklar', 'James Clear', 140.00, 'Kişisel Gelişim', 'new', 15, 'Küçük değişimlerle büyük sonuçlar.'],
    ];
    $ins = $db->prepare("INSERT INTO books (category_id, title, author, price, description, `condition`, stock, is_active, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())");
    foreach ($books as $b) {
        $ins->execute([$catId[$b[3]] ?? null, $b[0], $b[1], $b[2], $b[6], $b[4], $b[5]]);
    }
    echo count($books) . " örnek kitap eklendi.\n";
} else {
    echo "Kitaplar zaten mevcut ($count), örnek kitap eklenmedi.\n";
}

echo "Seed tamamlandı.\n";
