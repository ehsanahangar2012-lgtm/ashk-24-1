<?php
/**
 * پیکربندی امنیتی گیت‌وی عیب‌یابی و پایش - اشک ۲۴
 * Ashk 24 Closed-Circuit Diagnostic Gateway Configuration
 */

if (!defined('ASHK24_GATEWAY_CONFIG_LOADED')) {
    define('ASHK24_GATEWAY_CONFIG_LOADED', true);
}

// وضعیت فعال بودن گیت‌وی (قابل کنترل با متغیر و Kill Switch)
if (!defined('GATEWAY_ENABLED')) {
    define('GATEWAY_ENABLED', true);
}

// کلید اختصاصی امضای دیجیتال HMAC-SHA256
if (!defined('GATEWAY_HMAC_SECRET')) {
    $secret = getenv('GATEWAY_HMAC_SECRET');
    if (!$secret && file_exists(__DIR__ . '/.env')) {
        $env = @file_get_contents(__DIR__ . '/.env');
        if (preg_match('/GATEWAY_HMAC_SECRET\s*=\s*(.*)/i', $env, $m)) {
            $secret = trim($m[1], "\"' \r\n");
        }
    }
    define('GATEWAY_HMAC_SECRET', $secret ?: 'ashk24_diagnostic_gateway_secret_2026');
}

// حداکثر دریفت مجاز زمان (ثانیه) جهت خنثی‌سازی Replay Attack
if (!defined('GATEWAY_MAX_TIMESTAMP_DRIFT')) {
    define('GATEWAY_MAX_TIMESTAMP_DRIFT', 60);
}

// مسیر ذخیره‌سازی لاگ‌های حسابرسی
if (!defined('GATEWAY_AUDIT_FILE')) {
    define('GATEWAY_AUDIT_FILE', __DIR__ . '/data/gateway_audit.json');
}

// مسیر ذخیره‌سازی نانس‌های مصرف‌شده جهت جلوگیری از اجرای مجدد (Nonce Replay Protection)
if (!defined('GATEWAY_NONCES_FILE')) {
    define('GATEWAY_NONCES_FILE', __DIR__ . '/data/gateway_nonces.json');
}

// فهرست صلب و سفید مسیرهای مجاز پروژه (Fixed Project Allowlist)
if (!defined('GATEWAY_ALLOWLIST')) {
    $rootDir = dirname(__DIR__);
    define('GATEWAY_ALLOWLIST', [
        'root_htaccess'    => $rootDir . '/.htaccess',
        'backend_htaccess' => __DIR__ . '/.htaccess',
        'index_html'       => $rootDir . '/index.html',
        'sw_js'            => $rootDir . '/sw.js',
        'manifest_json'    => $rootDir . '/manifest.json',
        'config_php'       => __DIR__ . '/config.php',
        'db_php'           => __DIR__ . '/db.php',
        'api_index'        => __DIR__ . '/api/index.php',
        'data_dir'         => __DIR__ . '/data',
        'uploads_dir'      => __DIR__ . '/uploads',
        'root_uploads_dir' => $rootDir . '/uploads'
    ]);
}
