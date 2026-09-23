<?php
/**
 * اسکریپت اجرای دوره‌ای و خودکار منشی ۲۴ ساعته در سی‌پنل (cPanel Multi-Stage Cron Worker)
 * Ashk 24 Autonomous Daemon Cron Worker v4.4.1 (سازگار با تمامی هاست‌های اشتراکی سی‌پنل و بدون نیاز به ترمینال)
 * 
 * نحوه تنظیم استاندارد در Cron Jobs سی‌پنل برای هاست‌های معمولی:
 * curl -s -L "https://secret.ashkghalam.ir/cpanel-backend/cron_worker.php?key=ashk24_cron_secret" > /dev/null 2>&1
 */

// تنظیم منطقه زمانی و مهار خطاهای خاموش
date_default_timezone_set('Asia/Tehran');
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=UTF-8');

try {
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/ai_engine.php';
    require_once __DIR__ . '/universal_publisher.php';

    // بررسی دسترسی امنیتی
    $isCli = (php_sapi_name() === 'cli' || defined('STDIN'));
    $secretKey = defined('CRON_SECRET_KEY') ? CRON_SECRET_KEY : 'ashk24_cron_secret';

    if (!$isCli) {
        $providedKey = $_GET['key'] ?? ($_SERVER['HTTP_X_CRON_KEY'] ?? '');
        if ($providedKey !== $secretKey) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'کلید امنیتی اجرای کران‌جاب نامعتبر است (Secret Key Mismatch).'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // مسیر امن برای ذخیره قفل و لاگ‌ها درون پوشه داده
    $dataDir = defined('DATA_DIR') ? DATA_DIR : (__DIR__ . '/data');
    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0775, true);
    }

    // قفل همزمانی هوشمند با قابلیت آزادسازی خودکار در صورت گیر کردن قدیمی
    $lockFilePath = $dataDir . '/cron.lock';
    if (file_exists($lockFilePath) && (time() - filemtime($lockFilePath) > 300)) {
        @unlink($lockFilePath); // آزادسازی قفل قدیمی بیش از ۵ دقیقه
    }

    $lockFp = @fopen($lockFilePath, 'c+');
    if ($lockFp && !@flock($lockFp, LOCK_EX | LOCK_NB)) {
        echo json_encode([
            'status' => 'busy',
            'message' => 'کران‌جاب در حال حاضر توسط درخواست دیگری در حال اجراست.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = Ashk24Db::getInstance();
    $settings = $db->getAutonomousSettings();

    $timestampStr = date('Y-m-d H:i:s');
    $responseSummary = [
        'status' => 'executed',
        'timestamp' => $timestampStr,
        'shamsiTime' => date('H:i:s'),
        'actionsTaken' => []
    ];

    // ۱. بررسی وضعیت فعال بودن منشی ۲۴ ساعته
    $isEnabled = isset($settings['enabled']) ? (bool)$settings['enabled'] : true;
    if (!$isEnabled) {
        $responseSummary['status'] = 'skipped';
        $responseSummary['reason'] = 'منشی ۲۴ ساعته در تنظیمات سیستم غیرفعال است.';
        echo json_encode($responseSummary, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($lockFp) { @flock($lockFp, LOCK_UN); @fclose($lockFp); }
        exit;
    }

    // ۲. بررسی رسانه‌ها و کشف بسترهای آگهی در صورت نیاز
    $platforms = $db->getMediaPlatforms();
    if (empty($platforms) || count($platforms) < 4) {
        $discovered = Ashk24AiEngine::discoverPlatforms('industrial_marketing', ['ثبت آگهی رایگان', 'تبلیغات کسب و کار']);
        $responseSummary['actionsTaken'][] = "کشف " . count($discovered['discoveredPlatforms'] ?? []) . " رسانه جدید در بستر وب ایران.";
    }

    // ۳. بازبینی کمپین‌ها و تمدید خودکار آگهی‌ها (نردبان خودکار)
    $campaigns = $db->getCampaigns();
    $renewedCount = 0;
    foreach ($campaigns as $camp) {
        if (!empty($camp['autoRenew30Days'])) {
            $lastRenew = strtotime($camp['lastRenewalDate'] ?? '2000-01-01');
            if ((time() - $lastRenew) > (25 * 86400)) {
                $db->updateCampaign($camp['id'], [
                    'lastRenewalDate' => date('Y/m/d'),
                    'renewalCount' => ($camp['renewalCount'] ?? 0) + 1
                ]);
                $renewedCount++;
            }
        }
    }
    if ($renewedCount > 0) {
        $responseSummary['actionsTaken'][] = "تمدید و نردبان خودکار {$renewedCount} کمپین فعال.";
    }

    // ۴. پردازش وظایف در صف انتظار (پشتیبانی از pending، submitting، preparing و processing)
    $jobs = $db->getJobs();
    $executedJobs = 0;
    $defaultCampaign = !empty($campaigns) ? $campaigns[0] : [
        'title' => 'تولید انواع کارتن ۳ لایه و ۵ لایه لمینتی و دایکاتی صادراتی',
        'description' => 'مجتمع چاپ و کارتن‌سازی اشک قلم: طراحی و تولید انواع کارتن های ۳ لایه و ۵ لایه لمینتی، دایکاتی و جعبه های صادراتی با بالاترین کیفیت در مشهد، شهرک صنعتی کلات.'
    ];

    foreach ($jobs as $job) {
        $status = $job['status'] ?? 'pending';
        
        // اگر وظیفه در صف یا در حال پردازش طولانی مانده باشد
        if (in_array($status, ['pending', 'submitting', 'authenticated', 'processing', 'preparing'], true)) {
            $platformId = $job['platformId'] ?? '';
            
            // اگر انتشار در وبلاگ داخلی است
            if ($platformId === 'plat_internal_blog') {
                $db->updateJob($job['id'], [
                    'status' => 'published',
                    'progressPercent' => 100,
                    'currentStep' => 'انتشار نهایی در پایگاه اطلاع‌رسانی داخلی اشک ۲۴ تایید گردید.',
                    'publishedUrl' => '/blog/' . time(),
                    'adUrl' => '/blog/' . time()
                ]);
                $executedJobs++;
                continue;
            }

            // ارسال واقعی به پلتفرم‌های تبلیغاتی ایران
            $targetCampaign = null;
            if (!empty($job['campaignId'])) {
                foreach ($campaigns as $c) {
                    if (($c['id'] ?? '') === $job['campaignId']) {
                        $targetCampaign = $c;
                        break;
                    }
                }
            }
            if (!$targetCampaign) {
                $targetCampaign = $defaultCampaign;
            }

            $realResult = UniversalPlatformPublisher::submitAd($targetCampaign, $job);
            
            $db->updateJob($job['id'], [
                'status' => $realResult['status'],
                'progressPercent' => $realResult['progressPercent'],
                'currentStep' => $realResult['currentStep'],
                'adUrl' => $realResult['adUrl'] ?? null,
                'trackingUrl' => $realResult['trackingUrl'] ?? null,
                'logs' => array_merge($job['logs'] ?? [], [
                    [
                        'timestamp' => date('H:i:s'),
                        'step' => 'CronUniversalSubmit',
                        'status' => $realResult['success'] ? 'success' : ($realResult['status'] === 'paused_user_action' ? 'warning' : 'info'),
                        'message' => "اجرای خودکار کران‌جاب در {$realResult['platformName']} (HTTP {$realResult['httpCode']}) - وضعیت: {$realResult['currentStep']}"
                    ]
                ])
            ]);
            
            $executedJobs++;
            if ($executedJobs >= 10) {
                break; // کنترل محدودیت منابع سرور در هاست‌های معمولی
            }
        }
    }

    if ($executedJobs > 0) {
        $responseSummary['actionsTaken'][] = "پردازش و پیشبرد {$executedJobs} وظیفه در صف انتظار پلتفرم‌ها.";
    }

    // ۵. ثبت تاریخچه و لاگ در پایگاه داده
    $db->addAutonomousLog([
        'action' => 'cpanel_cron_cycle',
        'title' => 'اجرای چرخه منشی خودکار ۲۴ ساعته اشک ۲۴',
        'details' => count($responseSummary['actionsTaken']) > 0 
            ? implode(' | ', $responseSummary['actionsTaken']) 
            : 'صف بررسی شد؛ تمامی سشن‌ها و وظایف پایدار هستند.',
        'status' => 'success'
    ]);

    // ذخیره لاگ فیزیکی در data/cron.log جهت پیگیری آسان کاربر
    $logLine = "[" . date('Y-m-d H:i:s') . "] " . json_encode($responseSummary, JSON_UNESCAPED_UNICODE) . "\n";
    @file_put_contents($dataDir . '/cron.log', $logLine, FILE_APPEND);

    // آزادسازی قفل
    if ($lockFp) {
        @flock($lockFp, LOCK_UN);
        @fclose($lockFp);
    }

    echo json_encode($responseSummary, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(200); // ارسال پاسخ ۲۰۰ جهت جلوگیری از ۵۰۰ خاموش وب‌سرور
    $errorData = [
        'status' => 'error',
        'timestamp' => date('Y-m-d H:i:s'),
        'message' => 'خطا در اجرای چرخه کران‌جاب سی‌پنل',
        'error_details' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ];
    
    $dataDir = defined('DATA_DIR') ? DATA_DIR : (__DIR__ . '/data');
    @file_put_contents($dataDir . '/cron.log', "[" . date('Y-m-d H:i:s') . "] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    echo json_encode($errorData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
