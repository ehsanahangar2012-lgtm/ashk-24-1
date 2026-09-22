<?php
/**
 * Ashk 24 - Public Post View Renderer
 * Displays published classified ads and marketing posts in clean Persian RTL layout.
 */

header('Content-Type: text/html; charset=utf-8');

$postId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['id'] ?? '');

if (empty($postId)) {
    http_response_code(400);
    echo '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>شناسه نامعتبر</title></head><body style="font-family:Tahoma,sans-serif;text-align:center;padding:50px;"><h2>شناسه آگهی ارسال نشده است.</h2></body></html>';
    exit;
}

$candidates = [
    __DIR__ . '/published_posts/post_' . $postId . '.json',
    __DIR__ . '/cpanel-backend/published_posts/post_' . $postId . '.json',
    dirname(__DIR__) . '/cpanel-backend/published_posts/post_' . $postId . '.json',
    dirname(__DIR__) . '/published_posts/post_' . $postId . '.json'
];

$postData = null;
foreach ($candidates as $candidate) {
    if (file_exists($candidate)) {
        $content = file_get_contents($candidate);
        $postData = json_decode($content, true);
        if ($postData) break;
    }
}

if (!$postData) {
    http_response_code(404);
    echo '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>آگهی یافت نشد</title></head><body style="font-family:Tahoma,sans-serif;text-align:center;padding:50px;"><h2>آگهی مورد نظر در سامانه یافت نشد یا منقضی گردیده است.</h2></body></html>';
    exit;
}

$title = htmlspecialchars($postData['title'] ?? 'آگهی جدید', ENT_QUOTES, 'UTF-8');
$category = htmlspecialchars($postData['category'] ?? 'عمومی', ENT_QUOTES, 'UTF-8');
$author = htmlspecialchars($postData['author'] ?? 'اشک قلم', ENT_QUOTES, 'UTF-8');
$date = htmlspecialchars($postData['publishedDate'] ?? date('Y-m-d'), ENT_QUOTES, 'UTF-8');
$content = nl2br(htmlspecialchars($postData['content'] ?? '', ENT_QUOTES, 'UTF-8'));
$imageUrl = htmlspecialchars($postData['imageUrl'] ?? '', ENT_QUOTES, 'UTF-8');
$phone = '09153108763';
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $title; ?> | سامانه اشک ۲۴</title>
    <meta name="description" content="<?php echo mb_substr(strip_tags($postData['content'] ?? ''), 0, 160); ?>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, Tahoma, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            line-height: 1.8;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #ffffff;
            padding: 32px 24px;
            text-align: right;
        }
        .badge {
            display: inline-block;
            background-color: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.4);
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 12px;
        }
        .title {
            font-size: 24px;
            font-weight: 800;
            line-height: 1.4;
            margin-bottom: 12px;
        }
        .meta {
            display: flex;
            gap: 16px;
            font-size: 13px;
            color: #94a3b8;
            flex-wrap: wrap;
        }
        .meta-item { display: flex; align-items: center; gap: 6px; }
        .body-content {
            padding: 32px 24px;
        }
        .image-preview {
            width: 100%;
            max-height: 420px;
            object-fit: cover;
            border-radius: 12px;
            margin-bottom: 24px;
            border: 1px solid #e2e8f0;
        }
        .ad-text {
            font-size: 16px;
            color: #334155;
            white-space: pre-line;
            margin-bottom: 32px;
        }
        .contact-box {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
        }
        .contact-info { display: flex; flex-direction: column; gap: 4px; }
        .contact-label { font-size: 13px; color: #64748b; font-weight: 500; }
        .contact-phone { font-size: 20px; font-weight: 800; color: #0f172a; direction: ltr; text-align: right; }
        .call-btn {
            background-color: #10b981;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 15px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        .call-btn:hover { background-color: #059669; transform: translateY(-1px); }
        .verification-footer {
            background-color: #f1f5f9;
            padding: 16px 24px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        .verified-stamp {
            color: #10b981;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <span class="badge"><?php echo $category; ?></span>
            <h1 class="title"><?php echo $title; ?></h1>
            <div class="meta">
                <span class="meta-item">👤 ناشر: <?php echo $author; ?></span>
                <span class="meta-item">📅 تاریخ درج: <?php echo $date; ?></span>
                <span class="meta-item">🆔 شناسه: <?php echo $postId; ?></span>
            </div>
        </header>

        <main class="body-content">
            <?php if (!empty($imageUrl)): ?>
                <img src="<?php echo $imageUrl; ?>" alt="<?php echo $title; ?>" class="image-preview" />
            <?php endif; ?>

            <div class="ad-text"><?php echo $content; ?></div>

            <div class="contact-box">
                <div class="contact-info">
                    <span class="contact-label">اطلاعات تماس و سفارش</span>
                    <span class="contact-phone"><?php echo $phone; ?></span>
                </div>
                <a href="tel:<?php echo $phone; ?>" class="call-btn">
                    📞 تماس مستقیم با واحد فروش
                </a>
            </div>
        </main>

        <footer class="verification-footer">
            <span class="verified-stamp">✓ تایید و منتشر شده توسط سامانه اتوماسیون اشک ۲۴</span>
            <span>صنایع چاپ و بسته‌بندی کارتن و هاردباکس اشک قلم مشهد</span>
        </footer>
    </div>
</body>
</html>
