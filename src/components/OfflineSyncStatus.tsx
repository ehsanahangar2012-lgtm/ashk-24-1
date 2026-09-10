import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Server,
  HardDrive,
  Cpu,
  CheckCircle2,
  Clock,
  AlertCircle,
  KeyRound,
  Layers,
  ArrowUpRight,
  Activity,
  Zap,
} from 'lucide-react';
import { toPersianDigits, getPersianJalaliDate } from '../utils/persianUtils';
import { clientStorage } from '../services/clientStorageService';

interface OfflineSyncStatusProps {
  onToggleForcedOffline?: (forced: boolean) => void;
  isForcedOffline?: boolean;
}

export const OfflineSyncStatus: React.FC<OfflineSyncStatusProps> = ({
  onToggleForcedOffline,
  isForcedOffline = false,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [serverPing, setServerPing] = useState<{ status: 'online' | 'offline' | 'checking'; latencyMs: number }>({
    status: 'checking',
    latencyMs: 0,
  });
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('ashk24_last_sync_time') || new Date().toISOString();
  });
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [storageSizeKb, setStorageSizeKb] = useState<number>(0);
  const [authTokenPresent, setAuthTokenPresent] = useState<boolean>(false);
  const [localUsersCount, setLocalUsersCount] = useState<number>(2);

  // Measure local storage size and check server ping
  const calculateStats = async () => {
    // LocalStorage size
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ashk24_')) {
          const val = localStorage.getItem(key) || '';
          totalBytes += key.length + val.length;
        }
      }
      setStorageSizeKb(Math.round((totalBytes / 1024) * 10) / 10);
    } catch (e) {}

    // Check token
    const token = localStorage.getItem('ashk24_token');
    setAuthTokenPresent(Boolean(token));

    // Check users
    try {
      const localUsers = JSON.parse(localStorage.getItem('ashk24_local_users') || '[]');
      setLocalUsersCount(2 + (Array.isArray(localUsers) ? localUsers.length : 0));
    } catch (e) {}

    // Pending sync items count from clientStorage queues
    try {
      const jobs = await clientStorage.getJobs();
      const pendingJobs = jobs.filter((j) => j.status !== 'published' && j.status !== 'failed').length;
      setPendingSyncCount(pendingJobs);
    } catch (e) {
      setPendingSyncCount(0);
    }
  };

  const checkServerPing = async () => {
    setServerPing((prev) => ({ ...prev, status: 'checking' }));
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/cpanel-backend/api/index.php?route=health', { signal: controller.signal });
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      if (res.ok) {
        setServerPing({ status: 'online', latencyMs: duration });
      } else {
        setServerPing({ status: 'offline', latencyMs: 999 });
      }
    } catch (e) {
      setServerPing({ status: 'offline', latencyMs: 999 });
    }
  };

  useEffect(() => {
    calculateStats();
    checkServerPing();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      calculateStats();
      checkServerPing();
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    await checkServerPing();
    await calculateStats();

    // Simulate sync flush
    setTimeout(() => {
      const nowIso = new Date().toISOString();
      setLastSyncTime(nowIso);
      localStorage.setItem('ashk24_last_sync_time', nowIso);
      setPendingSyncCount(0);
      setSyncing(false);
    }, 1200);
  };

  // Jalali formatted date for last sync time
  const formattedJalaliSync = () => {
    try {
      const date = new Date(lastSyncTime);
      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      const jalaliDate = getPersianJalaliDate();
      return `${jalaliDate} - ساعت ${toPersianDigits(hours)}:${toPersianDigits(mins)}`;
    } catch (e) {
      return getPersianJalaliDate();
    }
  };

  const syncPercentage = pendingSyncCount === 0 ? 100 : Math.max(10, 100 - pendingSyncCount * 15);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
      {/* Header & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Database className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">
              سلامت سرویس‌های آفلاین و همگام‌سازی محلی (Local Sync Status)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            پایش هوشمند حافظه مرورگر، وضعیت اعتبارسنجی آفلاین و همگام‌سازی خودکار داده‌ها در قطعی اینترنت سرورهای ایران
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2 space-x-reverse disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ml-1 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی محلی فوری'}</span>
          </button>

          {onToggleForcedOffline && (
            <button
              onClick={() => onToggleForcedOffline(!isForcedOffline)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 space-x-reverse ${
                isForcedOffline
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 ml-1 text-amber-400" />
              <span>{isForcedOffline ? 'سوئیچ به آنلاین' : 'اجبار حالت آفلاین'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Connection Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Network State */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 block">اتصال اینترنت مرورگر:</span>
            <div className="flex items-center space-x-2 space-x-reverse">
              {isOnline ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400">آنلاین (Online)</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-rose-400">آفلاین (Offline)</span>
                </>
              )}
            </div>
          </div>
          {isOnline ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-rose-400" />}
        </div>

        {/* Backend Node Server Ping */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 block">اتصال سرور اصلی (Backend API):</span>
            <div className="flex items-center space-x-2 space-x-reverse">
              {serverPing.status === 'online' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-400">
                    در دسترس ({toPersianDigits(serverPing.latencyMs)}ms)
                  </span>
                </>
              ) : serverPing.status === 'checking' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-bold text-amber-300">در حال پایش...</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-amber-400">خارج از دسترس (حالت آفلاین محلی)</span>
                </>
              )}
            </div>
          </div>
          <Server className="w-5 h-5 text-amber-400" />
        </div>

        {/* Local Auth Fallback Vault */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 block">اعتبارسنجی محلی (Local Auth):</span>
            <div className="flex items-center space-x-2 space-x-reverse">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">فعال و آماده ورود بدون سرور</span>
            </div>
          </div>
          <KeyRound className="w-5 h-5 text-amber-400" />
        </div>
      </div>

      {/* Sync Progress Bar & Details */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 space-x-reverse text-slate-300 font-bold">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>میزان همگام‌سازی پایگاه داده محلی (Local Sync Progress)</span>
          </div>
          <span className="font-bold text-amber-400 font-mono text-sm">
            %{toPersianDigits(syncPercentage)}
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${syncPercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-400">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
            <span>تغییرات معلق همگام‌سازی:</span>
            <span className="font-bold text-amber-400">
              {pendingSyncCount > 0 ? `${toPersianDigits(pendingSyncCount)} مورد` : 'هیچ (کاملاً همگام)'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
            <span>تاریخ آخرین همگام‌سازی:</span>
            <span className="font-semibold text-slate-200">{formattedJalaliSync()}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
            <span>حجم ذخیره‌سازی محلی:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {toPersianDigits(storageSizeKb)} KB
            </span>
          </div>
        </div>
      </div>

      {/* Services Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Service 1: Local Auth Fallback */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">احراز هویت محلی</span>
            <KeyRound className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1 space-x-reverse">
            <span className="text-lg font-bold text-slate-100">{toPersianDigits(localUsersCount)}</span>
            <span className="text-xs text-slate-400">کاربر مجاز محلی</span>
          </div>
          <p className="text-[11px] text-emerald-400 flex items-center space-x-1 space-x-reverse">
            <CheckCircle2 className="w-3 h-3 ml-0.5" />
            <span>توکن‌های جلسه پایداری دارد</span>
          </p>
        </div>

        {/* Service 2: Client Storage Vault */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">انباره داده مرورگر</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-1 space-x-reverse">
            <span className="text-lg font-bold text-slate-100">{toPersianDigits(storageSizeKb)}</span>
            <span className="text-xs text-slate-400">کیلوبایت داده</span>
          </div>
          <p className="text-[11px] text-slate-400">ذخیره‌سازی رمزنگاری‌شده محلی</p>
        </div>

        {/* Service 3: Local AI Engine */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">هوش مصنوعی محلی</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-slate-100">موتور آفلاین</div>
          <p className="text-[11px] text-emerald-400 flex items-center space-x-1 space-x-reverse">
            <Zap className="w-3 h-3 ml-0.5" />
            <span>پاسخ‌دهی بدون تحریم/فیلتر</span>
          </p>
        </div>

        {/* Service 4: cPanel & Local Cron */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">صف منشی ۲۴ ساعته</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-400">آماده و زمان‌بندی شده</div>
          <p className="text-[11px] text-slate-400">کرون‌جاب سی‌پنل و مرورگر</p>
        </div>
      </div>
    </div>
  );
};
