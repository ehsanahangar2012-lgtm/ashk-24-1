import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Download,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  Globe,
  Radio,
  ExternalLink,
  Laptop,
  HelpCircle,
  RefreshCw,
  FolderDown,
  Layers
} from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';
import { APP_VERSION } from '../config/version';
import { downloadLocalAgentPackage, downloadTextContent } from '../utils/clientDownloadHelper';

interface LocalAgentDashboardModuleProps {
  cpanelUrl?: string;
  agentToken?: string;
}

export const LocalAgentDashboardModule: React.FC<LocalAgentDashboardModuleProps> = ({
  cpanelUrl = typeof window !== 'undefined' ? `${window.location.origin}/cpanel-backend/api/index.php` : 'https://secret.ashkghalam.ir/cpanel-backend/api/index.php',
  agentToken = 'secret_9153108763'
}) => {
  const [configuredUrl, setConfiguredUrl] = useState<string>(cpanelUrl);
  const [configuredToken, setConfiguredToken] = useState<string>(agentToken);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string; timestamp?: string } | null>(null);

  // Sync configuredUrl if cpanelUrl prop changes
  useEffect(() => {
    if (cpanelUrl && !configuredUrl) {
      setConfiguredUrl(cpanelUrl);
    }
  }, [cpanelUrl]);

  const handleCopy = (text: string, sectionId: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2500);
    } catch (e) {}
  };

  const handleTestOrchestratorPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const cleanUrl = configuredUrl.replace(/\/$/, '');
      const testEndpoint = cleanUrl.includes('?') 
        ? `${cleanUrl}&route=orchestrator/heartbeat`
        : `${cleanUrl}?route=orchestrator/heartbeat`;

      const res = await fetch(testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${configuredToken}`
        },
        body: JSON.stringify({
          agentId: 'dashboard_ui_probe',
          channelType: 'desktop_agent',
          ping: true,
          timestamp: new Date().toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPingResult({
          success: true,
          message: 'اتصال به وب‌سرویس هاست با موفقیت برقرار شد. صف وظایف آماده دریافت توسط ایجنت محلی است.',
          timestamp: new Intl.DateTimeFormat('fa-IR', { timeStyle: 'medium', dateStyle: 'short' }).format(new Date())
        });
      } else {
        setPingResult({
          success: false,
          message: `پاسخ وب‌سرویس: کد وضعیت HTTP ${res.status}. لطفاً آدرس سرور را بررسی نمایید.`,
          timestamp: new Intl.DateTimeFormat('fa-IR', { timeStyle: 'medium', dateStyle: 'short' }).format(new Date())
        });
      }
    } catch (err: any) {
      setPingResult({
        success: false,
        message: `عدم امکان دسترسی به سرور: ${err.message || 'خطای شبکه'}. در صورتی که هاست آنلاین است، ایجنت محلی با باز کردن مستقیم سوکت وظایف را تحویل می‌گیرد.`,
        timestamp: new Intl.DateTimeFormat('fa-IR', { timeStyle: 'medium', dateStyle: 'short' }).format(new Date())
      });
    } finally {
      setIsPinging(false);
    }
  };

  // Generate dynamic 1-click batch script for Windows
  const generateBatScript = () => {
    return `@echo off
title Ashk24 Local Desktop Agent (Playwright)
color 0A

echo ================================================================
echo   Ashk24 Autonomous Agent / Cloud Worker (v${APP_VERSION})
echo   Real-time Playwright Browser Engine
echo ================================================================
echo.

node --version >nul 2>&1
if errorlevel 1 goto ERROR_NODE

cd /d "%~dp0"

if exist "local-agent\\index.js" cd "local-agent"

if not exist "index.js" goto ERROR_NO_INDEX

if not exist "node_modules" goto INSTALL_DEPS

goto RUN_AGENT


:ERROR_NODE
color 0C
echo [ERROR] Node.js is not installed on this system!
echo Please download and install Node.js from: https://nodejs.org
echo.
pause
exit /b 1


:ERROR_NO_INDEX
color 0C
echo [ERROR] Cannot find index.js!
echo Current directory: "%cd%"
echo Please make sure this script is placed in the project root or inside the local-agent folder.
echo.
pause
exit /b 1


:INSTALL_DEPS
echo [1/2] Installing Node.js packages (First-time run only)...
call npm install --no-audit
echo.
echo [2/2] Installing dedicated Playwright Chromium browser...
call npx playwright install chromium
echo.
goto RUN_AGENT


:RUN_AGENT
if "%CPANEL_URL%"=="" set CPANEL_URL=${configuredUrl}
if "%CPANEL_AGENT_TOKEN%"=="" set CPANEL_AGENT_TOKEN=${configuredToken}
set HEADLESS=false

echo [OK] Connected Orchestrator: %CPANEL_URL%
echo [OK] Security Token: %CPANEL_AGENT_TOKEN%
echo [OK] Mode: Local Domestic IP Execution
echo.
echo ----------------------------------------------------------------
echo   Agent is active and listening for new jobs autonomously.
echo   Do not close this window. To stop, press Ctrl+C.
echo ----------------------------------------------------------------
echo.

node index.js

pause
`;
  };

  // Generate dynamic 1-click bash script for Linux/macOS
  const generateShScript = () => {
    return `#!/usr/bin/env bash
# ================================================================
# سامانه اتوماسیون و انتشار آگهی اشک ۲۴ (نسخه ${APP_VERSION})
# اجرای خودمختار ایجنت دسکتاپ محلی با Playwright
# ================================================================

set -e
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "================================================================"
echo "  🚀 سامانه اتوماسیون و انتشار آگهی اشک ۲۴ (نسخه ${APP_VERSION})"
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

export CPANEL_URL="${configuredUrl}"
export CPANEL_AGENT_TOKEN="${configuredToken}"

echo "✅ اتصال به سرور: $CPANEL_URL"
echo "🚀 ایجنت با موفقیت شروع به کار کرد..."
echo ""

node index.js
`;
  };

  const [isDownloadingAgentZip, setIsDownloadingAgentZip] = useState(false);

  const handleDownloadAgentZip = async () => {
    setIsDownloadingAgentZip(true);
    try {
      await downloadLocalAgentPackage(APP_VERSION);
    } catch (e) {
      console.warn('Local agent package download error:', e);
    } finally {
      setIsDownloadingAgentZip(false);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    downloadTextContent(filename, content);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Terminal className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">ایجنت خودمختار دسکتاپ (Local Autonomous Desktop Agent)</h2>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                نسخه {APP_VERSION}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              اجرای ۱-کلیک مرورگر واقعی Chromium روی سیستم شما با IP بومی ایران، بدون فایروال هاست و ارسال ۱۰۰٪ تضمینی پیامک
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SmartHelpButton
            content={{
              title: 'راهنمای هوشمند ایجنت دسکتاپ محلی (Playwright)',
              summary: 'ایجنت محلی با باز کردن مرورگر واقعی Chromium روی سیستم شما با IP بومی ایران، بدون مشکل فایروال هاست (HTTP 0) پیامک‌ها را دریافت و فرم‌ها را با ۱ کلیک ثبت می‌کند.',
              steps: [
                'نرم‌افزار رایگان Node.js نسخه 18 یا بالاتر را نصب کنید.',
                'دکمه «دانلود start_agent.bat» را بزنید و در پوشه local-agent قرار دهید.',
                'روی start_agent.bat دابل‌کلیک کنید تا به صورت خودکار پکیج‌ها نصب شده و به هاست متصل شود.'
              ],
              offlineNote: 'ایجنت بدون نیاز به اینترنت بین‌الملل و با ترافیک تماماً داخلی شبکه ملی اطلاعات اجرا می‌شود.'
            }}
          />
          <button
            onClick={handleTestOrchestratorPing}
            disabled={isPinging}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
            <span>تست اتصال به ارکستریتور</span>
          </button>
        </div>
      </div>

      {/* Ping Status Alert if Tested */}
      {pingResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-all ${
            pingResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}
        >
          {pingResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold mb-1">{pingResult.message}</div>
            <div className="text-[10px] text-slate-400">زمان بررسی: {pingResult.timestamp}</div>
          </div>
        </div>
      )}

      {/* 3-Step Quick Launch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1 */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-3xl font-black text-slate-800 group-hover:text-emerald-500/20 absolute -left-2 -bottom-2 transition-colors">
            ۰۱
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-sm">
              ۱
            </div>
            <h3 className="font-bold text-slate-200 text-sm">نصب اولیه Node.js</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            در صورتی که Node.js روی سیستم شما نصب نیست، نسخه LTS را از سایت رسمی دانلود و با زدن Next نصب نمایید.
          </p>
          <a
            href="https://nodejs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold transition-all"
          >
            <span>دانلود رایگان Node.js LTS</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900/90 border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all shadow-lg shadow-emerald-950/20">
          <div className="text-3xl font-black text-slate-800 group-hover:text-emerald-500/20 absolute -left-2 -bottom-2 transition-colors">
            ۰۲
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
              ۲
            </div>
            <h3 className="font-bold text-slate-200 text-sm">دانلود اسکریپت ۱-کلیک</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            فایل اجرایی از پیش کانفیگ‌شده با آدرس هاست و توکن شما را مستقیماً با یک کلیک دریافت کنید.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadFile(`start_agent_v${APP_VERSION}.bat`, generateBatScript())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود start_agent_v{APP_VERSION}.bat (ویندوز)</span>
            </button>
            <button
              onClick={() => downloadFile(`start_agent_v${APP_VERSION}.sh`, generateShScript())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود start_agent_v{APP_VERSION}.sh (لینوکس/مک)</span>
            </button>
            <button
              onClick={handleDownloadAgentZip}
              disabled={isDownloadingAgentZip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/90 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              <FolderDown className={`w-3.5 h-3.5 ${isDownloadingAgentZip ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingAgentZip ? 'در حال آماده‌سازی...' : `دانلود پکیج کامل زیپ ایجنت (v${APP_VERSION})`}</span>
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-3xl font-black text-slate-800 group-hover:text-emerald-500/20 absolute -left-2 -bottom-2 transition-colors">
            ۰۳
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
              ۳
            </div>
            <h3 className="font-bold text-slate-200 text-sm">دابل‌کلیک و شروع خودمختار</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            فایل را در پوشه <code className="text-amber-300 font-mono text-[11px]">local-agent</code> پروژه قرار دهید و روی آن دابل‌کلیک کنید تا مرورگر باز شده و صف را اجرا کند.
          </p>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>بدون نیاز به تنظیمات پیچیده یا دانش برنامه‌نویسی</span>
          </div>
        </div>
      </div>

      {/* Configuration & Manual Terminal Runner */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-slate-200 text-sm">تنظیمات اتصال ایجنت محلی به ارکستریتور هاست</h3>
          </div>
          <span className="text-xs text-slate-400">امکان تغییر آدرس سرور یا اجرای دستی در ترمینال</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">آدرس API سرور سی‌پنل (Orchestrator URL):</label>
            <input
              type="text"
              value={configuredUrl}
              onChange={(e) => setConfiguredUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono direction-ltr text-left focus:border-emerald-500 outline-none"
              placeholder="https://your-domain.com/cpanel-backend/api/index.php"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">توکن احراز هویت ایجنت (Agent Security Token):</label>
            <input
              type="text"
              value={configuredToken}
              onChange={(e) => setConfiguredToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono direction-ltr text-left focus:border-emerald-500 outline-none"
              placeholder="secret_9153108763"
            />
          </div>
        </div>

        {/* Terminal Run Command Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 relative group">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-2 mb-2">
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>دستور اجرای دستی در ترمینال یا CMD:</span>
            </span>
            <button
              onClick={() => handleCopy(`cd local-agent\nnpm install\nnode index.js`, 'cmd')}
              className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              {copiedSection === 'cmd' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی دستورات</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-emerald-400 direction-ltr text-left overflow-x-auto py-1">
{`cd local-agent
npm install
node index.js`}
          </pre>
        </div>
      </div>

      {/* Comparison & Architecture Advantage */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2.5 mb-4">
          <Layers className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-slate-200 text-sm">چرا ایجنت محلی بهترین و پایدارترین راهکار انتشار است؟</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="font-bold text-emerald-400 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>حل مشکل پیامک و فایروال (HTTP 0)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              هاست‌های سی‌پنل اشتراکی به دلیل بسته بودن پورت‌های خروجی نمی‌توانند پیامک بفرستند؛ اما ایجنت محلی از بستر شبکه واقعی سیستم شما درخواست را ارسال می‌کند.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="font-bold text-blue-400 flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4" />
              <span>آی‌پی ۱۰۰٪ بومی ایران</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              سایت‌هایی مانند دیوار، شیپور، نیازمشهد و پیام‌سرا آی‌پی‌های سرورهای خارجی را بلاک می‌کنند. ایجنت محلی با آی‌پی اینترنت ایران بدون هیچ‌گونه بلاک اجرا می‌شود.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="font-bold text-amber-400 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>مدیریت هوشمند سشن و کپچا</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              ایجنت سشن‌های لاگین موفق را ذخیره کرده و در مراجعات بعدی بدون نیاز به ارسال مجدد کد پیامکی آگهی‌ها را ثبت می‌کند.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
