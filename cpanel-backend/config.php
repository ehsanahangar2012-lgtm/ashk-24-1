<?php
/**
 * پیکربندی اصلی بک‌اند سی‌پنل - اشک ۲۴
 * Ashk 24 Enterprise AI Marketing Automation System
 */

date_default_timezone_set('Asia/Tehran');

ini_set('display_errors', '0');
error_reporting(E_ALL);

/**
 * CORS + JSON
 */
function sendCorsHeaders() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';

    header("Access-Control-Allow-Origin: {$origin}");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Credentials: true");
    header("Content-Type: application/json; charset=UTF-8");

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }
}

/**
 * Paths
 */
define('DATA_DIR', __DIR__ . '/data');
define('DB_FILE', file_exists(DATA_DIR . '/database.json') ? DATA_DIR . '/database.json' : DATA_DIR . '/db.json');
define('UPLOADS_DIR', __DIR__ . '/uploads');

/**
 * Application
 */
define('SITE_URL', 'https://secret.ashkghalam.ir');
define('APP_NAME', 'سامانه هوش مصنوعی اشک ۲۴');
define('APP_VERSION', '5.9.4');

/**
 * Security Secrets
 * مقادیر امنیتی مستقیماً از متغیرهای محیطی یا مخزن ایزوله سرور خوانده می‌شوند.
 * هیچ سکرت استاتیک یا هاردکدشده‌ای در سورس‌کد پروداکشن وجود ندارد.
 */
function resolveBackendSecret(string $envKey, string $fileKey): string {
    $envVal = getenv($envKey);
    if (!empty($envVal)) {
        return (string)$envVal;
    }
    
    $secretsFile = DATA_DIR . '/.server_secrets.php';
    $stored = [];
    if (file_exists($secretsFile)) {
        $stored = (include $secretsFile) ?: [];
    }
    
    if (!empty($stored[$fileKey])) {
        return (string)$stored[$fileKey];
    }
    
    // تولید امن توکن تصادفی در اولین راه‌اندازی و ذخیره در فایل حفاظت‌شده
    $generated = bin2hex(random_bytes(24));
    $stored[$fileKey] = $generated;
    
    @file_put_contents(
        $secretsFile,
        "<?php\n// فایل امنیتی پیکربندی داخلی اشک ۲۴ - دسترسی وب مسدود است\nreturn " . var_export($stored, true) . ";\n",
        LOCK_EX
    );
    @chmod($secretsFile, 0600);
    
    return $generated;
}

define('CPANEL_AGENT_TOKEN', resolveBackendSecret('CPANEL_AGENT_TOKEN', 'agent_token'));
define('CRON_SECRET_KEY', resolveBackendSecret('CRON_SECRET_KEY', 'cron_secret'));
define('SMS_GATEWAY_SECRET', resolveBackendSecret('SMS_GATEWAY_SECRET', 'sms_gateway_secret'));
define('SESSION_SECRET', resolveBackendSecret('SESSION_SECRET', 'session_secret'));


/**
 * Database
 *
 * در صورت خالی بودن DB_NAME، سیستم از JSON داخلی استفاده می‌کند.
 */
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: '');
define('DB_USER', getenv('DB_USER') ?: '');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_PORT', getenv('DB_PORT') ?: '3306');

/**
 * Proxy
 */
define(
    'DOMESTIC_PROXY_ENABLED',
    filter_var(getenv('DOMESTIC_PROXY_ENABLED') ?: 'true', FILTER_VALIDATE_BOOLEAN)
);

define(
    'DEFAULT_UPSTREAM_PROXY',
    getenv('DEFAULT_UPSTREAM_PROXY') ?: ''
);

/**
 * Ensure required directories exist
 */
if (!is_dir(DATA_DIR)) {
    @mkdir(DATA_DIR, 0775, true);
}

if (!is_dir(UPLOADS_DIR)) {
    @mkdir(UPLOADS_DIR, 0775, true);
}