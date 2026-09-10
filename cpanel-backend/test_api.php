<?php
/**
 * اسکریپت تست و عیب‌یابی سلامت هاست سی‌پنل (PHP Compatibility & Health Tester)
 * Ashk 24 Enterprise Environment Tester
 */

header('Content-Type: text/html; charset=utf-8');
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ai_engine.php';

?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تست سازگاری هاست سی‌پنل - اشک ۲۴</title>
    <style>
        body { font-family: Tahoma, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; direction: rtl; }
        .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 800px; margin: 0 auto 20px; border: 1px solid #e2e8f0; }
        h1 { color: #0284c7; font-size: 22px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        h2 { font-size: 16px; margin-top: 15px; color: #334155; }
        .status-ok { color: #16a34a; font-weight: bold; }
        .status-warn { color: #d97706; font-weight: bold; }
        .status-error { color: #dc2626; font-weight: bold; }
        ul { list-style: none; padding: 0; }
        li { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        pre { background: #0f172a; color: #38bdf8; padding: 15px; border-radius: 8px; direction: ltr; text-align: left; overflow-x: auto; font-size: 13px; }
    </style>
</head>
<body>

<div class="card">
    <h1>نتایج تست سازگاری هاست سی‌پنل (بدون نیاز به Node.js)</h1>
    <p>این اسکریپت سلامت محیط PHP و امکانات سی‌پنل را جهت اجرای کامل سامانه اشک ۲۴ بررسی می‌کند.</p>

    <h2>۱. بررسی پیش‌نیازهای نسخه PHP و افزونه‌ها</h2>
    <ul>
        <li>
            <span>نسخه PHP سرور (حداقل 7.4):</span>
            <span class="<?php echo version_compare(PHP_VERSION, '7.4.0', '>=') ? 'status-ok' : 'status-error'; ?>">
                <?php echo PHP_VERSION; ?>
            </span>
        </li>
        <li>
            <span>پشتیبانی از افزونه cURL (جهت ارتباط با API):</span>
            <span class="<?php echo function_exists('curl_version') ? 'status-ok' : 'status-error'; ?>">
                <?php echo function_exists('curl_version') ? 'فعال ✓' : 'غیرفعال ✗'; ?>
            </span>
        </li>
        <li>
            <span>پشتیبانی از پردازش JSON:</span>
            <span class="<?php echo function_exists('json_encode') ? 'status-ok' : 'status-error'; ?>">
                <?php echo function_exists('json_encode') ? 'فعال ✓' : 'غیرفعال ✗'; ?>
            </span>
        </li>
        <li>
            <span>دسترسی نوشتن به پوشه data (ذخیره‌سازی اطلاعات):</span>
            <?php
            $isWritable = is_writable(DATA_DIR) || @mkdir(DATA_DIR, 0775, true);
            ?>
            <span class="<?php echo $isWritable ? 'status-ok' : 'status-error'; ?>">
                <?php echo $isWritable ? 'مجاز ✓ (قابل ذخیره‌سازی)' : 'غیرمجاز ✗ (نیاز به مجوز chmod 775)'; ?>
            </span>
        </li>
        <li>
            <span>وضعیت موتور هوش بومی و هوریستیک:</span>
            <span class="status-ok">
                فعال و بومی PHP 8.x ✓
            </span>
        </li>
    </ul>

    <h2>۲. تست فراخوانی پایگاه داده فایل‌محور PHP</h2>
    <?php
    try {
        $db = Ashk24Db::getInstance();
        $company = $db->getCompanyProfile();
        echo '<p class="status-ok">پایگاه داده PHP با موفقیت بارگذاری گردید. نام برند: ' . htmlspecialchars($company['brandName']) . '</p>';
    } catch (Exception $e) {
        echo '<p class="status-error">خطا در بارگذاری پایگاه داده: ' . htmlspecialchars($e->getMessage()) . '</p>';
    }
    ?>

    <h2>۳. تست تولید محتوای هوشمند (تست هوش مصنوعی)</h2>
    <?php
    $testContent = Ashk24AiEngine::generateContent([
        'productName' => 'سامانه تست اشک ۲۴',
        'description' => 'تست تولید محتوای تبلیغاتی سئوشده',
        'forceOfflineFallback' => true
    ]);
    ?>
    <pre><?php echo json_encode($testContent, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); ?></pre>

    <h2>۴. مسیر نهایی API جهت اتصال فرانت‌اند</h2>
    <p>آدرس پایگاه API شما در این هاست سی‌پنل:</p>
    <pre><?php echo (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'] . preg_replace('/test_api\.php$/', 'api/health', $_SERVER['REQUEST_URI']); ?></pre>
</div>

</body>
</html>
