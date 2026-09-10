import React, { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  Pause,
  RotateCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Image as ImageIcon,
  Phone,
  Mail,
  Sliders,
  AlertCircle,
  FileText,
  UserCheck,
  Terminal,
  Copy,
  Check,
  Calendar,
  Layers,
  Activity,
  Zap,
  Globe,
  HelpCircle,
  ExternalLink,
  Send,
} from 'lucide-react';
import { AutonomousSettings, AutonomousLog, CompanyProfile } from '../types/ashk24.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import { clientStorage } from '../services/clientStorageService.js';
import { CronMonitoringModule } from './CronMonitoringModule.js';
import { SmartHelpButton } from './SmartHelpModal.js';

interface AutonomousSecretaryModuleProps {
  company: CompanyProfile;
  onOpenCompanyModal: () => void;
  onRefreshAllData: () => void;
}

export const AutonomousSecretaryModule: React.FC<AutonomousSecretaryModuleProps> = ({
  company,
  onOpenCompanyModal,
  onRefreshAllData,
}) => {
  const [currentTab, setCurrentTab] = useState<'overview' | 'cron_monitor' | 'cron_setup'>('overview');
  const [settings, setSettings] = useState<AutonomousSettings | null>(null);
  const [logs, setLogs] = useState<AutonomousLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRunningNow, setIsRunningNow] = useState<boolean>(false);
  const [isPublishingInternal, setIsPublishingInternal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCron, setCopiedCron] = useState<boolean>(false);
  const [copiedWebCron, setCopiedWebCron] = useState<boolean>(false);
  const [activeHelpSection, setActiveHelpSection] = useState<string | null>(null);

  const fetchAutonomousData = async () => {
    try {
      const [storedSettings, storedLogs] = await Promise.all([
        clientStorage.getAutonomousSettings(),
        clientStorage.getAutonomousLogs(),
      ]);
      setSettings(storedSettings);
      setLogs(storedLogs);
    } catch (e) {
      console.error('Error fetching autonomous data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutonomousData();
    const interval = setInterval(fetchAutonomousData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleEnable = async () => {
    if (!settings) return;
    const updatedStatus = !settings.enabled;
    try {
      const updated = await clientStorage.saveAutonomousSettings({ enabled: updatedStatus });
      setSettings(updated);
      setToastMessage(
        updatedStatus
          ? 'موتور ۲۴ ساعته منشی با موفقیت فعال گردید.'
          : 'فعالیت خودکار ۲۴ ساعته موقتاً متوقف شد.'
      );
      setTimeout(() => setToastMessage(null), 4000);
      fetchAutonomousData();
    } catch (e) {
      console.error('Error updating settings:', e);
    }
  };

  const handleUpdateConfig = async (key: keyof AutonomousSettings, value: any) => {
    try {
      const updated = await clientStorage.saveAutonomousSettings({ [key]: value });
      setSettings(updated);
      fetchAutonomousData();
    } catch (e) {
      console.error('Error saving config:', e);
    }
  };

  const handleRunNow = async () => {
    setIsRunningNow(true);
    setToastMessage(null);
    try {
      const result = await clientStorage.runAutonomousCycleNow();
      if (result && result.success) {
        setToastMessage(result.message || 'چرخه کاوش و انتشار با موفقیت کامل انجام پذیرفت.');
        fetchAutonomousData();
        onRefreshAllData();
      } else {
        setToastMessage(result?.message || 'خطا در اجرای چرخه');
      }
    } catch (e) {
      console.error('Run now error:', e);
      setToastMessage('خطا در اجرای چرخه');
    } finally {
      setIsRunningNow(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handlePublishInternalSiteNow = async () => {
    setIsPublishingInternal(true);
    try {
      const res = await clientStorage.publishToInternalSite({
        title: `تولید انواع کارتن و جعبه بسته‌بندی صادراتی - ${company.brandName}`,
        content: `${company.aboutUsSummary || 'مجتمع تخصصی کارتن‌سازی، جعبه‌سازی و چاپ افست اشک قلم مشهد.'}\n\nتلفن هماهنگی و مشاوره: ${company.phoneNumber}\nآدرس: ${company.address}\nوبسایت: ${company.website}`,
        categoryName: 'اخبار و مقالات',
        tags: company.keywords || ['چاپ', 'کارتن', 'بسته بندی'],
      });

      if (res.success) {
        setToastMessage(`✅ ${res.message} ${res.postUrl ? `(آدرس: ${res.postUrl})` : ''}`);
        onRefreshAllData();
      } else {
        setToastMessage(`⚠️ ${res.message}`);
      }
    } catch (e: any) {
      setToastMessage(`خطای انتشار در سایت داخلی: ${e.message}`);
    } finally {
      setIsPublishingInternal(false);
      setTimeout(() => setToastMessage(null), 7000);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8 text-center text-slate-400 font-medium flex items-center justify-center space-x-2 space-x-reverse">
        <RotateCw className="w-5 h-5 animate-spin text-amber-400" />
        <span>در حال بارگذاری مرکز کنترل منشی ۲۴ ساعته...</span>
      </div>
    );
  }

  const cliCronCommand = `*/10 * * * * /usr/local/bin/php /home/USERNAME/public_html/cpanel-backend/ashk_cron_publisher.php >> /dev/null 2>&1`;
  const webCronUrl = `${window.location.origin}/cpanel-backend/ashk_cron_publisher.php?key=ashk24_secret_key`;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/20 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Sparkles className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-slate-950/10 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Smart Help Modal */}
      {activeHelpSection && (
        <div className="p-4 rounded-2xl bg-blue-950/90 border border-blue-800 text-blue-200 text-xs space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse font-bold text-blue-300">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>راهنمای هوشمند: {activeHelpSection}</span>
            </div>
            <button
              onClick={() => setActiveHelpSection(null)}
              className="text-blue-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="leading-relaxed">
            {activeHelpSection === 'secretary_main' &&
              'این ماژول به صورت خودکار و در بازه‌های مشخص، بسترهای انتشار آگهی و وبلاگ‌ها را بررسی نموده، محتوای سئو اختصاصی تولید و اقدام به درج و نردبان آگهی‌ها می‌نماید.'}
            {activeHelpSection === 'internal_site' &&
              'با اتصال وبلاگ وردپرسی یا اسکریپت PHP سایت داخلی، تمام کمپین‌ها و مقالات تولیدشده به صورت آنی و بدون نیاز به ورود دستی، بر روی سایت اختصاصی شما منتشر می‌شوند.'}
            {activeHelpSection === 'cron_jobs' &&
              'دستور کرون‌جاب لینوکسی را در سی‌پنل قرار دهید تا حتی پس از بستن مرورگر یا خاموش شدن رایانه، منشی ۲۴ ساعته در سرور به فعالیت خود ادامه دهد.'}
          </p>
        </div>
      )}

      {/* Main Autonomous Header Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 space-x-reverse">
            <div
              className={`p-3 rounded-2xl ${
                settings.enabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <h2 className="text-lg font-bold text-slate-100">
                  منشی ۲۴ ساعته مستقل (Autonomous Secretary AI)
                </h2>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                    settings.enabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.enabled ? 'فعال و در حال پایش ۲۴/۷' : 'غیرفعال'}
                </span>
                <SmartHelpButton
                  content={{
                    title: 'منشی ۲۴ ساعته مستقل (Autonomous AI)',
                    summary: 'منشی اتوماتیک به صورت شبانه‌روزی بدون نیاز به اپلیکیشن موبایل، فرم‌های ثبت آگهی وب را پیمایش نموده و متون سئو شرکت را انتشار می‌دهد.',
                    steps: [
                      'دکمه «اجرای فوری چرخه» برای انتشار آنی یک آگهی تست بدون انتظار برای زمان کرون‌جاب است.',
                      'در بخش تنظیمات زمان‌بندی، بازه انتشار (مثلا هر ۲ ساعت) را تعیین کنید.',
                      'تنظیمات کرون‌جاب cPanel را در سرور خود فعال کنید تا فعالیت در حالت آفلاین تداوم یابد.'
                    ],
                    offlineNote: 'منشی ۲۴ ساعته دارای موتور استدلال آفلاین درون برنامه است و مستقل از هوش مصنوعی خارجی عمل می‌کند.'
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                کاوش بسترهای نیازمندی‌ها، تدوین مقالات و متون تبلیغاتی، ثبت‌نام و انتشار خودکار در درگاه‌های بیرونی و سایت داخلی
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 space-x-reverse">
            <button
              onClick={handleToggleEnable}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5 space-x-reverse ${
                settings.enabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-rose-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {settings.enabled ? <Pause className="w-4 h-4 ml-1" /> : <Play className="w-4 h-4 ml-1" />}
              <span>{settings.enabled ? 'توقف فعالیت ۲۴ ساعته' : 'راه‌اندازی منشی ۲۴ ساعته'}</span>
            </button>

            <button
              onClick={handleRunNow}
              disabled={isRunningNow}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ml-1 ${isRunningNow ? 'animate-spin' : ''}`} />
              <span>{isRunningNow ? 'در حال اجرای چرخه...' : 'اجرای آنی یک چرخه کامل'}</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">رسانه‌های کشف شده:</span>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {toPersianDigits(settings.totalDiscoveredCount)} سایت
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">آگهی‌های ثبت‌شده خودکار:</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              {toPersianDigits(settings.totalAutoPublishedCount)} آگهی
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">فواصل پایش وب:</span>
            <div className="text-xl font-extrabold text-slate-200 font-mono">
              هر {toPersianDigits(settings.scanIntervalMinutes)} دقیقه
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">سقف مجاز روزانه:</span>
            <div className="text-xl font-extrabold text-blue-400 font-mono">
              {toPersianDigits(settings.dailyAdLimit)} آگهی در روز
            </div>
          </div>
        </div>
      </div>

      {/* Internal Website Direct Publisher Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <Globe className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <span>انتشار خودکار در وب‌سایت داخلی شرکت ({company.brandName})</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                  WordPress REST API / PHP Bridge
                </span>
              </h3>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={() =>
                setActiveHelpSection(
                  activeHelpSection === 'internal_site' ? null : 'internal_site'
                )
              }
              className="p-1 rounded-full text-slate-400 hover:text-amber-400 hover:bg-slate-800"
              title="راهنما"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={handlePublishInternalSiteNow}
              disabled={isPublishingInternal}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ml-1 ${isPublishingInternal ? 'animate-bounce' : ''}`} />
              <span>{isPublishingInternal ? 'در حال ارسال به وب‌سایت...' : 'انتشار فوری مقاله در وب‌سایت'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500">دامنه وب‌سایت مقصد:</span>
            <div className="font-mono text-amber-400 font-bold truncate">
              {company.website || 'https://ashkghalam.com'}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500">پروتکل اتصال:</span>
            <div className="font-semibold text-slate-200">
              {company.internalSite?.type === 'wordpress_rest'
                ? 'وردپرس REST API مستقیم'
                : 'پل ارتباطی اختصاصی PHP cPanel'}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500">وضعیت اتصال سرور:</span>
            <div className="flex items-center space-x-1.5 space-x-reverse font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>آماده به کار و فعال</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setCurrentTab('overview')}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'overview'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>پیکربندی و نظارت منشی ۲۴ ساعته</span>
        </button>

        <button
          onClick={() => setCurrentTab('cron_monitor')}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'cron_monitor'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>پایش زنده لاگ‌های اجرای Cron Job</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </button>

        <button
          onClick={() => setCurrentTab('cron_setup')}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'cron_setup'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>فرمان‌های کرون‌تب cPanel</span>
        </button>
      </div>

      {/* SUB-TAB 2: LIVE CRON LOGS MONITORING LAYER */}
      {currentTab === 'cron_monitor' && (
        <CronMonitoringModule onRefreshParent={fetchAutonomousData} />
      )}

      {/* SUB-TAB 3: cPanel Cron Job Configuration Generator Card */}
      {currentTab === 'cron_setup' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Terminal className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">
                فرمان‌های زمان‌بندی Cron Job برای استمرار کار در سی‌پنل (cPanel Background Cron)
              </h3>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <button
                onClick={() =>
                  setActiveHelpSection(
                    activeHelpSection === 'cron_jobs' ? null : 'cron_jobs'
                  )
                }
                className="p-1 rounded-full text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                title="راهنما"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-mono font-semibold border border-blue-500/20">
                بدون نیاز به باز بودن مرورگر
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            برای اینکه منشی ۲۴ ساعته حتی وقتی سیستم شما خاموش است یا مرورگر بسته شده به فعالیت ادامه دهد، کافیست یکی از دستورات زیر را در بخش <strong>Cron Jobs</strong> هاست سی‌پنل قرار دهید:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CLI Cron */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">روش اول: اجرای خط فرمان لینوکس (توصیه شده)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(cliCronCommand);
                    setCopiedCron(true);
                    setTimeout(() => setCopiedCron(false), 2000);
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 space-x-reverse"
                >
                  {copiedCron ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCron ? 'کپی شد' : 'کپی دستور'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-900 text-[11px] font-mono text-emerald-400 overflow-x-auto select-all border border-slate-800">
                {cliCronCommand}
              </pre>
            </div>

            {/* Web Cron URL */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">روش دوم: فراخوانی Webhook / cURL</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webCronUrl);
                    setCopiedWebCron(true);
                    setTimeout(() => setCopiedWebCron(false), 2000);
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 space-x-reverse"
                >
                  {copiedWebCron ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebCron ? 'کپی شد' : 'کپی لینک'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-900 text-[11px] font-mono text-blue-400 overflow-x-auto select-all border border-slate-800">
                {webCronUrl}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: Overview & Rules & Activity Stream */}
      {currentTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Vault Overview */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">گاوصندوق دارایی‌های شرکت</h3>
              </div>
              <button
                onClick={onOpenCompanyModal}
                className="text-xs font-bold text-amber-400 hover:underline"
              >
                ویرایش کامل
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-2xl bg-slate-950 border border-slate-800">
                {company?.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt="لوگو"
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-slate-600" />
                )}
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-100 block">{company?.brandName || 'نام برند'}</span>
                  <span className="text-slate-400 text-[10px] block">{company?.name || 'شرکت'}</span>
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">مسئول ارتباطات:</span>
                  <span className="font-medium text-slate-200">{company?.contactPerson || 'تعریف نشده'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">شماره پیامک OTP:</span>
                  <span className="font-mono text-amber-400 font-semibold">{company?.phoneNumber || '-'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">ایمیل سازمانی:</span>
                  <span className="font-mono text-slate-200">{company?.email || '-'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">کد ملی / شناسه ثبتی:</span>
                  <span className="font-mono text-slate-200">{company?.nationalCode || '-'}</span>
                </div>
              </div>

              {/* Product Images Gallery */}
              <div className="space-y-1.5 pt-1">
                <span className="text-slate-400 font-semibold block text-[11px]">
                  تصاویر آماده محصولات (جهت درج در فرم):
                </span>
                <div className="flex items-center space-x-2 space-x-reverse overflow-x-auto pb-1">
                  {(company?.productImages || []).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`محصول ${idx + 1}`}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Configuration & Autonomous Logs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>تنظیمات اختیارات و رفتارهای خودکار</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block">تدوین خودکار کمپین با AI:</span>
                    <span className="text-slate-400 text-[10px]">تولید مقاله و متن آگهی بر اساس متون شرکت</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoCreateCampaigns}
                    onChange={(e) => handleUpdateConfig('autoCreateCampaigns', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block">ثبت و ارسال خودکار آگهی:</span>
                    <span className="text-slate-400 text-[10px]">ارسال داده‌ها به فرم سایت هدف</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoPublishAds}
                    onChange={(e) => handleUpdateConfig('autoPublishAds', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 block">فاصله زمانی کاوش وب (دقیقه):</span>
                  <select
                    value={settings.scanIntervalMinutes}
                    onChange={(e) => handleUpdateConfig('scanIntervalMinutes', Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono outline-none"
                  >
                    <option value={10}>هر ۱۰ دقیقه (توصیه شده)</option>
                    <option value={15}>هر ۱۵ دقیقه</option>
                    <option value={30}>هر ۳۰ دقیقه</option>
                    <option value={60}>هر ۱ ساعت</option>
                    <option value={180}>هر ۳ ساعت</option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 block">سقف انتشار روزانه آگهی:</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={settings.dailyAdLimit}
                    onChange={(e) => handleUpdateConfig('dailyAdLimit', Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Activity Logs Stream */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>دفترچه ثبت تصمیمات و اقدامات خودکار منشی (Live Activity Logs)</span>
              </h3>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(!logs || logs.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    هنوز هیچ لاگی ثبت نشده است.
                  </div>
                ) : (
                  (logs || []).map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center space-x-1.5 space-x-reverse">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              log.status === 'success'
                                ? 'bg-emerald-400'
                                : log.status === 'warning'
                                ? 'bg-amber-400'
                                : log.status === 'error'
                                ? 'bg-red-400'
                                : 'bg-blue-400'
                            }`}
                          />
                          <span>{log.title}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{log.timestamp}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[11px] pr-3.5">{log.details}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

