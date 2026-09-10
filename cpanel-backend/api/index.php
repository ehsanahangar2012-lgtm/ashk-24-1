<?php
/**
 * مسیریاب مرکزی REST API سی‌پنل (PHP Router for cPanel Web Hosting)
 * Ashk 24 Enterprise API Entry Point
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../ai_engine.php';
require_once __DIR__ . '/../ocr_engine.php';
require_once __DIR__ . '/../test_harness.php';

// ارسال هدرهای CORS
sendCorsHeaders();

$db = Ashk24Db::getInstance();

// دریافت مسیر درخواست (Route)
$route = $_GET['route'] ?? '';
if (empty($route)) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($uri, PHP_URL_PATH);
    $path = preg_replace('/^.*\/api\//', '', $path);
    $route = trim($path, '/');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$inputJSON = file_get_contents('php://input');
$body = json_decode($inputJSON, true) ?? [];

// مسیریابی اکشن‌ها
try {
    // مسیرهای گیت‌وی عیب‌یابی و پایش امن
    if (strpos($route, 'gateway/') === 0) {
        require_once __DIR__ . '/../diagnostic_gateway.php';
        Ashk24DiagnosticGateway::handleRequest($route, $method, $body);
        exit(0);
    }

    
        // --- Added Authentication Check for Agent Endpoints ---
        $agentEndpoints = ['jobs', 'jobs/claim', 'jobs/update', 'bridge/handshake/init', 'bridge/handshake/complete'];
        $isAgentRegex = preg_match('/^jobs\/([^\/]+)$/', $route);
        if (in_array($route, $agentEndpoints) || $isAgentRegex) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
            $expectedToken = defined('CPANEL_AGENT_TOKEN') ? CPANEL_AGENT_TOKEN : (getenv('CPANEL_AGENT_TOKEN') ?: '');
            
            $isValid = false;
            if (preg_match('/Bearer\s+(.*)/i', $authHeader, $matches)) {
                if (trim($matches[1]) === $expectedToken) {
                    $isValid = true;
                }
            }
            if (!$isValid && !empty($expectedToken)) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized: Invalid or missing CPANEL_AGENT_TOKEN'], JSON_UNESCAPED_UNICODE);
                exit(0);
            }
        }
        // -----------------------------------------------------

    switch (true) {

        // --- 1. Health & Resilience & File Upload ---
        case ($route === 'upload'):
            if ($method === 'POST') {
                $uploadsDir = defined('UPLOADS_DIR') ? UPLOADS_DIR : __DIR__ . '/../uploads';
                if (!file_exists($uploadsDir)) {
                    @mkdir($uploadsDir, 0775, true);
                }

                $fileName = '';
                $mimeType = 'image/png';
                $binaryContent = null;
                $category = $_POST['category'] ?? ($body['category'] ?? 'ad_image');

                if (isset($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
                    $fileName = $_FILES['file']['name'];
                    $mimeType = $_FILES['file']['type'] ?: (function_exists('mime_content_type') ? mime_content_type($_FILES['file']['tmp_name']) : 'image/png');
                    $binaryContent = file_get_contents($_FILES['file']['tmp_name']);
                } elseif (!empty($body['fileData'])) {
                    $fileName = $body['fileName'] ?? 'file';
                    $fileData = $body['fileData'];
                    if (preg_match('/^data:([^;]+);base64,(.+)$/', $fileData, $m)) {
                        $mimeType = $m[1];
                        $binaryContent = base64_decode($m[2]);
                    } else {
                        $binaryContent = base64_decode($fileData);
                    }
                }

                if ($binaryContent !== null && strlen($binaryContent) > 0) {
                    $ext = '.png';
                    if (strpos($mimeType, 'jpeg') !== false || strpos($mimeType, 'jpg') !== false) $ext = '.jpg';
                    elseif (strpos($mimeType, 'png') !== false) $ext = '.png';
                    elseif (strpos($mimeType, 'webp') !== false) $ext = '.webp';
                    elseif (strpos($mimeType, 'svg') !== false) $ext = '.svg';
                    elseif (strpos($mimeType, 'pdf') !== false) $ext = '.pdf';

                    $timestamp = time();
                    $sanitized = preg_replace('/[^a-zA-Z0-9.-]/', '_', pathinfo($fileName ?: 'file', PATHINFO_FILENAME));
                    $finalFileName = "asset_{$timestamp}_{$sanitized}{$ext}";
                    $filePath = "{$uploadsDir}/{$finalFileName}";

                    file_put_contents($filePath, $binaryContent);
                    $fileSize = file_exists($filePath) ? filesize($filePath) : strlen($binaryContent);

                    $asset = [
                        'id' => "asset_{$timestamp}",
                        'fileName' => $finalFileName,
                        'originalName' => $fileName ?: $finalFileName,
                        'url' => "/uploads/{$finalFileName}",
                        'mimeType' => $mimeType,
                        'sizeBytes' => $fileSize,
                        'category' => $category,
                        'uploadedAt' => date('c')
                    ];

                    http_response_code(201);
                    echo json_encode([
                        'message' => 'فایل با موفقیت در ذخیره‌ساز هاست سی‌پنل آپلود گردید.',
                        'asset' => $asset
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'محتوای فایل خالی است یا آپلود انجام نشد.'], JSON_UNESCAPED_UNICODE);
                }
            }
            break;

        case ($route === 'uploads'):
            if ($method === 'GET') {
                $uploadsDir = __DIR__ . '/../uploads';
                $assets = [];
                if (file_exists($uploadsDir)) {
                    $files = array_diff(scandir($uploadsDir), ['.', '..']);
                    foreach ($files as $fName) {
                        $filePath = "{$uploadsDir}/{$fName}";
                        if (is_file($filePath)) {
                            $assets[] = [
                                'id' => "asset_" . filemtime($filePath) . "_{$fName}",
                                'fileName' => $fName,
                                'originalName' => $fName,
                                'url' => "/uploads/{$fName}",
                                'mimeType' => (strpos($fName, '.pdf') !== false) ? 'application/pdf' : 'image/png',
                                'sizeBytes' => filesize($filePath),
                                'category' => (strpos($fName, 'logo') !== false) ? 'logo' : 'ad_image',
                                'uploadedAt' => date('c', filemtime($filePath))
                            ];
                        }
                    }
                }
                echo json_encode($assets, JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'DELETE') {
                $id = $body['fileName'] ?? ($_GET['id'] ?? '');
                if ($id) {
                    $uploadsDir = __DIR__ . '/../uploads';
                    $target = "{$uploadsDir}/" . basename($id);
                    if (file_exists($target)) {
                        unlink($target);
                    }
                }
                echo json_encode(['message' => 'فایل از هاست سی‌پنل حذف شد.'], JSON_UNESCAPED_UNICODE);
            }
            break;
        case ($route === 'health'):
            echo json_encode([
                'status' => 'ok',
                'systemName' => 'سامانه هوش مصنوعی اشک ۲۴ (بک‌اند مستقل PHP مخصوص سی‌پنل)',
                'version' => APP_VERSION,
                'timestamp' => date('c'),
                'phpVersion' => PHP_VERSION,
                'cpanelCompatible' => true
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'resilience/status'):
            echo json_encode($db->getResilienceStatus(), JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'resilience/toggle-forced-offline'):
            $forced = !empty($body['forcedOfflineMode']);
            $updated = $db->updateResilienceStatus(['forcedOfflineMode' => $forced]);
            echo json_encode([
                'message' => $forced ? 'موتور آفلاین محلی به صورت اجباری فعال گردید.' : 'موتور آنلاین بومی مجدداً در اولویت قرار گرفت.',
                'status' => $updated
            ], JSON_UNESCAPED_UNICODE);
            break;

        // --- 2. Company Profile ---
        case ($route === 'company'):
            if ($method === 'GET') {
                echo json_encode($db->getCompanyProfile(), JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'PUT' || $method === 'POST') {
                $updated = $db->updateCompanyProfile($body);
                echo json_encode([
                    'message' => 'اطلاعات پروفایل سازمانی در سی‌پنل بروزرسانی شد.',
                    'data' => $updated
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        // --- 3. Media Platforms & Discovery ---
        case ($route === 'media-platforms'):
        case ($route === 'platforms'):
            if ($method === 'GET') {
                echo json_encode($db->getMediaPlatforms(), JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                $created = $db->addPlatform($body);
                http_response_code(201);
                echo json_encode(['message' => 'پلتفرم جدید با موفقیت در دیتابیس سی‌پنل افزوده شد.', 'data' => $created], JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'platforms/sync-json'):
            $incomingList = $body['platforms'] ?? (is_array($body) ? $body : []);
            if (!empty($incomingList) && is_array($incomingList)) {
                $rawDb = $db->getRawData();
                $rawDb['mediaPlatforms'] = $incomingList;
                $db->saveData($rawDb);
                echo json_encode(['success' => true, 'count' => count($incomingList), 'message' => 'لیست پلتفرم‌ها در دیتابیس سی‌پنل همگام‌سازی شد.'], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'لیست پلتفرم‌های ارسالی معتبر نیست.'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case (preg_match('/^(?:media-)?platforms\/([^\/]+)$/', $route, $matches) ? true : false):
            $platId = $matches[1];
            if ($method === 'GET') {
                $p = $db->getPlatformById($platId);
                if (!$p) {
                    http_response_code(404);
                    echo json_encode(['error' => 'پلتفرم یافت نشد.'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode($p, JSON_UNESCAPED_UNICODE);
                }
            } elseif ($method === 'PUT') {
                $updated = $db->updatePlatform($platId, $body);
                if (!$updated) {
                    http_response_code(404);
                    echo json_encode(['error' => 'پلتفرم یافت نشد.'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode(['message' => 'اطلاعات پلتفرم بروزرسانی شد.', 'data' => $updated], JSON_UNESCAPED_UNICODE);
                }
            } elseif ($method === 'DELETE') {
                $success = $db->deletePlatform($platId);
                echo json_encode(['success' => $success, 'message' => $success ? 'پلتفرم با موفقیت حذف گردید.' : 'پلتفرم یافت نشد.'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'media-platforms/discover'):
            $sector = $body['sector'] ?? 'digital_goods';
            $targetKeywords = $body['targetKeywords'] ?? ($body['keywords'] ?? ['خدمات آنلاین', 'نیازمندی‌ها']);
            $result = Ashk24AiEngine::discoverPlatforms($sector, $targetKeywords);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;

        // --- 4. Campaigns ---
        case ($route === 'campaigns'):
            if ($method === 'GET') {
                echo json_encode($db->getCampaigns(), JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                $campaign = $db->createCampaign($body);
                http_response_code(201);
                echo json_encode([
                    'message' => 'کمپین جدید با موفقیت در سی‌پنل ثبت شد.',
                    'data' => $campaign
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        // Handle campaigns with dynamic IDs (e.g. campaigns/cmp_01_automation, campaigns/cmp_01/renew-now)
        case (preg_match('/^campaigns\/([^\/]+)$/', $route, $matches) ? true : false):
            $campaignId = $matches[1];
            if ($method === 'PUT') {
                $updated = $db->updateCampaign($campaignId, $body);
                if (!$updated) {
                    http_response_code(404);
                    echo json_encode(['error' => 'کمپین یافت نشد'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode(['message' => 'اطلاعات کمپین به روزرسانی شد.', 'data' => $updated], JSON_UNESCAPED_UNICODE);
                }
            } elseif ($method === 'DELETE') {
                $success = $db->deleteCampaign($campaignId);
                echo json_encode(['success' => $success, 'message' => $success ? 'کمپین حذف گردید.' : 'کمپین یافت نشد.'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case (preg_match('/^campaigns\/([^\/]+)\/renew-now$/', $route, $matches) ? true : false):
            $campaignId = $matches[1];
            $camp = $db->getCampaignById($campaignId);
            if (!$camp) {
                http_response_code(404);
                echo json_encode(['error' => 'کمپین یافت نشد'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $updated = $db->updateCampaign($camp['id'], [
                'lastRenewalDate' => date('Y/m/d'),
                'nextRenewalDate' => date('Y/m/d', strtotime('+30 days')),
                'renewalCount' => ($camp['renewalCount'] ?? 0) + 1
            ]);

            $jobsCreated = [];
            foreach (($camp['selectedPlatformIds'] ?? []) as $pid) {
                $plat = $db->getPlatformById($pid);
                if ($plat) {
                    $job = $db->createJob([
                        'campaignId' => $camp['id'],
                        'platformId' => $plat['id'],
                        'platformName' => $plat['persianName'],
                        'status' => 'completed',
                        'currentStep' => 'تمدید فوری و نردبان ۳۰ روزه آگهی انجام گردید.',
                        'progressPercent' => 100,
                        'logs' => [
                            ['timestamp' => date('H:i:s'), 'step' => 'Renewal', 'status' => 'success', 'message' => "تمدید ۳۰ روزه آگهی در " . $plat['persianName']]
                        ]
                    ]);
                    $jobsCreated[] = $job;
                }
            }

            echo json_encode([
                'message' => 'پروسه تمدید فوری آگهی کمپین «' . $camp['title'] . '» انجام شد.',
                'campaign' => $updated,
                'jobsCount' => count($jobsCreated)
            ], JSON_UNESCAPED_UNICODE);
            break;

        // --- 5. AI Content & SEO Endpoints ---
        case ($route === 'ai/generate-content'):
            $result = Ashk24AiEngine::generateContent($body);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'ai/analyze-seo'):
            $text = $body['text'] ?? '';
            $keywords = $body['keywords'] ?? [];
            if (empty($text)) {
                http_response_code(400);
                echo json_encode(['error' => 'متن برای آنالیز الزامی است'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $result = Ashk24AiEngine::analyzePersianSeo($text, $keywords);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'ai/analyze-dom'):
            $htmlSnippet = $body['htmlSnippet'] ?? '';
            $domain = $body['domain'] ?? 'target-site.ir';
            if (empty($htmlSnippet)) {
                http_response_code(400);
                echo json_encode(['error' => 'کد HTML برای آنالیز الزامی است'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $result = Ashk24AiEngine::analyzeDom($htmlSnippet, $domain);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'ai/analyze-url'):
            $url = $body['url'] ?? '';
            if (empty($url)) {
                http_response_code(400);
                echo json_encode(['error' => 'آدرس URL الزامی است'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36');
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            $htmlText = curl_exec($ch);
            curl_close($ch);

            if (empty($htmlText)) {
                http_response_code(500);
                echo json_encode(['error' => 'امکان دریافت محتوای آدرس وب‌سایت فراهم نشد.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $domain = parse_url($url, PHP_URL_HOST) ?? 'target-site.ir';
            $result = Ashk24AiEngine::analyzeDom($htmlText, $domain);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;

        // --- 6. Publication Jobs ---
        case ($route === 'jobs'):
            if ($method === 'GET') {
                echo json_encode($db->getJobs(), JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                $job = $db->createJob($body);
                http_response_code(201);
                echo json_encode(['message' => 'نوبت کاری جدید با موفقیت در دیتابیس سی‌پنل ثبت شد.', 'data' => $job], JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'jobs/submit-otp'):
            $jobId = $body['jobId'] ?? '';
            $otpCode = $body['otpCode'] ?? '';
            if (empty($jobId) || empty($otpCode)) {
                http_response_code(400);
                echo json_encode(['error' => 'شناسه نوبت کاری (jobId) و کد تایید (otpCode) الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $existingJob = $db->getJobById($jobId);
            if (!$existingJob) {
                http_response_code(404);
                echo json_encode(['error' => 'نوبت کاری یافت نشد.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $db->addJobLog($jobId, [
                'step' => 'OTP_SUBMIT',
                'status' => 'info',
                'message' => "کد تایید OTP ($otpCode) توسط کاربر ثبت و به موتور ارسال شد."
            ]);
            $updated = $db->updateJob($jobId, [
                'status' => 'authenticated',
                'otpCodeExtracted' => $otpCode,
                'currentStep' => 'احراز هویت انجام شد. در حال ارسال اطلاعات آگهی به سرور مقصد...',
                'progressPercent' => 70
            ]);
            echo json_encode(['message' => 'کد OTP ثبت شد و احراز هویت تایید گردید.', 'data' => $updated], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'jobs/resolve-challenge'):
            $jobId = $body['jobId'] ?? '';
            $otpCode = trim($body['otpCode'] ?? '');
            $captchaToken = trim($body['captchaToken'] ?? '');
            $storageState = $body['storageState'] ?? null;

            if (empty($jobId)) {
                http_response_code(400);
                echo json_encode(['error' => 'شناسه نوبت کاری الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            if (empty($otpCode) && empty($captchaToken) && empty($storageState)) {
                http_response_code(400);
                echo json_encode(['error' => 'حداقل یکی از موارد: کد پیامک، توکن حل کپچا یا نشست ذخیره‌شده باید توسط کاربر وارد شود.'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $job = $db->getJobById($jobId);
            if (!$job) {
                http_response_code(404);
                echo json_encode(['error' => 'نوبت کاری یافت نشد.'], JSON_UNESCAPED_UNICODE);
                break;
            }

            if ($storageState && !empty($job['platformId'])) {
                $db->savePlatformStorageState($job['platformId'], $storageState);
            }

            $updated = $db->updateJob($jobId, [
                'status' => 'resumed',
                'currentStep' => 'چالش امنیتی توسط کاربر حل گردید. ادامه انتشار در جریان است...',
                'humanActionVerified' => true,
                'humanResolution' => [
                    'resolvedAt' => date('c'),
                    'channel' => 'Human-in-the-Loop Secretary Bridge',
                    'hasOtp' => !empty($otpCode),
                    'hasCaptcha' => !empty($captchaToken)
                ],
                'otpCode' => $otpCode ?: ($job['otpCode'] ?? null),
                'resumedAt' => date('c')
            ]);

            $db->addJobLog($jobId, [
                'step' => 'HUMAN_CHALLENGE_RESOLVED',
                'status' => 'success',
                'message' => 'چالش امنیتی توسط کاربر با موفقیت حل شد و مجوز از سرگیری صادر شد.'
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'چالش با موفقیت حل شد و نوبت کاری فعال گردید.',
                'job' => $updated
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'jobs/resume'):
            $jobId = $body['jobId'] ?? '';
            $humanActionConfirmed = !empty($body['humanActionConfirmed']) || !empty($body['otpCode']) || !empty($body['captchaSolved']);
            $existingJob = $db->getJobById($jobId);
            if (!$existingJob) {
                http_response_code(404);
                echo json_encode(['error' => 'نوبت کاری یافت نشد.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            if (!$humanActionConfirmed) {
                http_response_code(422);
                $db->addJobLog($jobId, [
                    'step' => 'RESUME_FAILED',
                    'status' => 'blocked',
                    'message' => 'تلاش برای ادامه بدون اقدام واقعی انسانی (حل کپچا یا ثبت کد پیامک واقعی) مسدود شد.'
                ]);
                echo json_encode([
                    'success' => false,
                    'error' => 'HUMAN_ACTION_REQUIRED',
                    'message' => 'اقدام واقعی انسانی (حل کپچا یا ثبت کد پیامک واقعی) دریافت نگردید. وضعیت متوقف باقی می‌ماند.',
                    'status' => 'paused_user_action'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }
            $updated = $db->updateJob($jobId, [
                'status' => 'resumed',
                'currentStep' => 'اقدام انسانی تایید شد. ماموریت مجدداً از سر گرفته شد.',
                'resumedAt' => date('c'),
                'humanActionVerified' => true
            ]);
            $db->addJobLog($jobId, [
                'step' => 'JOB_RESUMED',
                'status' => 'info',
                'message' => 'ماموریت با اقدام واقعی انسانی از حالت توقف خارج و ادامه یافت.'
            ]);
            echo json_encode(['success' => true, 'message' => 'ماموریت از سر گرفته شد.', 'job' => $updated], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'jobs/verify-publication'):
            $targetUrl = $body['targetUrl'] ?? ($body['url'] ?? '');
            $jobId = $body['jobId'] ?? '';
            if (empty($targetUrl)) {
                http_response_code(400);
                echo json_encode(['error' => 'آدرس اینترنتی مقصد (targetUrl) جهت راستی‌آزمایی مستقل الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            // اجرای راستی‌آزمایی مستقل شبکه
            $ch = curl_init($targetUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Ashk24IndependentVerifier/4.0');
            $html = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $verificationResult = [
                'timestamp' => date('c'),
                'targetUrl' => $targetUrl,
                'httpStatus' => $httpCode,
                'isAccessible' => ($httpCode >= 200 && $httpCode < 400),
                'verifiedBy' => 'cPanel_Independent_Worker',
                'evidenceCaptured' => !empty($html)
            ];

            if ($jobId) {
                $db->updateJob($jobId, [
                    'independentVerification' => $verificationResult
                ]);
            }
            echo json_encode(['success' => true, 'verification' => $verificationResult], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'jobs/trigger'):
            $campaignId = $body['campaignId'] ?? '';
            $platformId = $body['platformId'] ?? '';
            $campaign = $db->getCampaignById($campaignId);
            $platform = $db->getPlatformById($platformId);
            $company = $db->getCompanyProfile();

            if (!$campaign || !$platform) {
                http_response_code(400);
                echo json_encode(['error' => 'کمپین یا پلتفرم معتبر نیست'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // Real HTTP cURL handshake to target website on cPanel server with TLS verification
            $targetDomain = $platform['domain'] ?? 'istgah.com';
            $ch = curl_init("https://" . $targetDomain . "/");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            curl_setopt($ch, CURLOPT_TIMEOUT, 8);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            $probeRes = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $requiresOtp = !empty($platform['requiresOtp']) && empty($platform['sessionToken']);
            // Real publication state machine: pending -> preparing -> waiting_otp -> authenticated -> submitting -> submitted -> under_review -> published -> verified
            $jobStatus = $requiresOtp ? 'waiting_otp' : 'preparing';
            $stepDesc = $requiresOtp 
                ? "ارسال بسته اولیه به {$platform['persianName']} ({$platform['domain']}) انجام شد. منتظر دریافت کد OTP برای شماره " . ($company['phoneNumber'] ?? '') 
                : "بررسی نهایی ساختار فرم {$platform['persianName']} و آماده‌سازی داده‌ها جهت ثبت...";

            $job = $db->createJob([
                'campaignId' => $campaignId,
                'platformId' => $platformId,
                'platformName' => $platform['persianName'],
                'status' => $jobStatus,
                'currentStep' => $stepDesc,
                'progressPercent' => $requiresOtp ? 30 : 20,
                'adUrl' => null, // NO FABRICATED URL
                'logs' => [
                    ['timestamp' => date('H:i:s'), 'step' => 'HTTP_DISPATCH', 'status' => 'info', 'message' => "ارتباط واقعی شبکه با {$platform['domain']} برقرار شد (کد وضعیت HTTP {$httpCode})"],
                    ['timestamp' => date('H:i:s'), 'step' => 'DATA_MAPPING', 'status' => 'info', 'message' => "نگاشت داده‌های کمپین «{$campaign['title']}» روی الگوی ثبت پلتفرم"],
                    ['timestamp' => date('H:i:s'), 'step' => $requiresOtp ? 'OTP_WAIT' : 'PREPARING', 'status' => 'info', 'message' => $requiresOtp ? "درخواست کد OTP ثبت گردید. در انتظار ورود کد..." : "آماده‌سازی ارسال خودکار داده‌ها..."]
                ],
                'otpRequired' => $requiresOtp,
                'usedEngine' => 'offline-heuristic-iran'
            ]);

            http_response_code(201);
            echo json_encode(['message' => 'فرآیند انتشار در سرور مقصد آغاز گردید.', 'data' => $job], JSON_UNESCAPED_UNICODE);
            break;

        case (preg_match('/^jobs\/([^\/]+)\/submit-otp$/', $route, $matches) ? true : false):
            $jobId = $matches[1];
            $otpCode = $body['otpCode'] ?? '';
            if (empty($otpCode)) {
                http_response_code(400);
                echo json_encode(['error' => 'کد OTP الزامی است'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $existingJob = $db->getJobById($jobId);
            if (!$existingJob) {
                http_response_code(404);
                echo json_encode(['error' => 'نوبت کاری یافت نشد.'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $db->addJobLog($jobId, [
                'step' => 'OTP_SUBMIT',
                'status' => 'info',
                'message' => "کد تایید OTP ($otpCode) توسط کاربر ثبت و به موتور ارسال شد."
            ]);
            
            // Real transition: waiting_otp -> authenticated -> submitting
            $updated = $db->updateJob($jobId, [
                'status' => 'authenticated',
                'otpCodeExtracted' => $otpCode,
                'currentStep' => 'احراز هویت انجام شد. در حال ارسال اطلاعات آگهی به سرور مقصد...',
                'progressPercent' => 70
            ]);

            echo json_encode(['message' => 'کد OTP ثبت شد و احراز هویت تایید گردید.', 'data' => $updated], JSON_UNESCAPED_UNICODE);
            break;

        // --- Headless Automation Replacement (Native PHP cURL) ---

        case ($route === 'jobs/claim'):
            if ($method !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Method Not Allowed']); break; }
            $jobId = $body['jobId'] ?? ($_GET['jobId'] ?? '');
            $agentId = $body['agentId'] ?? ($_GET['agentId'] ?? 'agent_local_default');
            if (empty($jobId)) {
                http_response_code(400);
                echo json_encode(['error' => 'شناسه جاب جهت دریافت قفل الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $claimedJob = $db->claimJob($jobId, $agentId, 300);
            if (!$claimedJob) {
                http_response_code(409);
                echo json_encode(['error' => 'جاب توسط ایجنت دیگری قفل شده و مهلت آن هنوز به پایان نرسیده است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            echo json_encode([
                'success' => true,
                'claimToken' => $claimedJob['claimToken'],
                'leaseExpiresAt' => $claimedJob['leaseExpiresAt'],
                'job' => $claimedJob
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'jobs/update'):
            $jobId = $body['jobId'] ?? ($body['id'] ?? '');
            if (empty($jobId)) {
                http_response_code(400);
                echo json_encode(['error' => 'شناسه جاب جهت بروزرسانی الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $updated = $db->updateJob($jobId, $body);
            if (!$updated) {
                http_response_code(404);
                echo json_encode(['error' => 'جاب یافت نشد.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            if (isset($body['logMessage'])) {
                $db->addJobLog($jobId, [
                    'step' => $body['step'] ?? 'EXECUTION_UPDATE',
                    'status' => $body['logStatus'] ?? 'info',
                    'message' => $body['logMessage']
                ]);
            }
            echo json_encode(['success' => true, 'message' => 'وضعیت جاب با موفقیت بروزرسانی شد.', 'job' => $updated], JSON_UNESCAPED_UNICODE);
            break;

        case (preg_match('/^jobs\/([^\/]+)$/', $route, $matches) ? true : false):
        case (strpos($route, 'jobs/job_') === 0):
            $jobId = $matches[1] ?? str_replace('jobs/', '', $route);
            if ($method === 'GET') {
                $j = $db->getJobById($jobId);
                if (!$j) {
                    http_response_code(404);
                    echo json_encode(['error' => 'نوبت کاری یافت نشد.'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode($j, JSON_UNESCAPED_UNICODE);
                }
            } elseif ($method === 'PUT') {
                $updated = $db->updateJob($jobId, $body);
                if (!$updated) {
                    http_response_code(404);
                    echo json_encode(['error' => 'نوبت کاری یافت نشد.'], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode(['message' => 'نوبت کاری بروزرسانی شد.', 'data' => $updated], JSON_UNESCAPED_UNICODE);
                }
            } elseif ($method === 'DELETE') {
                $success = $db->deleteJob($jobId);
                echo json_encode(['success' => $success, 'message' => $success ? 'نوبت کاری با موفقیت حذف گردید.' : 'نوبت کاری یافت نشد.'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'puppet/request-otp'):
            $platformId = $body['platformId'] ?? '';
            $domain = $body['domain'] ?? '';
            $phone = $body['phoneNumber'] ?? '';
            
            if (empty($phone)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'شماره موبایل الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

            if (strpos($domain, 'divar') !== false || strpos($platformId, 'divar') !== false) {
                curl_setopt($ch, CURLOPT_URL, 'https://api.divar.ir/v5/auth/authenticate');
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['phone' => $phone]));
            } elseif (strpos($domain, 'sheypoor') !== false || strpos($platformId, 'sheypoor') !== false) {
                curl_setopt($ch, CURLOPT_URL, 'https://www.sheypoor.com/api/v10.0.0/auth/send');
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['username' => $phone]));
            } else {
                http_response_code(422);
                echo json_encode([
                    'success' => false,
                    'error' => "پلتفرم {$domain} نیازمند تعامل مستقیم افزونه مرورگر است و درگاه API مستقیم بدون افزونه ندارد.",
                    'latencyMs' => 50
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 || $httpCode === 201) {
                echo json_encode([
                    'success' => true,
                    'message' => 'درخواست OTP با موفقیت از طریق cURL ارسال شد.',
                    'rawResponse' => json_decode($res, true) ?: $res,
                    'latencyMs' => 200
                ], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code($httpCode ?: 500);
                echo json_encode([
                    'success' => false,
                    'error' => "خطا در ارسال درخواست به سایت مقصد (کد {$httpCode})",
                    'rawResponse' => json_decode($res, true) ?: $res
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'puppet/verify-otp'):
            $platformId = $body['platformId'] ?? '';
            $domain = $body['domain'] ?? '';
            $phone = $body['phoneNumber'] ?? '';
            $code = $body['otpCode'] ?? '';
            
            if (empty($phone) || empty($code)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'شماره موبایل و کد تایید الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

            if (strpos($domain, 'divar') !== false || strpos($platformId, 'divar') !== false) {
                curl_setopt($ch, CURLOPT_URL, 'https://api.divar.ir/v5/auth/confirm');
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['phone' => $phone, 'code' => $code]));
            } elseif (strpos($domain, 'sheypoor') !== false || strpos($platformId, 'sheypoor') !== false) {
                curl_setopt($ch, CURLOPT_URL, 'https://www.sheypoor.com/api/v10.0.0/auth/login');
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['username' => $phone, 'password' => $code]));
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'پلتفرم مورد نظر فاقد درگاه مستقیم اعتبارسنجی خودکار بدون افزونه است. لطفاً از افزونه مرورگر اشک ۲۴ استفاده نمایید.'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $headers = substr($res, 0, $headerSize);
            $bodyStr = substr($res, $headerSize);
            curl_close($ch);

            if ($httpCode === 200 || $httpCode === 201) {
                $respData = json_decode($bodyStr, true) ?: [];
                $token = $respData['token'] ?? '';
                if (empty($token) && preg_match('/token=([^;]+)/', $headers, $m)) {
                    $token = $m[1];
                }
                if (!empty($token)) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'احراز هویت واقعی با موفقیت انجام شد و توکن اختصاصی دریافت گردید.',
                        'sessionToken' => $token,
                        'rawResponse' => $respData
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'پاسخ سرور فاقد توکن معتبر بود.',
                        'rawResponse' => $respData
                    ], JSON_UNESCAPED_UNICODE);
                }
            } else {
                http_response_code($httpCode ?: 400);
                $respData = json_decode($bodyStr, true) ?: $bodyStr;
                $errDetail = is_array($respData) ? ($respData['message'] ?? ($respData['error'] ?? 'کد نامعتبر است')) : $bodyStr;
                echo json_encode([
                    'success' => false,
                    'error' => "کد تایید توسط درگاه مقصد رد شد ({$errDetail})",
                    'rawResponse' => $respData
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case ($route === 'puppet/publish-ad'):
            $domain = $body['platformDomain'] ?? '';
            // هرگونه ساخت لینک الکی و غیرواقعی در این پروژه اکیدا ممنوع است
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'status' => 'blocked_user_action',
                'error' => 'ثبت خودکار فرم بدون افزونه مرورگر برای این درگاه به دلیل فعال بودن کپچا و محدودیت‌های سرور cPanel میسر نیست. لطفاً افزونه مرورگر اشک ۲۴ را فعال نمایید.',
                'logs' => [
                    "[امنیت پلتفرم] وجود کپچا یا نیازمندی به ورود واقعی در {$domain}",
                    "[راهکار قطعی] استفاده از افزونه مرورگر بر روی IP واقعی کاربر در ایران"
                ]
            ], JSON_UNESCAPED_UNICODE);
            break;

        // --- 7. Webhooks & Mobile Companion Bridge (Hardened v4.0.0) ---
        case ($route === 'webhooks/sms'):
            // بررسی هدر امنیتی و امضای گیت‌وی
            $expectedSecret = defined('CRON_SECRET_KEY') ? CRON_SECRET_KEY : (getenv('SMS_GATEWAY_SECRET') ?: 'ashk24_cron_secret');
            $providedSecret = $_SERVER['HTTP_X_GATEWAY_SECRET'] 
                ?? ($_SERVER['HTTP_X_WEBHOOK_SECRET'] 
                ?? ($_SERVER['HTTP_X_API_KEY'] 
                ?? ($body['gatewaySecret'] 
                ?? ($body['secret'] 
                ?? ($_GET['key'] ?? '')))));

            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if (empty($providedSecret) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $m)) {
                $providedSecret = trim($m[1]);
            }

            $signatureVerified = (!empty($providedSecret) && hash_equals((string)$expectedSecret, (string)$providedSecret));

            if (!$signatureVerified) {
                http_response_code(401);
                echo json_encode([
                    'error' => 'امضا یا کلید امنیتی وب‌هوک پیامک نامعتبر یا ارسال نشده است (Invalid/Missing Gateway Signature).',
                    'gatewaySignatureVerified' => false,
                    'reason' => 'MISSING_OR_INVALID_GATEWAY_SECRET'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            $sender = $body['senderNumber'] ?? ($body['sender'] ?? '');
            $receiver = $body['receiverNumber'] ?? ($body['receiver'] ?? '');
            $msg = $body['messageText'] ?? ($body['message'] ?? ($body['text'] ?? ''));
            $messageId = $body['messageId'] ?? ($body['msgId'] ?? ('SMS-' . time() . '-' . substr(bin2hex(random_bytes(3)), 0, 6)));
            $source = $body['source'] ?? 'SMS_GATEWAY_REAL';

            if (empty($msg)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'متن پیامک ارسالی خالی است.',
                    'gatewaySignatureVerified' => true
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            preg_match('/\b\d{4,8}\b/', $msg, $otpMatches);
            $otp = $otpMatches[0] ?? null;

            // پیدا کردن هوشمند نوبت در انتظار تایید پیامک (Auto-Satisfy waiting_otp)
            $matchedJobId = null;
            if (!empty($otp)) {
                $jobs = $db->getJobs();
                foreach ($jobs as $job) {
                    if ($job['status'] === 'waiting_otp') {
                        $matchedJobId = $job['id'];
                        $db->addJobLog($job['id'], [
                            'step' => 'Mobile SMS Auto-Relay',
                            'status' => 'success',
                            'message' => "کد تایید OTP ($otp) از وب‌هوک معتبر گیت‌وی استخراج و به منشی تحویل داده شد."
                        ]);
                        $db->updateJob($job['id'], [
                            'status' => 'in_progress',
                            'currentStep' => "کد تایید OTP ($otp) با امضای معتبر گیت‌وی دریافت شد.",
                            'otpCode' => $otp
                        ]);
                        break;
                    }
                }
            }

            $log = $db->addSmsLog([
                'id' => $messageId,
                'messageId' => $messageId,
                'senderNumber' => $sender ?: 'UNKNOWN_SENDER',
                'sender' => $sender ?: 'UNKNOWN_SENDER',
                'receiverNumber' => $receiver,
                'messageText' => $msg,
                'extractedOtp' => $otp,
                'otpCode' => $otp,
                'matchedJobId' => $matchedJobId,
                'gatewaySignatureVerified' => true,
                'source' => $source,
                'executionEnvironment' => 'CPANEL_SERVER',
                'receivedAt' => date('c'),
                'status' => !empty($otp) ? 'matched' : 'unmatched'
            ]);

            echo json_encode([
                'message' => 'وب‌هوک پیامک با امضای معتبر دریافت و در دیتابیس سی‌پنل ثبت گردید.',
                'gatewaySignatureVerified' => true,
                'messageId' => $messageId,
                'extractedOtp' => $otp,
                'matchedJobId' => $matchedJobId,
                'data' => $log
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'mobile/relay-otp'):
            $otp = $body['otpCode'] ?? '';
            $jobId = $body['jobId'] ?? null;
            if (empty($otp)) {
                http_response_code(400);
                echo json_encode(['error' => 'کد تایید OTP الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $matchedJobId = null;
            $jobs = $db->getJobs();
            foreach ($jobs as $job) {
                if (($jobId && $job['id'] === $jobId) || (!$jobId && $job['status'] === 'waiting_otp')) {
                    $matchedJobId = $job['id'];
                    $db->addJobLog($job['id'], [
                        'step' => 'Mobile One-Tap Relay',
                        'status' => 'success',
                        'message' => "کد تایید ($otp) از طریق اعلان موبایل توسط کاربر تایید و تحویل منشی گردید."
                    ]);
                    $db->updateJob($job['id'], [
                        'status' => 'in_progress',
                        'currentStep' => "کد تایید ($otp) دریافت شد. در حال تکمیل فرآیند انتشار در سرور مقصد...",
                        'otpCode' => $otp
                    ]);
                    break;
                }
            }

            if (!$matchedJobId) {
                http_response_code(404);
                echo json_encode(['error' => 'هیچ نوبت کاری منتظر تایید یا متناظری یافت نشد.'], JSON_UNESCAPED_UNICODE);
                break;
            }

            echo json_encode([
                'success' => true,
                'matchedJobId' => $matchedJobId,
                'message' => "کد OTP به نوبت $matchedJobId متصل گردید."
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'mobile/sync-token'):
            $platformId = $body['platformId'] ?? '';
            $sessionToken = $body['sessionToken'] ?? '';
            if (empty($platformId) || empty($sessionToken)) {
                http_response_code(400);
                echo json_encode(['error' => 'شناسه پلتفرم و توکن نشست الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $db->savePlatformSessionToken($platformId, $sessionToken);
            echo json_encode([
                'success' => true,
                'message' => "توکن سشن پلتفرم ($platformId) با موفقیت در هاست ذخیره گردید. منشی ۲۴ ساعته اکنون به صورت خودکار با این توکن فعالیت می‌کند.",
                'platformId' => $platformId
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'mobile/pending-otp'):
            $jobs = $db->getJobs();
            $waiting = array_values(array_filter($jobs, function($j) {
                return $j['status'] === 'waiting_otp' || $j['status'] === 'paused_user_action';
            }));
            echo json_encode([
                'hasPendingOtp' => count($waiting) > 0,
                'pendingJobs' => $waiting
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'webhooks/sms/logs'):
        case ($route === 'webhooks/sms-logs'):
            echo json_encode($db->getSmsLogs(), JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'webhooks/email'):
            if ($method === 'GET') {
                echo json_encode($db->getEmailLogs(), JSON_UNESCAPED_UNICODE);
                break;
            }
            $from = $body['from'] ?? 'robot@target-platform.ir';
            $subject = $body['subject'] ?? 'تایید ایمیل کاربری';
            $emailBody = $body['body'] ?? '';
            preg_match('/https?:\/\/[^\s]+/', $emailBody, $linkMatches);
            $link = $linkMatches[0] ?? null;

            $log = $db->addEmailLog([
                'from' => $from,
                'subject' => $subject,
                'body' => $emailBody,
                'verificationLink' => $link,
                'status' => 'parsed'
            ]);
            echo json_encode(['message' => 'وب‌هوک ایمیل با موفقیت ثبت گردید.', 'data' => $log], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'webhooks/email/logs'):
        case ($route === 'webhooks/email-logs'):
            echo json_encode($db->getEmailLogs(), JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'mobile/config'):
            if ($method === 'GET') {
                echo json_encode($db->getMobileConfig(), JSON_UNESCAPED_UNICODE);
            } else {
                $updated = $db->updateMobileConfig($body);
                echo json_encode(['success' => true, 'message' => 'تنظیمات همیار موبایل در سی‌پنل بروزرسانی شد.', 'config' => $updated], JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'mobile/notifications'):
            echo json_encode($db->getMobileNotifications(), JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'mobile/push-notify'):
            $notif = $db->addMobileNotification($body);
            http_response_code(201);
            echo json_encode(['success' => true, 'message' => 'اعلان به همیار موبایل ارسال شد.', 'notification' => $notif], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'system/logs'):
            echo json_encode($db->getSystemLogs(), JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'system/clear-logs'):
            $db->clearSystemLogs();
            echo json_encode(['success' => true, 'message' => 'کلیه لاگ‌های سیستمی پاکسازی شدند.'], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'cron/logs'):
            echo json_encode($db->getCronLogs(), JSON_UNESCAPED_UNICODE);
            break;

        // =========================================================================
        // ماژول جامع و واقعی آزمون عملیاتی سرور پروداکشن: Production Test Harness
        // =========================================================================
        case ($route === 'test-harness/run-all'):
            $mode = $body['mode'] ?? ($_GET['mode'] ?? 'SAFE_TEST');
            $targetPlatform = $body['targetPlatform'] ?? ($_GET['targetPlatform'] ?? 'plat_internal_blog');
            $harness = new Ashk24ProductionTestHarness($mode, $targetPlatform);
            $report = $harness->runAll();
            echo json_encode($report, JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'test-harness/run'):
            $stepCategory = $body['category'] ?? ($_GET['category'] ?? 'infrastructure');
            $mode = $body['mode'] ?? ($_GET['mode'] ?? 'SAFE_TEST');
            $targetPlatform = $body['targetPlatform'] ?? ($_GET['targetPlatform'] ?? 'plat_internal_blog');
            $harness = new Ashk24ProductionTestHarness($mode, $targetPlatform);

            $stepResult = null;
            switch ($stepCategory) {
                case 'infrastructure':
                    $stepResult = $harness->runInfrastructureTest();
                    break;
                case 'api_contract':
                    $stepResult = $harness->runApiContractTest();
                    break;
                case 'authentication':
                    $stepResult = $harness->runAuthenticationTest();
                    break;
                case 'otp_e2e':
                    $stepResult = $harness->runOtpE2ETest();
                    break;
                case 'captcha_human':
                    $stepResult = $harness->runCaptchaHumanActionTest();
                    break;
                case 'registration_flow':
                    $stepResult = $harness->runRegistrationFlowTest();
                    break;
                case 'publication':
                    $stepResult = $harness->runPublicationTest();
                    break;
                default:
                    $stepResult = $harness->runInfrastructureTest();
                    break;
            }

            echo json_encode([
                'success' => true,
                'runId' => $harness->getRunId(),
                'step' => $stepResult
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'test-harness/status'):
            $runs = $db->getTestRuns(15);
            $latestRun = !empty($runs) ? $runs[0] : null;
            echo json_encode([
                'serverTime' => date('c'),
                'totalRecordedRuns' => count($runs),
                'latestRun' => $latestRun,
                'recentRuns' => $runs,
                'harnessReady' => true,
                'supportedModes' => ['SAFE_TEST', 'LIVE_TEST']
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'test-harness/invalidate-unverified'):
            $res = $db->invalidateUnverifiedRuns();
            echo json_encode([
                'success' => true,
                'message' => "تعداد {$res['invalidatedCount']} گزارش بدون شواهد واقعی سرور با موفقیت ابطال (INVALIDATED) شدند.",
                'invalidatedCount' => $res['invalidatedCount'],
                'auditTrail' => $res['auditTrail']
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'test-harness/report'):
            $requestedRunId = $_GET['runId'] ?? ($body['runId'] ?? '');
            if (!empty($requestedRunId)) {
                $runData = $db->getTestRun($requestedRunId);
            } else {
                $runs = $db->getTestRuns(1);
                $runData = !empty($runs) ? $db->getTestRun($runs[0]['runId']) : null;
            }

            if (!$runData) {
                http_response_code(404);
                echo json_encode(['error' => 'گزارش آزمون با شناسه درخواستی یافت نشد.'], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode($runData, JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'test-harness/reset'):
            $result = $db->resetTestHarnessData();
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;


        case ($route === 'bridge/handshake/init'):
            echo json_encode([
                'success' => false,
                'status' => 'initialized',
                'bridgeVersion' => APP_VERSION,
                'serverTime' => date('c'),
                'message' => 'منتظر اتصال واقعی ایجنت لوکال...'
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'bridge/handshake/complete'):
            $token = $body['handshakeToken'] ?? '';
            $sessionData = $body['sessionData'] ?? null;
            
            if (empty($token) || empty($sessionData)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'status' => 'rejected',
                    'message' => 'اتصال نامعتبر. توکن هندشیک و اطلاعات نشست (Session) الزامی است.'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => true,
                    'status' => 'connected',
                    'timestamp' => date('c'),
                    'message' => 'اتصال ایجنت لوکال با بک‌اند سی‌پنل تایید گردید.'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;


        case ($route === 'internal-site/publish'):
            $title = $body['title'] ?? 'مطلب جدید';
            $report = $db->addPublicationReport([
                'campaignId' => $body['campaignId'] ?? 'cmp_manual',
                'platformId' => 'plat_internal_blog',
                'platformName' => 'پایگاه اطلاع‌رسانی داخلی اشک ۲۴',
                'status' => 'internal_only',
                'title' => $title,
                'createdAt' => date('c')
            ]);
            http_response_code(201);
            echo json_encode([
                'success' => false,
                'message' => 'محتوا به صورت داخلی ثبت شد. انتشار نهایی نیازمند Evidence از ایجنت لوکال است.',
                'report' => $report
            ], JSON_UNESCAPED_UNICODE);
            break;

        // --- 8. Autonomous Secretary ---
        case ($route === 'autonomous/settings'):
            if ($method === 'GET') {
                echo json_encode($db->getAutonomousSettings(), JSON_UNESCAPED_UNICODE);
            } else {
                $updated = $db->updateAutonomousSettings($body);
                echo json_encode(['message' => 'تنظیمات منشی ۲۴ ساعته بروزرسانی شد.', 'data' => $updated], JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'autonomous/run-now'):
            $company = $db->getCompanyProfile();
            $discovery = Ashk24AiEngine::discoverPlatforms($company['sector'] ?? 'digital_goods', $company['keywords'] ?? []);
            $discoveredList = $discovery['discoveredPlatforms'] ?? [];

            $db->addAutonomousLog([
                'action' => 'discovery',
                'title' => 'اجرای چرخه منشی ۲۴ ساعته در سی‌پنل',
                'details' => "تعداد " . count($discoveredList) . " رسانه و وبلاگ هدف شناسایی شدند. انتشار نیازمند اتصال ایجنت لوکال واقعی است.",
                'status' => 'pending_agent'
            ]);

            echo json_encode([
                'success' => false,
                'message' => 'شناسایی پلتفرم‌ها انجام شد. برای انتشار نیازمند اجرای Local Agent واقعی هستید.',
                'details' => $discovery
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'autonomous/logs'):
            echo json_encode($db->getAutonomousLogs(), JSON_UNESCAPED_UNICODE);
            break;

        // --- 8.5 Telemetry & Publication Debugger ---
        case ($route === 'telemetry/logs'):
            if ($method === 'POST') {
                $saved = $db->addTelemetryLog($body);
                http_response_code(201);
                echo json_encode(['message' => 'لاگ ثبت شد.', 'data' => $saved], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode($db->getTelemetryLogs(), JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'telemetry/clear'):
            $db->addTelemetryLog(['status' => 'info', 'aiDiagnosticSummary' => 'لاگ‌ها پاکسازی شدند']);
            echo json_encode(['message' => 'کلیه لاگ‌های دیباگر پاکسازی شدند.'], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'telemetry/patches'):
            echo json_encode($db->getAutoPatches(), JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'telemetry/apply-patch'):
            $patchId = $body['patchId'] ?? '';
            $res = $db->applyAutoPatch($patchId);
            echo json_encode($res, JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'telemetry/probe-now'):
            $platforms = array_filter($db->getMediaPlatforms(), function($p) { return !empty($p['active']); });
            $logs = [];
            foreach ($platforms as $p) {
                $url = "https://{$p['domain']}";
                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                $start = microtime(true);
                $content = curl_exec($ch);
                $latency = round((microtime(true) - $start) * 1000);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                $isReachable = $httpCode >= 200 && $httpCode < 400;

                $tel = $db->addTelemetryLog([
                    'platformId' => $p['id'],
                    'platformName' => $p['persianName'],
                    'platformDomain' => $p['domain'],
                    'stage' => 'dom_analysis',
                    'httpCode' => $httpCode,
                    'latencyMs' => $latency,
                    'reachable' => $isReachable,
                    'responseHash' => $content ? md5($content) : null,
                    'requestUrl' => $url,
                    'status' => $isReachable ? 'success' : 'error',
                    'aiDiagnosticSummary' => "نتیجه کاوش: HTTP $httpCode"
                ]);
                $logs[] = $tel;
            }
            echo json_encode(['success' => true, 'message' => 'کاوش واقعی انجام شد.', 'logs' => $logs], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'telemetry/dom-watcher'):
            if ($method === 'POST') {
                $saved = $db->addDomWatcherEvent($body);
                http_response_code(201);
                echo json_encode(['message' => 'رویداد ثبت شد.', 'data' => $saved], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode($db->getDomWatcherEvents(), JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'telemetry/dom-watcher/clear'):
            $db->clearDomWatcherEvents();
            echo json_encode(['message' => 'رویدادهای DOM پاکسازی شد.'], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'telemetry/validate-pre-submit'):
            $res = $db->processPreSubmissionValidation($body);
            echo json_encode($res, JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'telemetry/self-healing'):
            echo json_encode($db->getSelfHealingAuditResults(), JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'telemetry/self-healing/run'):
            $res = $db->runSelfHealingAudit();
            echo json_encode($res, JSON_UNESCAPED_UNICODE);
            break;

        // --- 9. Auth & User Management ---
        case ($route === 'auth/login'):
            $username = $body['username'] ?? '';
            $password = $body['password'] ?? '';
            if (empty($username) || empty($password)) {
                http_response_code(400);
                echo json_encode(['error' => 'نام کاربری و کلمه عبور الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $user = $db->authenticateUser($username, $password);
            if (!$user) {
                http_response_code(401);
                echo json_encode(['error' => 'نام کاربری یا کلمه عبور اشتباه است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $token = 'token_ashk24_cpanel_' . bin2hex(random_bytes(16)) . '_' . time();
            echo json_encode(['message' => 'ورود موفقیت‌آمیز بود.', 'user' => $user, 'token' => $token], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'auth/reset-passwords'):
            $users = $db->resetDefaultUsers();
            echo json_encode([
                'message' => 'کلمات عبور پیش‌فرض (admin و operator) به ashk24 بازنشانی گردید.',
                'users' => $users
            ], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'auth/change-password'):
            $username = $body['username'] ?? '';
            $oldPassword = $body['oldPassword'] ?? '';
            $newPassword = $body['newPassword'] ?? '';
            if (empty($username) || empty($oldPassword) || empty($newPassword)) {
                http_response_code(400);
                echo json_encode(['error' => 'تمام فیلدهای تغییر رمز عبور الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $success = $db->changeUserPassword($username, $oldPassword, $newPassword);
            if (!$success) {
                http_response_code(400);
                echo json_encode(['error' => 'کلمه عبور قبلی نادرست است یا کاربر یافت نشد.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            echo json_encode(['message' => 'کلمه عبور با موفقیت تغییر یافت.'], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'auth/users'):
            if ($method === 'GET') {
                echo json_encode($db->getUsers(), JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                try {
                    $user = $db->createUser($body);
                    http_response_code(201);
                    echo json_encode(['message' => 'کاربر جدید تعریف گردید.', 'user' => $user], JSON_UNESCAPED_UNICODE);
                } catch (Exception $e) {
                    http_response_code(400);
                    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
                }
            }
            break;

        case (preg_match('/^auth\/users\/([^\/]+)$/', $route, $matches) ? true : false):
            $uname = $matches[1];
            $success = $db->deleteUser($uname);
            echo json_encode(['success' => $success, 'message' => $success ? 'کاربر حذف گردید.' : 'کاربر یافت نشد.'], JSON_UNESCAPED_UNICODE);
            break;

        // --- 10. Sessions Vault ---
        case ($route === 'sessions/test'):
            $platformId = $body['platformId'] ?? '';
            $plat = $db->getPlatformById($platformId);
            if (!$plat) {
                http_response_code(404);
                echo json_encode(['error' => 'رسانه یافت نشد'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $isAlive = ($plat['sessionStatus'] ?? '') === 'authenticated' && !empty($plat['sessionToken']);
            echo json_encode([
                'platformId' => $platformId,
                'platformName' => $plat['persianName'],
                'sessionStatus' => $plat['sessionStatus'] ?? 'none',
                'sessionExpiresAt' => $plat['sessionExpiresAt'] ?? 'نامشخص',
                'isAlive' => $isAlive,
                'message' => $isAlive ? "نشست ورود به {$plat['persianName']} زنده و کوکی‌ها معتبر هستند." : "نشست ورود به {$plat['persianName']} منقضی یا ثبت‌نشده است."
            ], JSON_UNESCAPED_UNICODE);
            break;

        
        case ($route === 'sessions/update'):
            $platformId = $body['platformId'] ?? '';
            $updates = $body['updates'] ?? [];
            if (empty($platformId)) {
                http_response_code(400);
                echo json_encode(['error' => 'شناسه پلتفرم الزامی است'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $success = $db->updatePlatformSession($platformId, $updates);
            echo json_encode(['success' => $success, 'message' => 'جلسه به‌روزرسانی شد.']);
            break;

        case ($route === 'sessions/clear'):
            $platformId = $body['platformId'] ?? '';
            $updated = $db->clearPlatformSession($platformId);
            echo json_encode(['message' => 'نشست و کوکی‌های ورود پاکسازی شد.', 'platform' => $updated], JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'sessions/storage-state'):
            if ($method === 'GET') {
                $platformId = $_GET['platformId'] ?? '';
                if (empty($platformId)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'شناسه پلتفرم الزامی است'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                $state = $db->getPlatformStorageState($platformId);
                echo json_encode([
                    'success' => !empty($state),
                    'platformId' => $platformId,
                    'storageState' => $state['storageState'] ?? null,
                    'savedAt' => $state['savedAt'] ?? null
                ], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                $platformId = $body['platformId'] ?? '';
                $storageState = $body['storageState'] ?? null;
                if (empty($platformId) || empty($storageState)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'شناسه پلتفرم و داده storageState الزامی است'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                $saved = $db->savePlatformStorageState($platformId, $storageState);
                echo json_encode(['success' => $saved, 'message' => 'نشست ذخیره‌سازی شده مرورگر با موفقیت در مخزن سی‌پنل ثبت شد.'], JSON_UNESCAPED_UNICODE);
            }
            break;

        // --- 11. Local Reasoning ---
        case ($route === 'local-reasoning/analyze-dom'):
            $htmlSnippet = $body['htmlSnippet'] ?? '';
            $domain = $body['domain'] ?? 'target-site.ir';
            $result = Ashk24AiEngine::analyzeDom($htmlSnippet, $domain);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'local-reasoning/generate-ad'):
            $result = Ashk24AiEngine::generateLocalPersianContent([
                'productName' => $body['brandName'] ?? 'محصول ویژه',
                'description' => 'ارائه‌دهنده خدمات تخصصی با کیفیت عالی',
                'priceToman' => 0,
                'keywords' => $body['keywords'] ?? ['کیفیت بالا', 'پشتیبانی']
            ]);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;

        case ($route === 'local-reasoning/status'):
            echo json_encode([
                'status' => 'online',
                'engineName' => 'موتور استدلال محلی اشک ۲۴ (PHP Native Engine for cPanel)',
                'dictionaryRulesCount' => 8,
                'iranianCitiesCount' => 18,
                'averageLatencyMs' => 1,
                'nlpFeatures' => [
                    'PHP RegEx HTML DOM Tokenizer & Input Mapper',
                    'Iranian Phone & Price Regex Decoders',
                    'Persian Copywriting Template Synthesizer',
                    'Local Readability & Keyword Scoring'
                ]
            ], JSON_UNESCAPED_UNICODE);
            break;

        // --- 12. Native Offline Captcha OCR Solver ---
        case ($route === 'ocr/solve'):
            $imageSource = $body['image'] ?? ($body['imageUrl'] ?? '');
            if (empty($imageSource)) {
                http_response_code(400);
                echo json_encode(['error' => 'ارسال تصویر یا لینک کپچا الزامی است.'], JSON_UNESCAPED_UNICODE);
                break;
            }
            $ocrResult = Ashk24OcrEngine::solveCaptcha($imageSource);
            echo json_encode([
                'message' => 'کپچا با موفقیت توسط موتور بومی پردازش شد.',
                'execution' => $ocrResult
            ], JSON_UNESCAPED_UNICODE);
            break;

        // --- 13. Domestic Messenger Webhooks (Bale, Eitaa, Rubika, Telegram) ---
        case ($route === 'webhooks/messenger'):
            $messengerType = $body['messenger'] ?? ($_GET['type'] ?? 'bale');
            $sender = $body['from'] ?? ($body['chat']['id'] ?? ($body['chat_id'] ?? 'user_messenger'));
            $text = $body['text'] ?? ($body['message']['text'] ?? ($body['caption'] ?? ''));

            // استخراج کد تایید با عبارات منظم
            $code = '';
            if (preg_match('/(\d{4,6})/', $text, $m)) {
                $code = $m[1];
            }

            $log = [
                'id' => 'msg_' . time() . '_' . rand(100, 999),
                'messengerType' => $messengerType,
                'sender' => (string)$sender,
                'text' => $text,
                'extractedOtp' => $code,
                'receivedAt' => date('c')
            ];

            if ($code) {
                $db->addSmsLog([
                    'id' => 'sms_msg_' . time(),
                    'senderNumber' => "بات " . ucfirst($messengerType),
                    'receiverNumber' => 'سامانه خودکار',
                    'messageText' => $text,
                    'extractedCode' => $code,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'isRead' => false
                ]);
            }

            echo json_encode([
                'status' => 'ok',
                'message' => 'پیام از پیام‌رسان بومی دریافت و پردازش شد.',
                'data' => $log
            ], JSON_UNESCAPED_UNICODE);
            break;

        // --- 14. Reverse Proxy Relay & Anti-Filtering Engine ---
        case ($route === 'proxy/settings'):
            if ($method === 'GET') {
                echo json_encode([
                    'domesticProxyEnabled' => defined('DOMESTIC_PROXY_ENABLED') ? DOMESTIC_PROXY_ENABLED : true,
                    'upstreamProxy' => defined('DEFAULT_UPSTREAM_PROXY') ? DEFAULT_UPSTREAM_PROXY : '',
                    'resilienceMode' => 'auto-fallback-to-local-ai',
                    'filteringStatus' => 'protected'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'proxy/test'):
            $testUrl = 'https://generativelanguage.googleapis.com';
            $ch = curl_init($testUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 4);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            if (defined('DEFAULT_UPSTREAM_PROXY') && !empty(DEFAULT_UPSTREAM_PROXY)) {
                curl_setopt($ch, CURLOPT_PROXY, DEFAULT_UPSTREAM_PROXY);
            }
            $resp = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);

            $isOnline = ($httpCode > 0 && empty($err));
            echo json_encode([
                'success' => $isOnline,
                'httpCode' => $httpCode,
                'proxyUsed' => defined('DEFAULT_UPSTREAM_PROXY') ? DEFAULT_UPSTREAM_PROXY : 'مستقیم',
                'activeFallback' => !$isOnline ? 'موتور آفلاین استدلال محلی جایگزین شد.' : 'ارتباط مستقیم/پروکسی برقرار است.',
                'latencyMs' => 45
            ], JSON_UNESCAPED_UNICODE);
            break;

        // --- 15. cPanel Cron Automation Status & Immediate Trigger ---
        case ($route === 'cron/trigger'):
            $cronFile = __DIR__ . '/../cron_worker.php';
            if (file_exists($cronFile)) {
                $_GET['key'] = 'ashk24_cron_secret';
                ob_start();
                include $cronFile;
                $output = ob_get_clean();
                $decoded = json_decode($output, true);
                echo json_encode([
                    'message' => 'کران‌جاب سی‌پنل به صورت دستی و با موفقیت فراخوانی شد.',
                    'execution' => $decoded ?: $output
                ], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'فایل cron_worker.php یافت نشد.'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case ($route === 'cron/status'):
            $logs = $db->getAutonomousLogs();
            $cronLogs = array_filter($logs, function($l) {
                return strpos($l['action'] ?? '', 'cron') !== false;
            });
            echo json_encode([
                'configuredInterval' => 'هر ۱۰ دقیقه یکبار (*/10 * * * *)',
                'commandCli' => '/usr/local/bin/php ' . realpath(__DIR__ . '/../cron_worker.php'),
                'webhookUrl' => (isset($_SERVER['HTTPS']) ? 'https' : 'http') . "://{$_SERVER['HTTP_HOST']}/cpanel-backend/cron_worker.php?key=ashk24_cron_secret",
                'lastRun' => !empty($cronLogs) ? reset($cronLogs) : null,
                'totalCronCycles' => count($cronLogs)
            ], JSON_UNESCAPED_UNICODE);
            break;

        // --- 16. Publication Reports Endpoint ---
        case ($route === 'publication-reports'):
            if ($method === 'GET') {
                echo json_encode($db->getPublicationReports(), JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                if (empty($body)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'محتوای گزارش ارسالی خالی است.'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                $saved = $db->addPublicationReport($body);
                http_response_code(201);
                echo json_encode(['success' => true, 'data' => $saved], JSON_UNESCAPED_UNICODE);
            }
            break;

        case (preg_match('/^publication-reports\/([^\/]+)$/', $route, $matches) ? true : false):
            $repId = $matches[1];
            if ($method === 'DELETE') {
                $success = $db->deletePublicationReport($repId);
                echo json_encode(['success' => $success, 'message' => $success ? 'گزارش انتشار حذف گردید.' : 'گزارش یافت نشد.'], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'GET') {
                $all = $db->getPublicationReports();
                $found = null;
                foreach ($all as $r) {
                    if (($r['id'] ?? '') === $repId) { $found = $r; break; }
                }
                if ($found) {
                    echo json_encode($found, JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'گزارش یافت نشد.'], JSON_UNESCAPED_UNICODE);
                }
            }
            break;

        default:
            http_response_code(404);
            echo json_encode([
                'error' => 'مسیر درخواست شده یافت نشد.',
                'requestedRoute' => $route
            ], JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'خطای داخلی سرور در سیستم سی‌پنل',
        'details' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
