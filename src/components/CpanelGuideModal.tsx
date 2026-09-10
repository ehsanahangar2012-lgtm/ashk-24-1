import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  Copy,
  Check,
  FileCode,
  AlertTriangle,
  ShieldCheck,
  Download,
  RefreshCw,
  Globe,
  HelpCircle,
  Laptop,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Cpu,
  Database,
  Layers,
  FolderDown,
  Clock,
} from 'lucide-react';
import { ServerDiagnosticReport, ServerDiagnosticItem } from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';

interface CpanelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CpanelGuideModal: React.FC<CpanelGuideModalProps> = ({ isOpen, onClose }) => {
  const [modalTab, setModalTab] = useState<'diagnostics' | 'guide_3step' | 'files_code' | 'cpanel_cron'>('diagnostics');
  const [copiedHtaccess, setCopiedHtaccess] = useState(false);
  const [copiedCronCmd, setCopiedCronCmd] = useState(false);
  const [copiedPhpIni, setCopiedPhpIni] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Diagnostic State
  const [diagnosticReport, setDiagnosticReport] = useState<ServerDiagnosticReport | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const report = await clientStorage.runServerDiagnostics();
      setDiagnosticReport(report);
    } catch (e) {
      console.error('Error running diagnostics:', e);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const htaccessCode = `# ================================================================
# Ashk 24 - Standard cPanel Apache Configuration (.htaccess)
# 100% Native PHP 8.x & Single Page Application (SPA) Routing
# ================================================================

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  Options -Indexes

  # Route /api/* requests to pure PHP backend router
  RewriteRule ^api/(.*)$ cpanel-backend/api/index.php?route=$1 [QSA,L]

  # Allow direct access to uploaded media assets
  RewriteRule ^uploads/(.*)$ cpanel-backend/uploads/$1 [L]

  # SPA Routing Fallback: redirect all other paths to index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} !^/cpanel-backend/
  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_mime.c>
  AddType application/javascript .js .mjs
  AddType text/css .css
  AddType image/svg+xml .svg
  AddType application/json .json
</IfModule>

# Security & CORS Headers for cPanel
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
</IfModule>`;

  const cronCommand = `/usr/local/bin/php /home/USER_NAME/public_html/cpanel-backend/cron_worker.php >/dev/null 2>&1`;

  const phpIniCode = `; cPanel PHP 8.1+ Recommended Settings (php.ini)
upload_max_filesize = 64M
post_max_size = 64M
memory_limit = 256M
max_execution_time = 300
allow_url_fopen = On
extension = curl
extension = mbstring
extension = pdo_mysql
extension = pdo_sqlite`;

  const handleCopy = (text: string, type: 'htaccess' | 'cron' | 'phpini') => {
    navigator.clipboard.writeText(text);
    if (type === 'htaccess') {
      setCopiedHtaccess(true);
      setTimeout(() => setCopiedHtaccess(false), 2000);
    } else if (type === 'cron') {
      setCopiedCronCmd(true);
      setTimeout(() => setCopiedCronCmd(false), 2000);
    } else {
      setCopiedPhpIni(true);
      setTimeout(() => setCopiedPhpIni(false), 2000);
    }
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(cmd);
    setTimeout(() => setCopiedCommand(null), 2500);
  };

  const handleDownloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 font-sans overflow-y-auto" dir="rtl">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6 my-6 max-h-[90vh] overflow-y-auto text-right">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>مرکز استقرار و پیکربندی هاست استاندارد cPanel</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  PHP 8.x / بدون نیاز به Node.js
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                راهنمای استقرار روی هاست‌های اشتراکی ایران، پیکربندی فایل .htaccess و کران‌جاب‌های خودکار
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
          >
            بستن ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs">
          <button
            onClick={() => setModalTab('diagnostics')}
            className={`flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 rounded-xl font-semibold transition-all ${
              modalTab === 'diagnostics'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>پایش خودکار سلامت هاست (Diagnostics)</span>
          </button>

          <button
            onClick={() => setModalTab('guide_3step')}
            className={`flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 rounded-xl font-semibold transition-all ${
              modalTab === 'guide_3step'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>راهنمای ۳ مرحله‌ای استقرار در cPanel</span>
          </button>

          <button
            onClick={() => setModalTab('files_code')}
            className={`flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 rounded-xl font-semibold transition-all ${
              modalTab === 'files_code'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>فایل‌های `.htaccess` و تنظیمات PHP</span>
          </button>

          <button
            onClick={() => setModalTab('cpanel_cron')}
            className={`flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 rounded-xl font-semibold transition-all ${
              modalTab === 'cpanel_cron'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>تنظیم کران‌جاب سی‌پنل (Cron Jobs)</span>
          </button>
        </div>

        {/* TAB 1: AUTOMATED DIAGNOSTIC SUITE */}
        {modalTab === 'diagnostics' && (
          <div className="space-y-5">
            {/* Top Diagnostic Banner */}
            <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              diagnosticReport?.overallStatus === 'healthy'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : diagnosticReport?.overallStatus === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-start space-x-3 space-x-reverse">
                {diagnosticReport?.overallStatus === 'healthy' ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : diagnosticReport?.overallStatus === 'warning' ? (
                  <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {diagnosticReport?.overallStatus === 'healthy'
                      ? 'زیرساخت هاست cPanel و سرویس‌های پشتیبان کاملاً سالم و آماده هستند'
                      : diagnosticReport?.overallStatus === 'warning'
                      ? 'سامانه در حالت هاست معمولی فعال است (برخی ماژول‌ها نیازمند بررسی جزئی هستند)'
                      : 'ارتباط با برخی اسکریپت‌های هاست نیازمند تنظیم مجدد است'}
                  </div>
                  <p className="text-xs opacity-90 mt-1 leading-relaxed">
                    حالت زیرساخت: <strong className="font-bold">{diagnosticReport?.runtimeMode === 'server' ? 'سرور استاندارد cPanel PHP' : 'حالت هاست معمولی و آفلاین محلی (Local Vault)'}</strong> | پورت‌های فعال: <span className="font-mono">{diagnosticReport?.openPorts.join(', ') || '80, 443'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={runDiagnostics}
                disabled={isRunningDiagnostics}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shrink-0 flex items-center justify-center space-x-1.5 space-x-reverse border border-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                <span>{isRunningDiagnostics ? 'در حال پایش...' : 'اجرای مجدد عیب‌یابی'}</span>
              </button>
            </div>

            {/* Diagnostic Items Checklist */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2 space-x-reverse">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>نتایج بررسی ۵ گانه زیرساخت cPanel و آپاچی:</span>
              </h3>

              <div className="space-y-2.5">
                {(diagnosticReport?.items || []).map((item) => {
                  const isPassed = item.status === 'passed';
                  const isWarning = item.status === 'warning';
                  const isFailed = item.status === 'failed';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                        isPassed
                          ? 'bg-slate-950 border-emerald-500/20'
                          : isWarning
                          ? 'bg-slate-950 border-amber-500/30'
                          : 'bg-slate-950 border-rose-500/30'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 space-x-reverse font-bold">
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : isWarning ? (
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span className="text-slate-100">{item.title}</span>
                        </div>

                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            isPassed
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isWarning
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isPassed ? 'تایید شد ✓' : isWarning ? 'هشدار پیکربندی' : 'نیاز به اقدام ✗'}
                        </span>
                      </div>

                      <p className="text-slate-400 text-[11px] leading-relaxed pr-6">
                        {item.details}
                      </p>

                      {item.recommendation && (
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-amber-300 space-y-1.5 mr-6">
                          <div className="font-bold flex items-center space-x-1.5 space-x-reverse">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>راهکار پیشنهادی:</span>
                          </div>
                          <p className="text-slate-300 leading-relaxed">{item.recommendation}</p>
                          {item.actionCommand && (
                            <div className="flex items-center justify-between pt-1 font-mono text-[10px] bg-slate-950 p-2 rounded-lg text-slate-200" dir="ltr">
                              <span className="truncate">{item.actionCommand}</span>
                              <button
                                onClick={() => handleCopyCommand(item.actionCommand!)}
                                className="text-amber-400 hover:text-amber-300 font-sans font-bold text-[10px] mr-2 shrink-0 flex items-center gap-1"
                              >
                                {copiedCommand === item.actionCommand ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedCommand === item.actionCommand ? 'کپی شد' : 'کپی'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 3-STEP CPANEL GUIDE */}
        {modalTab === 'guide_3step' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center space-x-2 space-x-reverse">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>مراحل ۳ گانه‌ استقرار سریع بر روی هاست cPanel معمولی:</span>
            </h3>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                    ۱
                  </span>
                  <span className="text-xs font-bold text-slate-100">آپلود فایل‌های برنامه در پوشه `public_html`</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside pr-7 leading-relaxed">
                  <li>وارد File Manager هاست cPanel خود شوید.</li>
                  <li>به مسیر <code className="text-amber-400 font-mono">public_html</code> (یا ساب‌دامین مدنظرتان) بروید.</li>
                  <li>تمام فایل‌های خروجی ساخت فرانت‌اند (محتویات پوشه dist شامل index.html و assets) را مستقیماً داخل public_html آپلود و Extract کنید.</li>
                  <li>پوشه <code className="text-amber-400 font-mono">cpanel-backend</code> را نیز بدون تغییر در کنار index.html قرار دهید.</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                      ۲
                    </span>
                    <span className="text-xs font-bold text-slate-100">تنظیم فایل `.htaccess` جهت مسیریابی خودکار</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadFile(htaccessCode, '.htaccess')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center space-x-1 space-x-reverse"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>دانلود `.htaccess`</span>
                    </button>
                    <button
                      onClick={() => handleCopy(htaccessCode, 'htaccess')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center space-x-1 space-x-reverse"
                    >
                      {copiedHtaccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{copiedHtaccess ? 'کپی شد' : 'کپی کد'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  فایل <code className="text-amber-400 font-mono">.htaccess</code> را در ریشه <code className="text-amber-400 font-mono">public_html</code> قرار دهید تا درخواست‌های فرانت‌اند و APIهای PHP به طور خودکار به مسیرهای صحیح هدایت شوند.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                    ۳
                  </span>
                  <span className="text-xs font-bold text-slate-100">تنظیم دسترسی پوشه آپلودها (Permissions)</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside pr-7 leading-relaxed">
                  <li>روی پوشه <code className="text-amber-400 font-mono">cpanel-backend/uploads</code> در cPanel راست‌کلیک کرده و گزینه <strong>Change Permissions</strong> را بزنید.</li>
                  <li>دسترسی آن را روی <code className="text-emerald-400 font-mono">755</code> یا <code className="text-emerald-400 font-mono">777</code> بگذارید تا ذخیره‌سازی تصاویر آگهی و فایل‌های PDF با موفقیت انجام شود.</li>
                  <li>نسخه PHP هاست را در بخش <strong>Select PHP Version</strong> روی <code className="text-emerald-400 font-mono">PHP 8.1 یا بالاتر</code> قرار دهید.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CODE FILES (.HTACCESS & PHP CONFIG) */}
        {modalTab === 'files_code' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100">فایل پیکربندی آپاچی (`.htaccess`)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile(htaccessCode, '.htaccess')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center space-x-1 space-x-reverse"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>دانلود `.htaccess`</span>
                  </button>
                  <button
                    onClick={() => handleCopy(htaccessCode, 'htaccess')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center space-x-1 space-x-reverse"
                  >
                    {copiedHtaccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{copiedHtaccess ? 'کپی شد' : 'کپی کد'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto text-left" dir="ltr">
                {htaccessCode}
              </pre>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100">تنظیمات پیشنهادی PHP (`php.ini`)</span>
                <button
                  onClick={() => handleCopy(phpIniCode, 'phpini')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center space-x-1 space-x-reverse"
                >
                  {copiedPhpIni ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedPhpIni ? 'کپی شد' : 'کپی تنظیمات'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto text-left" dir="ltr">
                {phpIniCode}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: CPANEL CRON JOBS */}
        {modalTab === 'cpanel_cron' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
              <div className="font-bold text-sm flex items-center space-x-2 space-x-reverse text-emerald-200">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span>تنظیم وظایف زمانبندی شده (Cron Jobs) در cPanel</span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                برای فعال‌سازی منشی ۲۴ ساعته، پایش خودکار انتشار و تمدید دوره‌ای آگهی‌ها در پس‌زمینه بدون نیاز به باز بودن مرورگر، کران‌جاب زیر را در بخش <strong>Cron Jobs</strong> هاست خود ثبت کنید:
              </p>
              
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold text-amber-400">دستور کران جاب (اجرا هر ۵ دقیقه):</span>
                  <button
                    onClick={() => handleCopy(cronCommand, 'cron')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center space-x-1 space-x-reverse"
                  >
                    {copiedCronCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{copiedCronCmd ? 'کپی شد' : 'کپی دستور'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-200 overflow-x-auto text-left" dir="ltr">
                  {cronCommand}
                </div>
                <p className="text-[10px] text-slate-400">
                  * توجه: به جای عبارت <code className="text-amber-400">USER_NAME</code> نام کاربری اکانت cPanel خود را قرار دهید.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
