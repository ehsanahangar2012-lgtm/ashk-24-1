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
define('DB_FILE', DATA_DIR . '/db.json');
define('UPLOADS_DIR', __DIR__ . '/uploads');

/**
 * Application
 */
define('SITE_URL', 'https://secret.ashkghalam.ir');
define('APP_NAME', 'سامانه هوش مصنوعی اشک ۲۴');
define('APP_VERSION', '4.0.11-e2e-ready');

/**
 * Security Secrets
 *
 * این مقدار باید دقیقاً با CPANEL_AGENT_TOKEN
 * در Local Agent یکسان باشد.
 *
 * در صورت تنظیم Environment Variable همان مقدار استفاده می‌شود.
 */
define(
    'CPANEL_AGENT_TOKEN',
    getenv('CPANEL_AGENT_TOKEN') ?: 'secret_9153108763'
);

define(
    'CRON_SECRET_KEY',
    getenv('CRON_SECRET_KEY') ?: 'ashk24_cron_secret'
);

define(
    'SMS_GATEWAY_SECRET',
    getenv('SMS_GATEWAY_SECRET') ?: 'ashk24_sms_gateway_secret'
);

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