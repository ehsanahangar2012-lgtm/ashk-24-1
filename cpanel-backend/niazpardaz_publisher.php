<?php
/**
 * Ashk24 - NiazPardaz Genuine Real-World Publisher Engine
 * Connects directly to https://www.niazpardaz.com/ad/new and /ad/New
 * ZERO MOCK - ZERO FAKE PASS
 */

class NiazPardazRealPublisher {
    
    /**
     * Submits an ad directly to NiazPardaz.com
     * 
     * @param array $campaign Campaign data
     * @param array $job Optional job reference
     * @return array Standardized result with genuine status and evidence
     */
    public static function submitAd($campaign, $job = null) {
        $targetGetUrl = 'https://www.niazpardaz.com/ad/new';
        $targetPostUrl = 'https://www.niazpardaz.com/ad/New';

        // 1. Fetch Session Cookies from NiazPardaz
        $ch = curl_init($targetGetUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Connection: close']);
        $getResponse = curl_exec($ch);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $headers = substr($getResponse, 0, $headerSize);
        $httpGetCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpGetCode !== 200 || empty($getResponse)) {
            return [
                'success' => false,
                'status' => 'failed',
                'progressPercent' => 20,
                'currentStep' => "عدم امکان اتصال به سرور نیازپرداز (HTTP {$httpGetCode})",
                'message' => 'سرور نیازپرداز در دسترس نیست یا پاسخ نامعتبر ارسال کرد.',
                'httpCode' => $httpGetCode,
                'adUrl' => null
            ];
        }

        // Extract session cookies
        preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $headers, $cookieMatches);
        $cookies = implode('; ', $cookieMatches[1] ?? []);

        // 2. Prepare Form Data
        $title = $campaign['title'] ?? ($campaign['productName'] ?? 'تولید انواع کارتن ۳ لایه و ۵ لایه لمینتی و دایکاتی صادراتی');
        $desc = $campaign['content'] ?? ($campaign['description'] ?? 'طراحی و ساخت انواع کارتن های لمینتی ۳ لایه و ۵ لایه صادراتی، دایکاتی و جعبه های مقوایی با چاپ باکیفیت در مشهد، شهرک صنعتی کلات.');
        
        $keywords = 'کارتن سازی, کارتن لمینتی, صادراتی';
        if (isset($campaign['keywords'])) {
            $keywords = is_array($campaign['keywords']) ? implode(', ', $campaign['keywords']) : (string)$campaign['keywords'];
        }

        $contactPhone = $job['contactPhone'] ?? ($campaign['contactPhone'] ?? '09153108763');
        $contactPerson = $job['contactPerson'] ?? ($campaign['contactPerson'] ?? 'احسان آهنگر');
        $contactEmail = $job['contactEmail'] ?? ($campaign['contactEmail'] ?? 'ehsanahangar2012@gmail.com');

        $postFields = [
            'UserAuthType' => 'register',
            'DtlCode' => '0',
            'Title' => $title,
            'CityId' => '1200', // مشهد (خراسان رضوی)
            'Cities' => 'مشهد',
            'PriceType' => '1',
            'Price' => 'توافقی',
            'GroupCode' => '10111', // گروه بسته‌بندی - صنعت
            'KeyWords' => $keywords,
            'Description' => $desc,
            'AcceptAgreement' => 'true',
            'Name' => $contactPerson,
            'Mobile' => $contactPhone,
            'RegisterMobile' => $contactPhone,
            'Email' => $contactEmail,
            'CanSendMessage' => 'true'
        ];

        // 3. POST submission to /ad/New
        $chPost = curl_init($targetPostUrl);
        curl_setopt($chPost, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($chPost, CURLOPT_POST, true);
        curl_setopt($chPost, CURLOPT_POSTFIELDS, http_build_query($postFields));
        curl_setopt($chPost, CURLOPT_TIMEOUT, 25);
        curl_setopt($chPost, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($chPost, CURLOPT_COOKIE, $cookies);
        curl_setopt($chPost, CURLOPT_REFERER, $targetGetUrl);
        curl_setopt($chPost, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        curl_setopt($chPost, CURLOPT_HTTPHEADER, [
            'Content-Type: application/x-www-form-urlencoded',
            'Origin: https://www.niazpardaz.com',
            'Connection: close'
        ]);

        $postResponse = curl_exec($chPost);
        $httpPostCode = curl_getinfo($chPost, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($chPost);
        curl_close($chPost);

        if ($curlErr) {
            return [
                'success' => false,
                'status' => 'failed',
                'progressPercent' => 30,
                'currentStep' => 'خطای ارتباط شبکه با درگاه ارسال آگهی نیازپرداز: ' . $curlErr,
                'message' => 'ارسال داده به نیازپرداز با خطای cURL متوقف شد.',
                'httpCode' => $httpPostCode,
                'adUrl' => null
            ];
        }

        // 4. Parse Real Response
        preg_match('/MessageToShowInForm:\s*[\'"]([^\'"]+)[\'"]/i', $postResponse, $msgMatch);
        $messageType = strtolower($msgMatch[1] ?? 'unknown');

        if ($messageType === 'success' || strpos($messageType, 'success') !== false) {
            // According to NiazPardaz, newly created ads go into moderation:
            // "آگهی با موفقیت ثبت شد و در صف بررسی ناظر قرار گرفت"
            return [
                'success' => true,
                'status' => 'under_review',
                'progressPercent' => 85,
                'currentStep' => 'آگهی با موفقیت در نیازپرداز (NiazPardaz.com) ثبت شد و در صف بررسی ناظر قرار گرفت. (پیگیری: niazpardaz.com/ad/List)',
                'message' => 'اطلاعات آگهی با موفقیت به سرور نیازپرداز ارسال گردید و در صف بررسی ناظر قرار گرفت.',
                'httpCode' => $httpPostCode,
                'messageToShowInForm' => $msgMatch[1] ?? 'Success',
                'trackingUrl' => 'https://www.niazpardaz.com/ad/List',
                'adUrl' => null, // NO FABRICATED URL
                'details' => [
                    'category' => 'بسته بندی (کد 10111)',
                    'city' => 'مشهد (کد 1200)',
                    'mobile' => $contactPhone
                ]
            ];
        }

        // Handle specific NiazPardaz errors
        $errorMessage = "سرور نیازپرداز کد پاسخ «{$messageType}» را بازگرداند.";
        if (strpos($messageType, 'errorusernotactive') !== false) {
            $errorMessage = 'حساب نیازپرداز نیازمند فعال‌سازی یا تایید اولیه است.';
        } elseif (strpos($messageType, 'errorlimitcreatead') !== false) {
            $errorMessage = 'سقف آگهی رایگان در نیازپرداز برای این شماره پر شده است.';
        } elseif (strpos($messageType, 'errorinuseripaddress') !== false) {
            $errorMessage = 'آی‌پی درخواست‌دهنده توسط فایروال نیازپرداز محدود شده است.';
        }

        return [
            'success' => false,
            'status' => 'failed',
            'progressPercent' => 45,
            'currentStep' => $errorMessage,
            'message' => $errorMessage,
            'httpCode' => $httpPostCode,
            'messageToShowInForm' => $messageType,
            'adUrl' => null
        ];
    }
}
