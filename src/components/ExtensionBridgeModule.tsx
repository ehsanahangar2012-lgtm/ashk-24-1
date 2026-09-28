import React, { useState, useEffect } from 'react';
import {
  Puzzle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  Send,
  Download,
  Power,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Zap,
  Globe,
  Layers,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { extensionBridge, ExtensionWorkerStatus } from '../utils/extensionBridge';
import { APP_VERSION } from '../config/version';
import { toPersianDigits } from '../utils/persianUtils';
import { SmartHelpButton } from './SmartHelpModal';

interface ExtensionBridgeModuleProps {
  onOpenHarvesterModal?: () => void;
}

export const ExtensionBridgeModule: React.FC<ExtensionBridgeModuleProps> = ({
  onOpenHarvesterModal
}) => {
  const [status, setStatus] = useState<ExtensionWorkerStatus>(extensionBridge.getStatus());
  const [logs, setLogs] = useState<Array<{ id: string; time: string; msg: string; type: 'info' | 'success' | 'warn' }>>([]);
  const [testOtp, setTestOtp] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    addLog('لوله ارتباطی اشک ۲۴ با افزونه مرورگر مقداردهی اولیه شد.', 'info');

    const unsubscribe = extensionBridge.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    const handleWindowMsg = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'ASHK_SESSION_HARVESTED') {
        addLog(`سشن جدید با موفقیت از دامنه ${e.data.domain} شکار و همگام شد.`, 'success');
      }
      if (e.data.type === 'ASHK_TARGET_PROGRESS') {
        addLog(`ورکر در حال پردازش: ${e.data.target?.persianName || e.data.target?.domain} (${e.data.target?.currentStepMessage || ''})`, 'info');
      }
      if (e.data.type === 'ASHK_EXTENSION_STATUS_REPLY') {
        addLog(`پاسخ تایید وضعیت از افزونه دریافت شد (نسخه: ${e.data.version || `v${APP_VERSION}`}).`, 'success');
      }
    };

    window.addEventListener('message', handleWindowMsg);

    return () => {
      unsubscribe();
      window.removeEventListener('message', handleWindowMsg);
    };
  }, []);

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString('fa-IR'),
        msg,
        type
      },
      ...prev.slice(0, 40)
    ]);
  };

  const handlePing = () => {
    addLog('در حال ارسال پالس ارتباطی (Ping) به لوله PostMessage / CustomEvent...', 'info');
    extensionBridge.sendPing();
  };

  const handleToggleWorker = () => {
    const nextState = !status.isWorkerEnabled;
    extensionBridge.toggleWorker(nextState);
    addLog(nextState ? 'دستور فعال‌سازی ورکر خودمختار صادر شد.' : 'دستور تعلیق ورکر صادر شد.', 'warn');
  };

  const handleSendTestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testOtp.trim()) return;
    extensionBridge.sendOtpCode(testOtp.trim());
    addLog(`کد تایید پیامکی [${testOtp.trim()}] به صفحه و لایه ورکر تزریق شد.`, 'success');
    setTestOtp('');
  };

  const handleHarvestActiveTab = () => {
    addLog('درخواست شکار فوری سشن تب فعال به افزونه ارسال گردید.', 'info');
    extensionBridge.triggerHarvestActiveTab();
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const filename = `ashk24-extension-v${APP_VERSION}.zip`;
      let res = await fetch(`/downloads/${filename}`);
      if (!res.ok) res = await fetch('/downloads/ashk24-extension-latest.zip');

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLog(`فایل فشرده افزونه (${filename}) با موفقیت دانلود شد.`, 'success');
      }
    } catch (e) {
      addLog('خطا در دانلود پکیج افزونه.', 'warn');
    } finally {
      setIsDownloading(false);
    }
  };

  const isConnected = status.installed;
  const isWorkerActive = status.installed && status.isWorkerEnabled;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse text-sky-400 text-xs font-semibold mb-1">
            <Radio className="w-4 h-4" />
            <span>پل ارتباطی دوطرفه مرورگر (Browser Extension Bridge)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100">
            لوله ارتباطی و وضعیت ورکر افزونه مرورگر
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            مدیریت تبادل داده‌های ثبت‌نام، رله خودکار کدهای OTP پیامکی، استخراج سشن‌ها و نظارت بر کارگر مرورگر.
          </p>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse self-start md:self-auto">
          <SmartHelpButton
            content={{
              title: 'لوله ارتباطی و کنترل ورکر افزونه',
              summary: 'این ماژول ارتباط زنده مرورگر با افزونه اشک ۲۴ را از طریق کانال‌های PostMessage، CustomEvent و BroadcastChannel پایش می‌کند.',
              steps: [
                'اگر وضعیت افزونه «قطع ارتباط» است، پکیج v4.8.3 را دانلود و در مرورگر بارگذاری کنید.',
                'برای تست ارسال خودکار کدهای تایید، از بخش «ارسال دستی کد OTP» استفاده کنید.',
                'وضعیت لاگ‌های زنده پایین صفحه تمام کنش‌های ورکر را ثبت می‌کند.'
              ],
              offlineNote: 'سیستم لوله ارتباطی کاملاً محلی و درون مرورگر کاربر کار می‌کند و نیازی به اینترنت بین‌الملل ندارد.'
            }}
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Status Card & Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className={`p-5 rounded-2xl border transition-all ${
            isWorkerActive
              ? 'bg-slate-900/90 border-emerald-500/30'
              : isConnected
              ? 'bg-slate-900/90 border-amber-500/30'
              : 'bg-slate-900/90 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">وضعیت اتصال افزونه</span>
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 space-x-reverse ${
                isWorkerActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isConnected
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isWorkerActive ? 'bg-emerald-400 animate-pulse' : isConnected ? 'bg-amber-400' : 'bg-rose-400'}`} />
                <span>{isWorkerActive ? 'ورکر فعال و آماده' : isConnected ? 'آماده‌باش (Worker Pause)' : 'افزونه شناسایی نشد'}</span>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>نسخه فعال:</span>
                <span className="font-mono text-slate-200">v{status.version || APP_VERSION}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>کانال ارتباطی:</span>
                <span className="font-mono text-sky-400">{status.transportType}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>سشن‌های همگام‌شده:</span>
                <span className="font-mono font-bold text-emerald-400">{toPersianDigits(status.syncedSessionsCount)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>آخرین پالس حیات:</span>
                <span className="font-mono text-slate-300">{status.lastHeartbeat || '---'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-800">
              {!isConnected ? (
                <button
                  onClick={handleDownloadZip}
                  disabled={isDownloading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center justify-center space-x-1.5 space-x-reverse"
                >
                  <Download className="w-4 h-4 ml-1" />
                  <span>{isDownloading ? 'درحال آماده‌سازی پکیج...' : `دانلود افزونه نسخه v${APP_VERSION}`}</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleWorker}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 space-x-reverse ${
                    isWorkerActive
                      ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  <Power className="w-4 h-4 ml-1" />
                  <span>{isWorkerActive ? 'تعلیق موقت ورکر' : 'فعال‌سازی ورکر خودمختار'}</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePing}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition-all flex items-center justify-center space-x-1 space-x-reverse"
                >
                  <RefreshCw className="w-3.5 h-3.5 ml-1" />
                  <span>تست پالس</span>
                </button>
                <button
                  onClick={handleHarvestActiveTab}
                  className="py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-medium text-xs border border-sky-500/30 transition-all flex items-center justify-center space-x-1 space-x-reverse"
                >
                  <Zap className="w-3.5 h-3.5 ml-1" />
                  <span>شکار تب فعال</span>
                </button>
              </div>
            </div>
          </div>

          {/* OTP Injection Box */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center space-x-1.5 space-x-reverse">
              <Send className="w-4 h-4 text-sky-400" />
              <span>ارسال و تزریق دستی کد تایید (OTP)</span>
            </h4>
            <form onSubmit={handleSendTestOtp} className="space-y-2">
              <input
                type="text"
                value={testOtp}
                onChange={(e) => setTestOtp(e.target.value)}
                placeholder="کد تایید پیامکی (مثال: ۱۲۳۴۵)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 direction-ltr text-center font-mono"
                maxLength={8}
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 transition-all"
              >
                ارسال به صفحه و افزونه
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Pipeline Monitor & Terminal Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  کنسول نظارت زنده بر لوله ارتباطی (Extension Bridge Logs)
                </h3>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                پاکسازی لاگ‌ها
              </button>
            </div>

            <div className="mt-3.5 h-[320px] overflow-y-auto rounded-xl bg-slate-950 p-3 font-mono text-xs space-y-2 border border-slate-800/80">
              {logs.length === 0 ? (
                <div className="text-center text-slate-600 py-12">در انتظار رویدادهای لوله ارتباطی...</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start space-x-2 space-x-reverse leading-relaxed ${
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 shrink-0 text-[10px] mt-0.5">[{log.time}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
