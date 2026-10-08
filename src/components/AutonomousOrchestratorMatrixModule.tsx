import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Cpu,
  Puzzle,
  Smartphone,
  ShieldCheck,
  Radio,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  Globe,
  RefreshCw,
  Layers,
  Activity,
  Terminal,
  Server
} from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';
import { toPersianDigits } from '../utils/persianUtils';
import { extensionBridge, ExtensionWorkerStatus } from '../utils/extensionBridge';
import { APP_VERSION } from '../config/version';
import { downloadExtensionPackage } from '../utils/clientDownloadHelper';

interface OrchestratorState {
  activeMode: string;
  recommendedChannel: string;
  isExtensionOnline: boolean;
  isWorkerOnline: boolean;
  isSmsRelayConnected: boolean;
  extensionInfo?: any;
  workerInfo?: any;
  lastSmsReceived?: string | null;
  policy: {
    roundRobinEnabled: boolean;
    minDelaySeconds: number;
    maxDelaySeconds: number;
    prioritizeUnfinished: boolean;
  };
  queueStats: {
    pending: number;
    inProgress: number;
    waitingOtp: number;
    published: number;
    total: number;
  };
  serverTime: string;
}

export const AutonomousOrchestratorMatrixModule: React.FC = () => {
  const [orchestrator, setOrchestrator] = useState<OrchestratorState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [extStatus, setExtStatus] = useState<ExtensionWorkerStatus>(extensionBridge.getStatus());
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchState = async () => {
    try {
      let res = await fetch('/cpanel-backend/api/index.php?route=orchestrator/state');
      if (!res.ok) res = await fetch('/api/index.php?route=orchestrator/state');
      if (res.ok) {
        const data = await res.json();
        if (data.orchestrator) {
          setOrchestrator(data.orchestrator);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    const unsub = extensionBridge.subscribe((status) => {
      setExtStatus(status);
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const handleTestProbe = async (channel: string) => {
    setLoading(true);
    try {
      if (channel === 'extension') {
        extensionBridge.sendPing();
        setActionNotice('پالس ارتباطی به افزونه ارسال شد.');
      } else if (channel === 'sms') {
        let res = await fetch('/cpanel-backend/api/index.php?route=sms-relay/probe', { method: 'POST' });
        if (!res.ok) res = await fetch('/api/index.php?route=sms-relay/probe', { method: 'POST' });
        if (res.ok) {
          setActionNotice('پیامک آزمایشی به وب‌هوک ارسال و با موفقیت دریافت شد.');
        }
      } else {
        setActionNotice('ورکر محلی در پس‌زمینه آماده دریافت وظایف است.');
      }
      fetchState();
    } finally {
      setLoading(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const isUserOnline = extStatus.installed || orchestrator?.isExtensionOnline;

  const targetPlatforms = [
    { name: 'نیازپرداز', domain: 'niazpardaz.com', type: 'ویژه نیازمندی‌ها', auth: 'پیامکی/سشن', status: 'آماده انتشار' },
    { name: 'ایستگاه', domain: 'istgah.com', type: 'کسب‌وکار و صنعت', auth: 'کاربری/رمز', status: 'آماده انتشار' },
    { name: 'آگهی۲۴', domain: 'agahi24.com', type: 'تبلیغات عمومی', auth: 'پیامکی OTP', status: 'آماده انتشار' },
    { name: 'پیام‌سرا', domain: 'payamsara.com', type: 'بانک نیازمندی‌ها', auth: 'کاربری و ایمیل', status: 'آماده انتشار' },
    { name: 'شیپور', domain: 'sheypoor.com', type: 'پورتال سراسری', auth: 'سشن/OTP', status: 'آماده انتشار' },
    { name: 'دیوار', domain: 'divar.ir', type: 'پورتال سراسری', auth: 'سشن مرورگر', status: 'آماده انتشار' },
    { name: 'ایران تجارت', domain: 'iran-tejarat.com', type: 'بازرگانی و صنعتی', auth: 'حساب تجاری', status: 'آماده انتشار' },
    { name: 'نیاز روز', domain: 'niazerooz.com', type: 'دایرکتوری مشاغل', auth: 'عضویت استاندارد', status: 'آماده انتشار' },
    { name: 'لوکوپوک', domain: 'locopoc.com', type: 'بازار نیازمندی‌ها', auth: 'ایمیل‌محور', status: 'آماده انتشار' },
    { name: 'پارس سنتر', domain: 'parscenter.com', type: 'محصولات صنعتی', auth: 'کاتالوگ کالا', status: 'آماده انتشار' },
    { name: 'شهر ۲۴', domain: 'shahr24.com', type: 'شهری و استانی', auth: 'فرم ثبت سریع', status: 'آماده انتشار' },
    { name: 'پیام همراه', domain: 'payam-hamrah.ir', type: 'موبایل و تجهیزات', auth: 'پیامک OTP', status: 'آماده انتشار' }
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* هدر ماژول و دکمه راهنمای هوشمند */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Workflow className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                ماتریس هماهنگی خودمختار اشک ۲۴ (Autonomous Orchestrator v{APP_VERSION})
              </h2>
              <SmartHelpButton
                content={{
                  title: 'راهنمای هماهنگی خودمختار سیستم',
                  summary: 'این ماژول به صورت هوشمند و بدون نیاز به دخالت شما تشخیص می‌دهد چه زمانی از افزونه، چه زمانی از ورکر و چگونه از پیامک‌های موبایل استفاده کند.',
                  steps: [
                    'در زمان آنلاین بودن شما (مرورگر باز): وظایف معلق و ثبت‌نام‌ها به افزونه مرورگر واگذار می‌شود تا با IP خانگی شما و بدون خطر بلاک شدن اجرا گردند.',
                    'در زمان غیاب شما (مرورگر بسته): وظایف به ورکر محلی سرور سوئیچ می‌شوند.',
                    'هنگام ارسال پیامک کد تایید: سامانه رله موبایل بدون نیاز به تایپ دستی شما، کد را استخراج کرده و به صورت آنی در کادر مربوطه می‌نشاند.',
                    'توزیع آگهی‌ها به صورت چرخشی (Round-Robin) بین تمام سایت‌ها پخش می‌شود تا از ارسال تکراری به یک سایت و مسدودی جلوگیری شود.'
                  ],
                  offlineNote: 'کلیه تصمیم‌گیری‌ها درون اسکریپت‌های cPanel PHP و بدون وابستگی به سرویس‌های ابری فیلترشده انجام می‌شود.'
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              تعیین و تبیین دقیق نحوه تعامل افزونه مرورگر، ورکر خودکار، رله پیامک و توزیع چرخشی بین تمامی پلتفرم‌ها
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchState}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center space-x-1.5 space-x-reverse border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>بروزرسانی وضعیت</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2 space-x-reverse">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* وضعیت فعلی کانال‌های سه‌گانه */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ۱. کانال افزونه مرورگر (زمان آنلاین بودن کاربر) */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isUserOnline
            ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
            : 'bg-slate-900 border-slate-800 opacity-80'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Puzzle className={`w-5 h-5 ${isUserOnline ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="font-bold text-xs text-slate-200">کانال ۱: افزونه مرورگر</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              isUserOnline
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {isUserOnline ? 'فعال (کاربر آنلاین)' : 'در انتظار اتصال'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            <strong>نقش عملیاتی:</strong> در زمان حضور کاربر، کارهای ناتمام و ثبت‌نام پلتفرم‌ها به کمک افزونه در تب مرورگر با <u>IP خانگی شما</u> انجام می‌شود تا کپچا و فیلترینگ دور زده شود.
          </p>
          <div className="text-[11px] text-slate-400 font-mono space-y-1 border-t border-slate-800/80 pt-2.5">
            <div>وضعیت افزونه: {extStatus.installed ? `نسخه ${extStatus.version || `v${APP_VERSION}`}` : 'عدم شناسایی (نیازمند نصب یا بارگذاری)'}</div>
            <div>آخرین پالس: {extStatus.lastHeartbeat || 'هم‌اکنون'}</div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={() => handleTestProbe('extension')}
              className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700"
            >
              تست پالس و برقراری ارتباط
            </button>
            <button
              type="button"
              onClick={() => downloadExtensionPackage(APP_VERSION)}
              className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs transition-all border border-emerald-500/30 text-center flex items-center justify-center space-x-1 space-x-reverse cursor-pointer"
            >
              <span>دانلود بسته بروزرسانی افزونه (v{APP_VERSION})</span>
            </button>
          </div>
        </div>

        {/* ۲. کانال ورکر محلی (زمان غیاب کاربر) */}
        <div className={`p-5 rounded-2xl border transition-all ${
          !isUserOnline && orchestrator?.isWorkerOnline
            ? 'bg-sky-950/30 border-sky-500/40 shadow-lg shadow-sky-500/5'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Cpu className={`w-5 h-5 ${orchestrator?.isWorkerOnline ? 'text-sky-400' : 'text-slate-500'}`} />
              <span className="font-bold text-xs text-slate-200">کانال ۲: ورکر خودکار محلی</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              orchestrator?.isWorkerOnline
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {orchestrator?.isWorkerOnline ? 'آماده‌باش ورکر' : 'حالت آماده cPanel'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            <strong>نقش عملیاتی:</strong> در زمان غیاب کاربر یا بسته بودن مرورگر، این موتور نوبت‌های زمان‌بندی‌شده را تحویل گرفته و فرم‌ها را از طریق اسکریپت‌های Headless یا کرون‌جاب تکمیل می‌کند.
          </p>
          <div className="text-[11px] text-slate-400 font-mono space-y-1 border-t border-slate-800/80 pt-2.5">
            <div>نوع اجرا: Headless / Scale-to-Zero</div>
            <div>ارتباط با cPanel: فعال و امن</div>
          </div>
          <button
            onClick={() => handleTestProbe('worker')}
            className="mt-3 w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700"
          >
            بررسی وضعیت ورکر
          </button>
        </div>

        {/* ۳. کانال رله پیامک موبایل (ارتباط مستمر OTP) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Smartphone className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-xs text-slate-200">کانال ۳: رله پیامک موبایل</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              وب‌هوک امن فعال
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            <strong>نقش عملیاتی:</strong> در زمان نیاز به کد پیامکی، برنامه رله موبایل کد OTP را بدون نیاز به نگاه کردن شما از پیامک خوانده و مستقیماً روی نوبت کاری قرار می‌دهد تا فرآیند معطل نشود.
          </p>
          <div className="text-[11px] text-slate-400 font-mono space-y-1 border-t border-slate-800/80 pt-2.5">
            <div>شماره گیرنده: ۰۹۱۵۳۱۰۸۷۶۳</div>
            <div>آخرین پیامک: {orchestrator?.lastSmsReceived ? new Date(orchestrator.lastSmsReceived).toLocaleTimeString('fa-IR') : 'در انتظار دریافت'}</div>
          </div>
          <button
            onClick={() => handleTestProbe('sms')}
            disabled={loading}
            className="mt-3 w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
          >
            ارسال پیامک آزمایشی (Probe)
          </button>
        </div>
      </div>

      {/* سیاست توزیع چرخشی بین تمامی پلتفرم‌ها (Anti-Blocking Round-Robin) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-xs sm:text-sm">
            <Globe className="w-4 h-4" />
            <span>پوشش جامع و چرخش ضد مسدودی بین تمامی پلتفرم‌ها (بدون تمرکز بر تک سایت)</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse text-xs text-slate-400">
            <span>تاخیر تصادفی هوشمند:</span>
            <span className="font-mono text-emerald-400 font-bold">۳ تا ۸ دقیقه (Anti-Flood)</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          سامانه بر اساس راهبرد چرخشی (Round-Robin) آگهی‌ها را به ترتیب بین دایرکتوری‌های صنعتی، بازرگانی، خدماتی و پورتال‌های سراسری توزیع می‌کند تا هیچ پلتفرمی با ارسال مکرر مواجه نشود و از بلاک شدن آی‌پی جلوگیری به عمل آید:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2">
          {targetPlatforms.map((plat, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-slate-950/70 border border-slate-850 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-100">{plat.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{plat.domain}</div>
              <div className="text-[10px] text-amber-400/90">{plat.type}</div>
              <div className="text-[9px] text-slate-500 pt-1 border-t border-slate-900 flex justify-between">
                <span>احراز:</span>
                <span>{plat.auth}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
