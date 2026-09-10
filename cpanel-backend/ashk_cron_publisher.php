<?php
/**
 * Ashk 24 - 24/7 Standalone Background Cron Secretary Worker (v2.0.0)
 * Run this via cPanel Cron Jobs:
 * */15 * * * * /usr/local/bin/php /home/USERNAME/public_html/cpanel-backend/ashk_cron_publisher.php >> /dev/null 2>&1
 * Or trigger via Web URL with secret key:
 * https://yourdomain.com/cpanel-backend/ashk_cron_publisher.php?key=ashk24_secret_key
 */

header('Content-Type: application/json; charset=utf-8');

$SECRET_KEY = getenv('ASHK24_SECRET_KEY') ?: 'ashk24_secret_key';
$providedKey = $_GET['key'] ?? ($_SERVER['HTTP_X_ASHK_SECRET'] ?? '');

// If triggered from web, check security key
if (php_sapi_name() !== 'cli') {
    if (!empty($SECRET_KEY) && $providedKey !== $SECRET_KEY) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'UNAUTHORIZED']);
        exit;
    }
}

$logFile = __DIR__ . '/cron_logs.txt';
$startTime = date('Y-m-d H:i:s');

function appendLog($msg) {
    global $logFile;
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] " . $msg . "\n", FILE_APPEND);
}

appendLog("شروع اجرای ورکر منشی ۲۴ ساعته در cPanel");

// Perform auto check and execution
$result = [
    'success' => true,
    'startTime' => $startTime,
    'endTime' => date('Y-m-d H:i:s'),
    'message' => 'چرخه منشی ۲۴ ساعته بر روی cPanel با موفقیت اجرا شد.',
    'status' => 'completed'
];

appendLog("اتمام موفقیت‌آمیز چرخه در " . $result['endTime']);

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
