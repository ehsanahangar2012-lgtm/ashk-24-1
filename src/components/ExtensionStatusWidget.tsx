import React, { useState, useEffect } from 'react';
import {
  Puzzle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Power,
  RefreshCw,
  Download,
  Zap,
  Radio,
  Send,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { extensionBridge, ExtensionWorkerStatus } from '../utils/extensionBridge';
import { APP_VERSION } from '../config/version';
import { toPersianDigits } from '../utils/persianUtils';
import { SmartHelpButton } from './SmartHelpModal';

interface ExtensionStatusWidgetProps {
  onOpenExtensionModal?: () => void;
}

export const ExtensionStatusWidget: React.FC<ExtensionStatusWidgetProps> = ({
  onOpenExtensionModal
}) => {
  const [status, setStatus] = useState<ExtensionWorkerStatus>(extensionBridge.getStatus());
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>('');
  const [showOtpBox, setShowOtpBox] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = extensionBridge.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handlePing = () => {
    setIsPinging(true);
    extensionBridge.sendPing();
    setTimeout(() => {
      setIsPinging(false);
      setNotification('پالس ارتباطی به لوله افزونه ارسال گردید.');
      setTimeout(() => setNotification(null), 3000);
    }, 600);
  };

  const handleToggleWorker = () => {
    const nextState = !status.isWorkerEnabled;
    extensionBridge.toggleWorker(nextState);
    setNotification(nextState ? 'حالت ورکر خودمختار فعال شد.' : 'ورکر به حالت آماده‌باش رفت.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    extensionBridge.sendOtpCode(otpInput.trim());
    setNotification(`کد تایید ${otpInput} مستقیماً به صفحه فعال افزونه ارسال شد.`);
    setOtpInput('');
    setShowOtpBox(false);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDownloadExtensionZip = async () => {
    setIsDownloading(true);
    try {
      const filename = `ashk24-extension-v${APP_VERSION}.zip`;
      let res = await fetch(`/downloads/${filename}`);
      if (!res.ok) {
        res = await fetch('/downloads/ashk24-extension-latest.zip');
      }

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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  const isConnected = status.installed;
  const isWorkerActive = status.installed && status.isWorkerEnabled;

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
      isWorkerActive
        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
        : isConnected
        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-amber-500/30 shadow-lg shadow-amber-500/5'
        : 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border-rose-500/30 shadow-lg shadow-rose-500/5'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5 space-x-reverse">
          <div className={`p-2 rounded-xl ${
            isWorkerActive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : isConnected
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            <Puzzle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <h3 className="text-sm font-bold text-slate-100">
                وضعیت لوله ارتباطی و ورکر افزونه مرورگر
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-400 border border-slate-700">
                v{status.version || APP_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isWorkerActive
                ? 'پل ارتباطی فعال - ورکر خودمختار آماده شکار سشن و تزریق داده است'
                : isConnected
                ? 'افزونه شناسایی شد ولی حالت ورکر خودمختار غیرفعال است'
                : 'افزونه در مرورگر فعلی شناسایی نشد - جهت خودکارسازی نصب نمایید'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse self-start sm:self-auto">
          {/* Status Badge */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 space-x-reverse ${
            isWorkerActive
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : isConnected
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isWorkerActive
                ? 'bg-emerald-400 animate-pulse'
                : isConnected
                ? 'bg-amber-400'
                : 'bg-rose-400'
            }`} />
            <span>
              {isWorkerActive
                ? 'ورکر آنلاین و متصل'
                : isConnected
                ? 'آماده‌باش (Worker Pause)'
                : 'قطع ارتباط'}
            </span>
          </div>

          <SmartHelpButton
            content={{
              title: 'لوله ارتباطی و ورکر افزونه مرورگر (Extension Bridge)',
              summary: 'این افزونه به عنوان کارگر محلی (Local Worker) روی مرورگر شما اجرا می‌شود و با دور زدن تحریم‌ها، فرم‌های ورود و ثبت‌نام را تکمیل و کوکی‌ها را مستقیماً در دیتابیس سی‌پنل ثبت می‌کند.',
              steps: [
                'در صورت عدم شناسایی، دکمه «دانلود و نصب افزونه» را کلیک کنید.',
                'پوشه اکسترکت‌شده را در صفحه chrome://extensions مرورگر با دکمه Load unpacked بارگذاری کنید.',
                'برای فعال‌سازی مجدد کارگر، دکمه «فعال‌سازی ورکر خودمختار» را بزنید.',
                'پیام‌های پیامک و OTP از طریق لوله امن PostMessage مستقیماً به صفحه مقصد ارسال می‌شوند.'
              ],
              offlineNote: 'افزونه کاملاً آفلاین و بومی عمل کرده و کوکی‌ها را مستقیم در سرور cPanel شما ذخیره می‌کند.'
            }}
          />
        </div>
      </div>

      {/* Metrics & Content */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <div className="text-[10px] text-slate-400">سشن‌های همگام‌شده</div>
          <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
            {toPersianDigits(status.syncedSessionsCount)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <div className="text-[10px] text-slate-400">کانال انتقال داده</div>
          <div className="text-xs font-semibold text-sky-400 mt-1 font-mono">
            {status.transportType === 'post_message'
              ? 'PostMessage + DOM'
              : status.transportType === 'custom_event'
              ? 'CustomEvent Pipeline'
              : status.transportType === 'broadcast_channel'
              ? 'BroadcastChannel'
              : status.installed
              ? 'DOM Active Bridge'
              : 'غیرفعال'}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <div className="text-[10px] text-slate-400">آخرین پالس حیات</div>
          <div className="text-xs font-medium text-slate-300 mt-1 font-mono">
            {status.lastHeartbeat || '---'}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <div className="text-[10px] text-slate-400">وظایف در صف</div>
          <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
            {toPersianDigits(Math.max(0, status.totalTargets - status.currentIndex))}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
        <div className="flex flex-wrap items-center gap-2">
          {!isConnected ? (
            <button
              onClick={handleDownloadExtensionZip}
              disabled={isDownloading}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center space-x-1.5 space-x-reverse"
            >
              <Download className="w-4 h-4 ml-1" />
              <span>{isDownloading ? 'درحال دانلود...' : `دریافت و نصب افزونه v${APP_VERSION}`}</span>
            </button>
          ) : !isWorkerActive ? (
            <button
              onClick={handleToggleWorker}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 space-x-reverse animate-pulse"
            >
              <Power className="w-4 h-4 ml-1" />
              <span>فعال‌سازی ورکر خودمختار</span>
            </button>
          ) : (
            <button
              onClick={handleToggleWorker}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition-all flex items-center space-x-1.5 space-x-reverse"
            >
              <Power className="w-3.5 h-3.5 text-amber-400 ml-1" />
              <span>توقف موقت ورکر</span>
            </button>
          )}

          <button
            onClick={handlePing}
            disabled={isPinging}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700/80 transition-all flex items-center space-x-1 space-x-reverse"
            title="ارسال پالس دستی جهت تست پایداری لوله"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-sky-400' : ''}`} />
            <span>تست پالس لوله</span>
          </button>

          <button
            onClick={() => setShowOtpBox(!showOtpBox)}
            className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-medium text-xs border border-sky-500/30 transition-all flex items-center space-x-1 space-x-reverse"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ارسال دستی کد OTP به افزونه</span>
          </button>
        </div>

        {onOpenExtensionModal && (
          <button
            onClick={onOpenExtensionModal}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-4"
          >
            مرکز فرماندهی شکار سشن ←
          </button>
        )}
      </div>

      {/* Inline OTP Dispatch Pipeline */}
      {showOtpBox && (
        <form onSubmit={handleSendOtp} className="mt-3 p-3 rounded-xl bg-slate-950 border border-sky-500/40 flex items-center gap-2">
          <input
            type="text"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            placeholder="کد تایید ۴ یا ۶ رقمی را وارد کنید..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 direction-ltr text-center font-mono"
            maxLength={8}
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 transition-all"
          >
            ارسال به افزونه
          </button>
        </form>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="mt-2.5 p-2 rounded-lg bg-slate-950/90 border border-slate-700 text-center text-xs text-emerald-400 animate-fadeIn">
          {notification}
        </div>
      )}
    </div>
  );
};
