<?php
/**
 * Ashk 24 - Standalone cPanel PHP Direct Publisher & Bridge (v2.0.0)
 * Designed for standard cPanel Shared Hosting without Node.js.
 * 
 * Functions:
 * 1. WordPress direct database / wp_insert_post integration (if placed in WP root or subfolder)
 * 2. Standalone SQLite/JSON file-based post storage
 * 3. SMS Webhook receiver & verification code processor
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Ashk-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuration & Secret Key (Change this in production)
$SECRET_API_KEY = getenv('ASHK24_SECRET_KEY') ?: 'ashk24_secret_key';

// 1. Health check / Ping
if (isset($_GET['ping'])) {
    echo json_encode([
        'success' => true,
        'status' => 'online',
        'message' => 'پل ارتباطی اختصاصی اشک ۲۴ بر روی cPanel آماده به کار است.',
        'timestamp' => date('Y-m-d H:i:s'),
        'php_version' => PHP_VERSION
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. Read Request Payload
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$providedKey = $_SERVER['HTTP_X_ASHK_SECRET'] ?? ($data['apiKey'] ?? ($_GET['key'] ?? ''));

// Validate Authentication
if (!empty($SECRET_API_KEY) && $providedKey !== $SECRET_API_KEY) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'UNAUTHORIZED',
        'message' => 'کلید امنیتی ارسال شده نامعتبر است.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $data['action'] ?? ($_GET['action'] ?? 'publish_post');

if ($action === 'publish_post') {
    $title = trim($data['title'] ?? '');
    $content = trim($data['content'] ?? '');
    $category = trim($data['category'] ?? 'مقالات');
    $imageUrl = trim($data['imageUrl'] ?? '');
    $author = trim($data['author'] ?? 'روابط عمومی اشک قلم');

    if (empty($title) || empty($content)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'عنوان و متن مطلب الزامی است.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $postId = time() . '_' . rand(100, 999);
    $publishedDate = date('Y-m-d H:i:s');

    // Attempt WordPress Integration if wp-load.php exists
    $wpLoaded = false;
    $wpPaths = [
        __DIR__ . '/wp-load.php',
        __DIR__ . '/../wp-load.php',
        dirname(__DIR__) . '/wp-load.php'
    ];

    foreach ($wpPaths as $wpPath) {
        if (file_exists($wpPath)) {
            require_once $wpPath;
            $wpLoaded = true;
            break;
        }
    }

    if ($wpLoaded && function_exists('wp_insert_post')) {
        $postData = [
            'post_title'    => wp_strip_all_tags($title),
            'post_content'  => $content,
            'post_status'   => 'publish',
            'post_author'   => 1,
            'post_type'     => 'post',
        ];
        $newWpId = wp_insert_post($postData);
        if (!is_wp_error($newWpId) && $newWpId > 0) {
            $permalink = get_permalink($newWpId);
            echo json_encode([
                'success' => true,
                'postId' => $newWpId,
                'postUrl' => $permalink,
                'publishedDate' => $publishedDate,
                'engine' => 'WordPress Core Native (wp_insert_post)',
                'message' => 'مطلب با موفقیت در وردپرس منتشر گردید.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // Fallback: Standalone File/JSON Storage on cPanel
    $postsDir = __DIR__ . '/published_posts';
    if (!is_dir($postsDir)) {
        @mkdir($postsDir, 0755, true);
    }

    $postRecord = [
        'id' => $postId,
        'title' => $title,
        'content' => $content,
        'category' => $category,
        'imageUrl' => $imageUrl,
        'author' => $author,
        'publishedDate' => $publishedDate,
        'status' => 'published'
    ];

    $postFile = $postsDir . '/post_' . $postId . '.json';
    file_put_contents($postFile, json_encode($postRecord, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Determine public URL
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $publicUrl = $protocol . $host . '/post_view.php?id=' . $postId;

    echo json_encode([
        'success' => true,
        'postId' => $postId,
        'postUrl' => $publicUrl,
        'publishedDate' => $publishedDate,
        'engine' => 'cPanel Standalone JSON Registry',
        'message' => 'مطلب با موفقیت در سرور cPanel ذخیره و منتشر شد.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode([
    'success' => false,
    'message' => 'اکشن نامعتبر است.'
], JSON_UNESCAPED_UNICODE);
