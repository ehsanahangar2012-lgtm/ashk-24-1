import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Radio,
  Puzzle,
  Smartphone,
  ArrowLeft,
  X,
  RefreshCw,
  Power,
  HelpCircle
} from 'lucide-react';
import { extensionBridge, ExtensionWorkerStatus } from '../utils/extensionBridge';
import { SmartHelpButton } from './SmartHelpModal';

interface ExtensionConnectionBannerProps {
  onNavigateTab: (tab: any) => void;
}

export const ExtensionConnectionBanner: React.FC<ExtensionConnectionBannerProps> = ({
  onNavigateTab
}) => {
  const [status, setStatus] = useState<ExtensionWorkerStatus>(extensionBridge.getStatus());
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = extensionBridge.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  // If worker is fully connected and active, don't show warning banner
  if (status.installed && status.isWorkerEnabled) {
    return null;
  }

  if (isDismissed) {
    return (
      <div className="mx-4 sm:mx-6 mb-3 flex justify-end">
        <button
          onClick={() => setIsDismissed(false)}
          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-medium flex items-center space-x-1.5 space-x-reverse transition-all"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>هشدار وضعیت ورکر و رله موبایل</span>
        </button>
      </div>
    );
  }

  const handleQuickActivate = () => {
    setIsActivating(true);
    extensionBridge.toggleWorker(true);
    setTimeout(() => {
      setIsActivating(false);
    }, 800);
  };

  return (
    <div className="mx-4 sm:mx-6 mb-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-rose-950/50 border border-amber-500/40 shadow-lg shadow-amber-950/20 backdrop-blur-sm transition-all animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Warning Information */}
        <div className="flex items-start space-x-3 space-x-reverse">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <h4 className="text-xs sm:text-sm font-bold text-amber-300">
                {!status.installed
                  ? 'عدم شناسایی افزونه مرورگر یا قطع ارتباط با ورکر محلی'
                  : 'ورکر خودمختار افزونه مرورگر در حالت آماده‌باش (Pause) است'}
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                نیازمند اقدام
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
              جهت استخراج سشن‌ها، ارسال خودکار فرم‌ها و رله کدهای پیامکی OTP به سایت‌های آگهی، ورکر محلی و پل رله را فعال یا بازنشانی نمایید.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {status.installed ? (
            <button
              onClick={handleQuickActivate}
              disabled={isActivating}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 space-x-reverse"
            >
              <Power className="w-3.5 h-3.5 ml-1" />
              <span>{isActivating ? 'در حال فعال‌سازی...' : 'فعال‌سازی فوری ورکر'}</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('extension_bridge')}
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 transition-all flex items-center space-x-1.5 space-x-reverse"
            >
              <Puzzle className="w-3.5 h-3.5 ml-1" />
              <span>نصب و اتصال لوله افزونه</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('mobile_companion')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400 ml-1" />
            <span>بازنشانی رله موبایل</span>
          </button>

          <SmartHelpButton
            content={{
              title: 'راهنمای حل قطعی ارتباط ورکر و رله پیامک',
              summary: 'برای عملکرد خودکار پلتفرم و دور زدن فیلترینگ و تحریم‌ها، افزونه مرورگر به عنوان کارگر محلی (Local Worker) عمل می‌کند.',
              steps: [
                'اگر افزونه نصب نیست، به تب «لوله ارتباطی و ورکر افزونه» رفته و پکیج را دانلود کنید.',
                'برای دریافت پیامک‌های تایید، رله MacroDroid موبایل را در تب «رله خودکار پیامک» فعال نمایید.',
                'کدهای پیامکی به طور لحظه‌ای به صف انتشار نوبت‌ها منتقل می‌شوند.'
              ],
              offlineNote: 'سیستم لوله ارتباطی کاملاً آفلاین و بومی در سرور cPanel و مرورگر شما اجرا می‌شود.'
            }}
          />

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title="بستن موقت هشدار"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
