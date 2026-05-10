<?php
// Entry point for the REST API. All requests are routed through this file.
// It parses the URI and HTTP method, then delegates to the appropriate
// controller. Responses are always JSON with appropriate HTTP status codes.

header('Content-Type: application/json');

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/BookController.php';
require_once __DIR__ . '/controllers/UserController.php';
require_once __DIR__ . '/controllers/CartController.php';
require_once __DIR__ . '/controllers/OrderController.php';
require_once __DIR__ . '/controllers/ReviewController.php';
require_once __DIR__ . '/controllers/FavoriteController.php';
require_once __DIR__ . '/controllers/NotificationController.php';

// Set up database connection
$database = new Database();
$db = $database->getConnection();

// Parse the request URI
$uri = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts = explode('/', $uri);

// The API prefix
if (empty($parts) || $parts[0] !== 'api') {
    http_response_code(404);
    echo json_encode(['error' => 'Invalid endpoint']);
    exit;
}

$resource = $parts[1] ?? null;
$id = $parts[2] ?? null;
$sub = $parts[3] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

switch ($resource) {
    case 'register':
        if ($method === 'POST') {
            $controller = new AuthController($db);
            $controller->register();
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
    case 'login':
        if ($method === 'POST') {
            $controller = new AuthController($db);
            $controller->login();
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
    case 'books':
        $controller = new BookController($db);
        if ($method === 'GET') {
            if ($id) {
                // nested path: /books/{id}/reviews
                if ($sub && $sub === 'reviews') {
                    $reviewCtrl = new ReviewController($db);
                    $reviewCtrl->list($id);
                } else {
                    $controller->get($id);
                }
            } else {
                $controller->list();
            }
        } elseif ($method === 'POST') {
            $controller->create();
        } elseif ($method === 'PUT' && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } elseif ($method === 'POST' && $id && $sub === 'reviews') {
            // posting a review: /books/{id}/reviews
            $reviewCtrl = new ReviewController($db);
            $reviewCtrl->create($id);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
    case 'users':
        $controller = new UserController($db);
        if ($method === 'GET') {
            $controller->get($id);
        } elseif (($method === 'PUT' || $method === 'POST') && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
    case 'cart':
        $controller = new CartController($db);
        if ($method === 'GET') {
            $controller->list();
        } elseif ($method === 'POST') {
            $controller->add();
        } elseif ($method === 'PUT' && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
    case 'orders':
        $controller = new OrderController($db);
        if ($method === 'GET') {
            if ($id) {
                $controller->get($id);
            } else {
                $controller->list();
            }
        } elseif ($method === 'POST') {
            $controller->create();
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
    case 'favorites':
        $controller = new FavoriteController($db);
        if ($method === 'GET') {
            $controller->list();
        } elseif ($method === 'POST') {
            $controller->add();
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
    case 'notifications':
        $controller = new NotificationController($db);
        if ($method === 'GET') {
            $controller->list();
        } elseif ($method === 'PUT' && $id) {
            $controller->markRead($id);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}

?>