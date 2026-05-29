# Sahaf — İkinci El Kitap Satış Platformu

Modern, sıcak temalı bir sahaf (ikinci el kitap) e-ticaret arayüzü. Üniversite
ödevi kapsamında geliştirilmiş bir simülasyondur (gerçek ödeme/kargo yoktur).

## 🚀 Canlı Önizleme
[https://umutefe.duckdns.org](https://umutefe.duckdns.org)

## ✨ Özellikler

**Mağaza**
- Kitap kataloğu: arama (debounce), kategori çipleri, durum filtresi, sıralama, sayfalama (URL ile senkron)
- Kitap detayı: çoklu görsel galerisi + lightbox, yıldız puan ortalaması, durum & stok bilgisi
- Değerlendirmeler: yıldızlı puan, yorum, anonim seçeneği, yorum beğenisi (yalnızca satın alanlar yorum yapabilir)
- Sepet & favoriler: misafirken `localStorage`, giriş yapınca sunucuya senkron
- Sipariş: stok kontrollü sipariş oluşturma, sipariş detay sayfası, kullanıcı iptali (stok iadesiyle)
- Bildirimler: header'da çan + okunmamış sayacı (sipariş güncellemelerinde)
- Profil: ad, telefon, il/ilçe/adres ve profil fotoğrafı
- Açık/koyu tema, toast bildirimleri, yükleniyor iskeletleri, boş durum ekranları, responsive tasarım

**Yönetim Paneli** (`/admin`)
- Dashboard: ciro, sayımlar, sipariş durumu dağılımı (CSS grafik), düşük stok, son siparişler, en çok satanlar
- Kitap CRUD (çoklu görsel yükleme), kategori CRUD, sipariş durumu yönetimi, kullanıcı arama/filtre/silme

## 🛠️ Teknolojiler
- **Frontend:** HTML5, CSS3 (tasarım sistemi + değişkenler), Vanilla JS (ES Modules)
- **Backend:** PHP 8 (framework yok, hafif MVC + front controller)
- **Veritabanı:** MySQL (PDO, hazır ifadeler)
- **Sunucu:** Nginx + PHP-FPM (Linux), HTTPS (Let's Encrypt)

## 📁 Yapı
```
backend/
  index.php            # REST API front controller (router)
  config/db.php        # PDO bağlantısı (env override destekli)
  core/                # Response, Request, Auth, Uploader
  models/              # Book, User, Category, CartItem, Order, Review, Favorite, Notification
  controllers/         # Auth, Book, Category, Cart, Order, Review, Favorite, Notification, User, Stats
  uploads/             # Yüklenen kitap/profil görselleri
  schema.sql  seed.php
frontend/
  *.html  admin/*.html
  assets/css/style.css
  assets/js/           # api.js, store.js, ui.js, main.js, admin.js
```

## ⚙️ Kurulum (sıfırdan)
1. Gereksinimler: PHP 8+, MySQL, (Nginx veya yerel `php -S`).
2. Veritabanı + tablolar: `php install.php` (`backend/schema.sql` dosyasını çalıştırır).
3. Başlangıç verisi: `php backend/seed.php` (kategoriler, demo admin, örnek kitaplar).
   - Demo admin: **admin@sahaf.local / admin123**
4. DB kimlik bilgileri `backend/config/db.php` içinde; ortam değişkenleriyle
   override edilebilir: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`.
5. Yerel çalıştırma: `php -S localhost:8000 router.php` veya Nginx ile:
   - `/` → `frontend/`
   - `/api/(.*)` → `backend/index.php`

## 🔌 API (özet)
`/api` altında JSON. Listeler `{data, total, page, limit, pages}`, hatalar `{error}` döner.
- `POST /register`, `POST /login`
- `GET /books`, `GET /books/{id}`, `POST|PUT|DELETE /books/{id}` (admin)
- `GET|POST /books/{id}/reviews`, `POST|DELETE /reviews/{id}/like`
- `GET /categories`, `POST|PUT|DELETE /categories/{id}` (admin)
- `GET|POST /cart`, `PUT|DELETE /cart/{id}`
- `GET|POST /favorites`, `DELETE /favorites/{bookId}`
- `GET|POST /orders`, `GET /orders/{id}`, `PUT /orders/{id}` (durum/iptal)
- `GET /users` (admin), `GET|PUT|DELETE /users/{id}`
- `GET /notifications`, `PUT /notifications/{id}`
- `GET /stats` (admin)

