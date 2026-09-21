# راهنمای اتصال پل اتوماسیون (اندروید به سامانه)

این راهنما نحوه اتصال خودکار دریافت پیامک‌های OTP (کد تایید) از گوشی اندرویدی به سامانه اشک ۲۴ را شرح می‌دهد.

### ۱. مکانیزم انتقال کد
از آنجا که سیستم بر پایه cPanel و وب است، روش پیشنهادی استفاده از اپلیکیشن اندرویدی **SMS Forwarder** (نسخه‌های متن‌باز و امن) برای ارسال خودکار پیامک‌ها به یک وب‌هوک (Webhook) در سامانه شماست.

### ۲. تنظیمات در سامانه (cPanel Backend)
در فایل `/cpanel-backend/api/index.php` یک اندپوینت برای دریافت کد ایجاد می‌کنیم:

```php
// نمونه کد افزودنی در index.php برای دریافت OTP
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $route === 'otp/receive') {
    $data = json_decode(file_get_contents('php://input'), true);
    // ذخیره کد در فایلی که فرانت‌اند می‌خواند
    file_put_contents('data/last_otp.json', json_encode(['code' => $data['code'], 'timestamp' => time()]));
    echo json_encode(['status' => 'success']);
    exit;
}
```

### ۳. تنظیمات اپلیکیشن اندرویدی (SMS Forwarder)
۱. اپلیکیشن **SMS Forwarder** را نصب کنید.
۲. یک Rule جدید بسازید:
   - **Trigger:** پیامک‌های دریافتی از "Divar" یا "Sheypoor".
   - **Action:** ارسال درخواست HTTP POST به نشانی: `https://YOUR_DOMAIN/cpanel-backend/api/index.php?route=otp/receive`
   - **Payload:** فرمت JSON به صورت `{"code": "%sms_content%"}` (بسته به اپلیکیشن، پارامتر محتوا را با Regex استخراج کنید).

### ۴. سمت سامانه (Frontend)
سامانه در بازه‌های زمانی کوتاه (Polling) فایل `last_otp.json` را بررسی کرده و کد را در فرم وارد می‌کند.
