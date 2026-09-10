<?php
/**
 * پیکربندی اصلی بک‌اند سی‌پنل - اشک ۲۴ (PHP Standalone Backend)
 * Ashk 24 Enterprise AI Marketing Automation System
 */

// تنظیم منطقه زمانی ایران
date_default_timezone_set('Asia/Tehran');

// گزارش‌دهی خطاهادر حالت توسعه (برای تولید می‌توان display_errors را 0 کرد)
ini_set('display_errors', '0');
error_reporting(E_ALL);

// مدیریت CORS و هدرهای پاسخ JSON
function sendCorsHeaders() {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Credentials: true");
    header("Content-Type: application/json; charset=UTF-8");

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }
}

define('DATA_DIR', __DIR__ . '/data');
define('DB_FILE', DATA_DIR . '/db.json');
define('UPLOADS_DIR', __DIR__ . '/uploads');
define('SITE_URL', 'https://secret.ashkghalam.ir');
define('APP_NAME', 'سامانه هوش مصنوعی اشک ۲۴');
define('APP_VERSION', '4.0.10-cpanel');
define('CRON_SECRET_KEY', 'ashk24_cron_secret');
define('CPANEL_AGENT_TOKEN', getenv('CPANEL_AGENT_TOKEN') ?: 'Ashk24SecureSession');


// پیکربندی اختیاری پایگاه داده MySQL / MariaDB (در صورت خالی بودن DB_NAME، از فایل JSON بدون وقفه استفاده می‌شود)
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: '');
define('DB_USER', getenv('DB_USER') ?: '');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_PORT', getenv('DB_PORT') ?: '3306');


// تنظیمات پروکسی داخلی / فورواردر ضد فیلترینگ
define('DOMESTIC_PROXY_ENABLED', true);
define('DEFAULT_UPSTREAM_PROXY', ''); // در صورت نیاز مثل: 127.0.0.1:1080 یا socks5://...

