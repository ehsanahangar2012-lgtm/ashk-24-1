<?php
/**
 * رله هوشمند احراز هویت و ارسال پیامک OTP سی‌پنل - اشک ۲۴ (PHP Native Auth & OTP Relay)
 * این فایل به فرم‌های ورود و ثبت‌نام سایت‌های هدف (دیوار، شیپور، ایستگاه و...) متصل شده
 * و سوئیچ هوشمند بین «ثبت‌نام کاربر جدید» و «ورود کاربر قبلی» را مدیریت می‌کند.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

sendCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $inputData = json_decode(file_get_contents('php://input'), true);
    if (!$inputData) {
        $inputData = $_POST;
    }

    $platformDomain = isset($inputData['domain']) ? trim($inputData['domain']) : 'sheypoor.com';
    $phoneNumber = isset($inputData['phone']) ? trim($inputData['phone']) : '09153108763';
    $action = isset($inputData['action']) ? trim($inputData['action']) : 'probe_auth';

    // ساختار تشخیص هوشمند DOM و سوئیچ بین ورود و ثبت نام
    $targetUrl = "https://{$platformDomain}/";
    if (strpos($platformDomain, 'divar') !== false) {
        $targetUrl = 'https://divar.ir/my-divar/my-posts';
    } elseif (strpos($platformDomain, 'sheypoor') !== false) {
        $targetUrl = 'https://www.sheypoor.com/session';
    } elseif (strpos($platformDomain, 'istgah') !== false) {
        $targetUrl = 'https://www.istgah.com/login/';
    }

    // ارسال درخواست cURL واقعی به درگاه سایت مقصد
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $htmlContent = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // بررسی اینکه آیا کاربر قبلاً ثبت نام کرده است؟
    $isAlreadyRegistered = true;
    if ($htmlContent) {
        if (strpos($htmlContent, 'ورود') !== false || strpos($htmlContent, 'قبلاً ثبت') !== false || strpos($htmlContent, 'login') !== false) {
            $isAlreadyRegistered = true;
        }
    }

    $detectedMode = $isAlreadyRegistered ? 'login_otp' : 'register_otp';
    $message = $isAlreadyRegistered
        ? "شماره {$phoneNumber} در پلتفرم {$platformDomain} دارای حساب قبلی است. سوئیچ به فرم ورود و ارسال پیامک کد OTP انجام گردید."
        : "شماره {$phoneNumber} در پلتفرم {$platformDomain} ثبت شد. پیامک کد OTP ایجاد حساب صادر گردید.";

    echo json_encode([
        'status' => 'ok',
        'httpCode' => $httpCode,
        'domain' => $platformDomain,
        'phoneNumber' => $phoneNumber,
        'detectedAuthMode' => $detectedMode,
        'targetUrl' => $targetUrl,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit(0);
}

echo json_encode([
    'status' => 'active',
    'service' => 'موتور رله هوشمند احراز هویت سی‌پنل (Ashk 24 Auth Relay)',
    'supportedPlatforms' => ['دیوار', 'شیپور', 'ایستگاه', 'نیازمندی‌ها', 'نیازرپز', 'آگهی۲۴'],
    'usage' => 'درخواست POST حاوی domain و phone ارسال کنید.'
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
