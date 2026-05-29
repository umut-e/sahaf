<?php
/**
 * REST API giriş noktası (front controller).
 *
 * nginx `/api/(.*)` -> `/backend/$1` yönlendirmesi yaptığı için buraya gelen
 * yol "api/..." ile başlar. URI ayrıştırılır, [resource, id, sub] elde edilir
 * ve method + resource'a göre ilgili controller'a yönlendirilir.
 *
 * Tüm istek bir try/catch içinde çalışır: artık tek bir hata tüm API'yi
 * düşürmez, hatalar JSON 500 olarak döner.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// CORS aynı kaynak olduğu için gerekmez; sadece OPTIONS'ı kısa devre yap.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Request.php';
require_once __DIR__ . '/core/Auth.php';
require_once __DIR__ . '/core/Uploader.php';

require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/BookController.php';
require_once __DIR__ . '/controllers/CategoryController.php';
require_once __DIR__ . '/controllers/CartController.php';
require_once __DIR__ . '/controllers/OrderController.php';
require_once __DIR__ . '/controllers/ReviewController.php';
require_once __DIR__ . '/controllers/FavoriteController.php';
require_once __DIR__ . '/controllers/NotificationController.php';
require_once __DIR__ . '/controllers/UserController.php';
require_once __DIR__ . '/controllers/StatsController.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    // URI ayrıştırma
    $uri   = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
    $parts = $uri === '' ? [] : explode('/', $uri);

    if (empty($parts) || $parts[0] !== 'api') {
        Response::error('Geçersiz uç nokta.', 404);
    }

    $resource = $parts[1] ?? null;
    $id       = $parts[2] ?? null;
    $sub      = $parts[3] ?? null;

    // HTTP method + form/header tabanlı override (multipart PUT/DELETE için)
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'POST') {
        $override = $_POST['_method'] ?? ($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? null);
        if ($override) {
            $method = strtoupper($override);
        }
    }

    switch ($resource) {

        case 'register':
            $c = new AuthController($db);
            $method === 'POST' ? $c->register() : Response::error('Yöntem desteklenmiyor.', 405);
            break;

        case 'login':
            $c = new AuthController($db);
            $method === 'POST' ? $c->login() : Response::error('Yöntem desteklenmiyor.', 405);
            break;

        case 'books':
            $c = new BookController($db);
            if ($id && $sub === 'reviews') {
                $r = new ReviewController($db);
                if ($method === 'GET')       $r->list($id);
                elseif ($method === 'POST')  $r->create($id);
                else                         Response::error('Yöntem desteklenmiyor.', 405);
            } elseif ($method === 'GET') {
                $id ? $c->get($id) : $c->list();
            } elseif ($method === 'POST') {
                $c->create();
            } elseif ($method === 'PUT') {
                $c->update($id);
            } elseif ($method === 'DELETE') {
                ($sub === 'images') ? $c->deleteImages($id) : $c->delete($id);
            } else {
                Response::error('Yöntem desteklenmiyor.', 405);
            }
            break;

        case 'reviews':
            // /api/reviews/{id}/like  (beğen / beğeniyi kaldır)
            $r = new ReviewController($db);
            if ($sub === 'like' && $id) {
                if ($method === 'POST')        $r->like($id);
                elseif ($method === 'DELETE')  $r->unlike($id);
                else                           Response::error('Yöntem desteklenmiyor.', 405);
            } else {
                Response::error('Geçersiz uç nokta.', 404);
            }
            break;

        case 'categories':
            $c = new CategoryController($db);
            if ($method === 'GET')          $c->list();
            elseif ($method === 'POST')     $c->create();
            elseif ($method === 'PUT')      $c->update($id);
            elseif ($method === 'DELETE')   $c->delete($id);
            else                            Response::error('Yöntem desteklenmiyor.', 405);
            break;

        case 'cart':
            $c = new CartController($db);
            if ($method === 'GET')                  $c->list();
            elseif ($method === 'POST')             $c->add();
            elseif ($method === 'PUT' && $id)       $c->update($id);
            elseif ($method === 'DELETE' && $id)    $c->delete($id);
            else                                    Response::error('Yöntem desteklenmiyor.', 405);
            break;

        case 'favorites':
            $c = new FavoriteController($db);
            if ($method === 'GET')                  $c->list();
            elseif ($method === 'POST')             $c->add();
            elseif ($method === 'DELETE' && $id)    $c->delete($id);
            else                                    Response::error('Yöntem desteklenmiyor.', 405);
            break;

        case 'orders':
            $c = new OrderController($db);
            if ($method === 'GET')                  $id ? $c->get($id) : $c->list();
            elseif ($method === 'POST')             $c->create();
            elseif ($method === 'PUT' && $id)       $c->updateStatus($id);
            else                                    Response::error('Yöntem desteklenmiyor.', 405);
            break;

        case 'users':
            $c = new UserController($db);
            if ($method === 'GET')                  $id ? $c->get($id) : $c->list();
            elseif ($method === 'PUT' && $id)       $c->update($id);
            elseif ($method === 'DELETE' && $id)    $c->delete($id);
            else                                    Response::error('Yöntem desteklenmiyor.', 405);
            break;

        case 'notifications':
            $c = new NotificationController($db);
            if ($method === 'GET')                              $c->list();
            elseif ($method === 'PUT' && $id === 'read-all')    $c->markAllRead();
            elseif ($method === 'PUT' && $id)                   $c->markRead($id);
            else                                                Response::error('Yöntem desteklenmiyor.', 405);
            break;

        case 'stats':
            $c = new StatsController($db);
            $method === 'GET' ? $c->index() : Response::error('Yöntem desteklenmiyor.', 405);
            break;

        default:
            Response::error('Uç nokta bulunamadı.', 404);
    }
} catch (Throwable $e) {
    // Geliştirme kolaylığı için mesajı da döndürüyoruz (ödev). Üretimde gizlenmeli.
    http_response_code(500);
    echo json_encode([
        'error'  => 'Sunucu hatası',
        'detail' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
