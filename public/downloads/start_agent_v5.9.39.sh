#!/usr/bin/env bash
# ================================================================
# سامانه اتوماسیون و انتشار آگهی اشک ۲۴ (نسخه ۵.۸.۲۰)
# اجرای خودمختار ایجنت دسکتاپ محلی با Playwright
# ================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "================================================================"
echo "  🚀 سامانه اتوماسیون و انتشار آگهی اشک ۲۴ (نسخه ۵.۸.۲۰)"
echo "  🤖 ایجنت دسکتاپ محلی با مرورگر واقعی Chromium"
echo "================================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ [خطا] Node.js یافت نشد! لطفاً Node.js نسخه 18 یا بالاتر را نصب نمایید."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 [۱/۲] در حال نصب نیازمندی‌های Node.js..."
    npm install --no-audit
    echo "🌐 [۲/۲] در حال نصب مرورگر Chromium برای Playwright..."
    npx playwright install chromium
fi

export CPANEL_URL="${CPANEL_URL:-https://secret.ashkghalam.ir/cpanel-backend/api/index.php}"
export CPANEL_AGENT_TOKEN="${CPANEL_AGENT_TOKEN:-secret_9153108763}"

echo "✅ اتصال به سرور: $CPANEL_URL"
echo "🚀 ایجنت با موفقیت شروع به کار کرد..."
echo ""

node index.js
