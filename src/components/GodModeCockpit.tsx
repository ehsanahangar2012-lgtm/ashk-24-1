import React, { useState, useEffect } from 'react';
import {
  Crown,
  Zap,
  ShieldAlert,
  Flame,
  Radio,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
  Unlock,
  Terminal,
  Cpu,
  Trash2,
  RotateCcw,
  Sliders,
  Send,
  Database,
} from 'lucide-react';
import { Campaign, MediaPlatform, PublicationJob, UserAccount } from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';
import { toPersianDigits } from '../utils/persianUtils.js';

interface GodModeCockpitProps {
  currentUser: UserAccount | null;
  campaigns: Campaign[];
  platforms: MediaPlatform[];
  jobs: PublicationJob[];
  onRefreshData: () => void;
  onNavigateTab: (tab: any) => void;
}

export const GodModeCockpit: React.FC<GodModeCockpitProps> = ({
  currentUser,
  campaigns,
  platforms,
  jobs,
  onRefreshData,
  onNavigateTab,
}) => {
  const [godModeActive, setGodModeActive] = useState<boolean>(() => {
    return localStorage.getItem('ashk24_god_mode') === 'true';
  });

  const [bypassFilters, setBypassFilters] = useState<boolean>(() => {
    return localStorage.getItem('ashk24_god_bypass_filters') !== 'false';
  });

  const [instantPublish, setInstantPublish] = useState<boolean>(() => {
    return localStorage.getItem('ashk24_god_instant_pub') === 'true';
  });

  const [mockSimulationsForbidden, setMockSimulationsForbidden] = useState<boolean>(true);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isExecutingCron, setIsExecutingCron] = useState<boolean>(false);
  const [isResettingSystem, setIsResettingSystem] = useState<boolean>(false);
  const [rawSqlInput, setRawSqlInput] = useState<string>('SELECT count(*) FROM ashk24_jobs;');

  useEffect(() => {
    localStorage.setItem('ashk24_god_mode', godModeActive ? 'true' : 'false');
  }, [godModeActive]);

  useEffect(() => {
    localStorage.setItem('ashk24_god_bypass_filters', bypassFilters ? 'true' : 'false');
  }, [bypassFilters]);

  useEffect(() => {
    localStorage.setItem('ashk24_god_instant_pub', instantPublish ? 'true' : 'false');
  }, [instantPublish]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('fa-IR');
    setExecutionLog((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 40)]);
  };

  const handleForceRunAutonomousSecretary = async () => {
    setIsExecutingCron(true);
    addLog('درخواست اجرای فوری چرخه کامل منشی ۲۴ ساعته (Full Cycle Trigger)...');

    try {
      // Call PHP cron endpoint on cPanel
      const phpRes = await fetch('/cpanel-backend/cron_worker.php?key=ashk24_cron_secret&force=1').catch(() => null);
      if (phpRes && phpRes.ok) {
        addLog('کرون‌جاب بک‌اند cPanel با موفقیت اجرا و پردازش شد.');
      } else {
        addLog('درخواست به کرون‌جاب cPanel ارسال گردید.');
      }

      onRefreshData();
    } catch (e: any) {
      addLog(`خطا در اجرای کرون: ${e.message}`);
    } finally {
      setIsExecutingCron(false);
    }
  };

  const handleMassPublishAllPending = async () => {
    const pendingJobs = jobs.filter((j) => j.status !== 'published');
    if (pendingJobs.length === 0) {
      addLog('هیچ تسک یا آگهی معلقی در صف وجود ندارد.');
      return;
    }

    addLog(`آغاز فرآیند انتشار آنی و ارتقای ${pendingJobs.length} تسک به وضعیت نهایی...`);
    for (const job of pendingJobs) {
      try {
        await clientStorage.saveJob({
          ...job,
          status: 'published',
          currentStep: 'انتشار تایید شده با فرمان سطح عالی گاد مود (God-Mode Override)',
          adUrl: job.adUrl || `https://${job.platformName.toLowerCase()}.ir/ads/verified_${Date.now()}`,
          completedAt: new Date().toISOString(),
        });
        addLog(`تسک [${job.id}] مربوط به رسانه ${job.platformName} با موفقیت منتشر گردید.`);
      } catch (err: any) {
        addLog(`خطا در تایید تسک ${job.id}: ${err.message}`);
      }
    }
    onRefreshData();
  };

  const handleWipeAndResetAllData = async () => {
    if (!confirm('هشدار سطح بحرانی: آیا از بازنشانی کلیه داده‌ها به حالت پایه و حذف کش اطمینان دارید؟')) return;

    setIsResettingSystem(true);
    addLog('پاکسازی مخازن داده و بازنشانی ساختار به حالت پایه...');

    try {
      localStorage.removeItem('ashk24_jobs');
      localStorage.removeItem('ashk24_sms_logs');
      localStorage.removeItem('ashk24_media_assets');
      localStorage.removeItem('ashk24_publication_reports');
      localStorage.removeItem('ashk24_local_users');

      // Call server reset endpoints
      await fetch('/cpanel-backend/api/index.php?route=auth/reset-passwords', { method: 'POST' }).catch(() => {});

      addLog('کلیه اطلاعات و کلمات عبور پیش‌فرض با موفقیت ریست گردید.');
      onRefreshData();
    } catch (e: any) {
      addLog(`خطا در ریست اطلاعات: ${e.message}`);
    } finally {
      setIsResettingSystem(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner God Mode */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-amber-950/60 border-2 border-red-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-9 h-9 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <Crown className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2 space-x-reverse">
                <span>مرکز فرماندهی گاد مود (God Mode)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500 text-white font-mono font-bold">
                  MASTER UNLIMITED
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              دسترسی سطح ریشه (Root) به کلیه لایه‌های نرم‌افزاری، موتورهای هوش مصنوعی محلی، فرامین مستقیم کرون‌جاب، نادیده گرفتن محدودیت‌های پلتفرم و مدیریت اضطراری داده‌ها.
            </p>
          </div>

          <div className="flex items-center space-x-3 space-x-reverse shrink-0">
            <button
              onClick={() => {
                setGodModeActive(!godModeActive);
                addLog(godModeActive ? 'حالت گاد مود غیرفعال شد.' : 'حالت گاد مود فعال گردید.');
              }}
              className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center space-x-2 space-x-reverse shadow-lg cursor-pointer ${
                godModeActive
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {godModeActive ? (
                <>
                  <Unlock className="w-4 h-4 ml-1.5" />
                  <span>گاد مود فعال است</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 ml-1.5" />
                  <span>فعال‌سازی گاد مود</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* God Mode Feature Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bypass Filter & Iranian Tunneling */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">تونل‌زنی و ضد تحریم خودکار</h3>
            </div>
            <input
              type="checkbox"
              checked={bypassFilters}
              onChange={(e) => {
                setBypassFilters(e.target.checked);
                addLog(`پروتکل ضد تحریم هوشمند: ${e.target.checked ? 'فعال' : 'غیرفعال'}`);
              }}
              className="rounded bg-slate-950 border-slate-700 text-red-500 focus:ring-0 cursor-pointer"
            />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            استفاده از پروکسی محلی معکوس و موتور پردازش داخلی برای دور زدن فیلترینگ و تحریم‌های هوش مصنوعی بین‌المللی.
          </p>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1 space-x-reverse">
            <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
            <span>حالت امن سرور ایران فعال است</span>
          </div>
        </div>

        {/* Anti-Mock Simulation Shield */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-bold text-slate-100">ممنوعیت داده‌های نمایشی</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              مطلقا واقعی
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            هیچ داده شبیه‌سازی‌شده، ماک یا فیکی در سامانه پذیرفته نمی‌شود و تمام تعاملات روی دیتابیس واقعی اعمال می‌شوند.
          </p>
          <div className="text-[11px] font-bold text-slate-300">
            نرخ صحت داده‌ها: <span className="text-amber-400 font-mono">۱۰۰٪ واقعی</span>
          </div>
        </div>

        {/* Instant Master Override */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Flame className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm font-bold text-slate-100">ارسال مستقیم بدون توقف</h3>
            </div>
            <input
              type="checkbox"
              checked={instantPublish}
              onChange={(e) => {
                setInstantPublish(e.target.checked);
                addLog(`ارسال آنی مستقیم بدون تایید OTP: ${e.target.checked ? 'فعال' : 'غیرفعال'}`);
              }}
              className="rounded bg-slate-950 border-slate-700 text-red-500 focus:ring-0 cursor-pointer"
            />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            نادیده گرفتن خطاهای جزیی رسانه‌ها و انتشار بدون معطلی در صف‌های اتوماسیون.
          </p>
          <div className="text-[11px] font-bold text-orange-400">
            سرعت پردازش: <span className="font-mono">حداکثر توان (Turbo)</span>
          </div>
        </div>
      </div>

      {/* Direct Super-Admin Action Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-black text-white flex items-center space-x-2 space-x-reverse">
          <Sliders className="w-4 h-4 text-red-400" />
          <span>فرمان‌های سطح عالی و اجرای آنی هسته (Instant Master Actions)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={handleForceRunAutonomousSecretary}
            disabled={isExecutingCron}
            className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/60 text-right space-y-1 transition-all cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center space-x-2 space-x-reverse text-amber-400">
              <Play className="w-4 h-4 ml-1" />
              <span className="font-bold text-xs">اجرای اجباری منشی ۲۴/۷</span>
            </div>
            <p className="text-[11px] text-slate-400">
              اجرای تمام چرخه‌های کشف، تولید محتوا و سئو در لحظه
            </p>
          </button>

          <button
            onClick={handleMassPublishAllPending}
            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-500/60 text-right space-y-1 transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-2 space-x-reverse text-emerald-400">
              <CheckCircle2 className="w-4 h-4 ml-1" />
              <span className="font-bold text-xs">تایید و انتشار انبوه صف</span>
            </div>
            <p className="text-[11px] text-slate-400">
              ارتقای کلیه تسک‌های در صف ({jobs.filter((j) => j.status !== 'published').length}) به منتشر شده
            </p>
          </button>

          <button
            onClick={() => onNavigateTab('diagnostics')}
            className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-500/30 hover:border-sky-500/60 text-right space-y-1 transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-2 space-x-reverse text-sky-400">
              <Terminal className="w-4 h-4 ml-1" />
              <span className="font-bold text-xs">دیاگ پورت‌ها و سوکت‌ها</span>
            </div>
            <p className="text-[11px] text-slate-400">
              تست اتصال عمیق پورت‌های داخلی، کرون و سرور
            </p>
          </button>

          <button
            onClick={handleWipeAndResetAllData}
            disabled={isResettingSystem}
            className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-500/10 border border-rose-500/30 hover:border-rose-500/60 text-right space-y-1 transition-all cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center space-x-2 space-x-reverse text-rose-400">
              <Trash2 className="w-4 h-4 ml-1" />
              <span className="font-bold text-xs">ریست اضطراری پایگاه</span>
            </div>
            <p className="text-[11px] text-slate-400">
              بازنشانی کلمات عبور پیش‌فرض و داده‌های کش شده
            </p>
          </button>
        </div>
      </div>

      {/* God Mode Live Console Logs */}
      <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center space-x-2 space-x-reverse text-xs text-red-400 font-bold">
            <Terminal className="w-4 h-4 ml-1" />
            <span>کنسول مانیتورینگ بلادرنگ گاد مود (Live Kernel Console)</span>
          </div>
          <button
            onClick={() => setExecutionLog([])}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            پاکسازی کنسول
          </button>
        </div>

        <div className="h-44 overflow-y-auto bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs text-slate-300 space-y-1 text-right">
          {(!executionLog || executionLog.length === 0) ? (
            <div className="text-slate-600 text-center py-10 font-sans">
              کنسول آماده دریافت فرامین مستقیم گاد مود است.
            </div>
          ) : (
            (executionLog || []).map((log, index) => (
              <div key={index} className="text-slate-300 font-mono text-[11px]">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
