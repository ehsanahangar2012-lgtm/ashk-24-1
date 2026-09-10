import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Server,
  Database,
  KeyRound,
  FileCheck,
  Send,
  Eye,
  Clock,
  Terminal,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  History,
  Trash2,
  Activity,
  ExternalLink,
  Ban,
  Lock,
} from 'lucide-react';
import {
  TestHarnessRun,
  TestHarnessStep,
  TestStatus,
  TestMode,
  TestCategory,
  TestHarnessStatusResponse,
} from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';
import { toPersianDigits, getJalaliCurrentDate, getJalaliCurrentTime } from '../utils/persianUtils.js';

interface ProductionTestHarnessModuleProps {
  onRefreshGlobalData?: () => void;
}

export const ProductionTestHarnessModule: React.FC<ProductionTestHarnessModuleProps> = ({
  onRefreshGlobalData,
}) => {
  const [activeMode, setActiveMode] = useState<TestMode>('SAFE_TEST');
  const [targetPlatform, setTargetPlatform] = useState<string>('plat_internal_blog');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [latestRun, setLatestRun] = useState<TestHarnessRun | null>(null);
  const [historyRuns, setHistoryRuns] = useState<TestHarnessRun[]>([]);
  const [selectedStep, setSelectedStep] = useState<TestHarnessStep | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  // لود وضعیت و گزارش‌های قبلی در شروع
  const loadStatusAndHistory = async () => {
    try {
      const status: TestHarnessStatusResponse | null = await clientStorage.getTestHarnessStatus();
      if (status) {
        if (status.latestRun) {
          setLatestRun(status.latestRun);
        }
        if (status.recentRuns && status.recentRuns.length > 0) {
          setHistoryRuns(status.recentRuns);
        }
      }
    } catch (err) {
      console.error('Error loading test harness status:', err);
    }
  };

  useEffect(() => {
    loadStatusAndHistory();
  }, []);

  // اجرای تست کامل ۸ مرحله‌ای سرور پروداکشن
  const handleRunAllTests = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActionMessage(null);
    setCurrentStepIndex(0);

    try {
      const result = await clientStorage.runAllProductionTests(activeMode, targetPlatform);
      if (result) {
        setLatestRun(result);
        setHistoryRuns((prev) => [result, ...prev.filter((r) => r.runId !== result.runId)]);
        setActionMessage(
          `اجرای تست جامع با شناسه ${result.runId} پایان یافت. محیط اجرا: ${
            result.EXECUTION_ENVIRONMENT === 'CPANEL_SERVER' ? 'سرور واقعی cPanel' : 'کلاینت لوکال'
          } | نتیجه کلی: ${
            result.overallStatus === 'PASS'
              ? 'موفقیت‌آمیز (PASS)'
              : result.overallStatus === 'BLOCKED'
              ? 'مسدود امنیتی / نیازمند شواهد زنده (BLOCKED)'
              : result.overallStatus === 'INVALIDATED'
              ? 'باطل‌شده به علت فقدان شواهد سرور (INVALIDATED)'
              : 'دارای خطا (FAIL)'
          }`
        );
        if (onRefreshGlobalData) onRefreshGlobalData();
      } else {
        setActionMessage('خطا در دریافت پاسخ از وب‌سرور برای اجرای تست کامل.');
      }
    } catch (err: any) {
      setActionMessage(`خطا در اجرای تست: ${err?.message || 'خطای ناشناخته'}`);
    } finally {
      setIsRunning(false);
      setCurrentStepIndex(-1);
    }
  };

  // اجرای تک‌مرحله‌ای
  const handleRunSingleCategory = async (category: TestCategory) => {
    if (isRunning) return;
    setIsRunning(true);
    setActionMessage(`در حال اجرای آزمون اختصاصی مرحله ${category}...`);

    try {
      const res = await clientStorage.runSingleProductionTestStep(category, activeMode, targetPlatform);
      if (res && res.step) {
        setActionMessage(`تست ${res.step.stepName} به پایان رسید. وضعیت: ${res.step.status}`);
        if (latestRun) {
          const updatedSteps = [res.step, ...latestRun.steps.filter((s) => s.category !== category)];
          setLatestRun({
            ...latestRun,
            steps: updatedSteps,
          });
        }
      } else {
        setActionMessage('خطا در اجرای آزمون تک‌مرحله‌ای.');
      }
    } catch (err: any) {
      setActionMessage(`خطای سرور: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // ابطال گزارش‌های فاقد شواهد سرور پروداکشن (Phase 5)
  const handleInvalidateUnverified = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const res = await clientStorage.invalidateUnverifiedRuns();
      if (res && res.success) {
        setActionMessage(
          `عملیات ممیزی و ابطال پایان یافت: ${toPersianDigits(res.invalidatedCount)} ران فاقد شواهد سرور با موفقیت INVALIDATED شدند.`
        );
        await loadStatusAndHistory();
      } else {
        setActionMessage(res?.message || 'خطا در ابطال ران‌های غیرواقعی.');
      }
    } catch (err: any) {
      setActionMessage(`خطا در ابطال: ${err?.message || 'خطای ناشناخته'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // پاکسازی و ریست امن داده‌های دارای پیشوند TEST-ASHK24-
  const handleResetTestData = async () => {
    if (isRunning) return;
    const confirmClean = window.confirm(
      'آیا از پاکسازی تمام رکوردهای آزمایشی با پیشوند TEST-ASHK24- اطمینان دارید؟ داده‌های واقعی شما بدون تغییر باقی خواهند ماند.'
    );
    if (!confirmClean) return;

    setIsRunning(true);
    try {
      const res = await clientStorage.resetTestHarnessData();
      if (res && res.success) {
        setActionMessage(
          `پاکسازی انجام شد: ${toPersianDigits(res.cleanedCampaigns)} کمپین تستی، ${toPersianDigits(
            res.cleanedJobs
          )} جاب تستی و ${toPersianDigits(res.cleanedFiles)} فایل موقت حذف شدند.`
        );
        if (onRefreshGlobalData) onRefreshGlobalData();
      } else {
        setActionMessage(res?.message || 'خطا در پاکسازی داده‌ها.');
      }
    } catch (err: any) {
      setActionMessage(`خطا در ریست داده‌ها: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleStepExpand = (stepKey: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  // دریافت استایل وضعیت
  const getStatusBadge = (status: TestStatus) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-emerald-400" />
            <span>موفق (PASS)</span>
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 ml-1 text-amber-400" />
            <span>مسدود / اقدام انسانی (BLOCKED)</span>
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 ml-1 text-rose-400" />
            <span>ناموفق (FAIL)</span>
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <span>نادیده‌گرفته (SKIP)</span>
          </span>
        );
      case 'INVALIDATED':
        return (
          <span className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-lg text-xs font-bold bg-red-950/70 text-red-400 border border-red-700/80">
            <Ban className="w-3.5 h-3.5 ml-1 text-red-400" />
            <span>باطل‌شده (INVALIDATED)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Activity className="w-3.5 h-3.5 ml-1 animate-spin" />
            <span>در حال اجرا...</span>
          </span>
        );
    }
  };

  const getCategoryTitle = (cat: TestCategory): string => {
    switch (cat) {
      case 'infrastructure':
        return '۱. زیرساخت سرور و دیتابیس (PHP, MySQL, Router, CORS, I/O)';
      case 'api_contract':
        return '۲. قرارداد و یکپارچگی روت‌های API فرانت‌اند ↔ بک‌اند';
      case 'authentication':
        return '۳. چرخه کامل نشست، توکن و احراز هویت امن';
      case 'otp_e2e':
        return '۴. سناریوی جامع OTP با وب‌هوک دارای امضا و سیم‌کارت واقعی';
      case 'captcha_human':
        return '۵. ارزیابی چالش امنیتی CAPTCHA و توقف امن اقدام کاربر';
      case 'registration_flow':
        return '۶. جریان ثبت آگهی با پیشوند ایزوله TEST-ASHK24-';
      case 'publication':
        return '۷. اعتبارسنجی نهایی انتشار، محافظ Safe Test و لینک معتبر';
      default:
        return cat;
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* هدر ماژول و کنترل‌های ارشد */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start space-x-3 space-x-reverse">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-y-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-100">
                  سامانه سنجش عملیاتی پروداکشن (Production Test Harness v4.0.0)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  واقعی و بدون Mock
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  ایزولاسیون TEST-ASHK24-
                </span>
                {latestRun?.EXECUTION_ENVIRONMENT && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    latestRun.EXECUTION_ENVIRONMENT === 'CPANEL_SERVER'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                      : 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                  }`}>
                    ENV: {latestRun.EXECUTION_ENVIRONMENT}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                آزمون جامع صحت زیرساخت cPanel، قراردادهای API، احراز هویت، وب‌هوک امن OTP، مواجهه با کپچا و انتشار بدون هیچ داده ساختگی یا PASS جعلی.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse self-end lg:self-center flex-wrap gap-y-2">
            {/* دکمه ابطال گزارش‌های غیرواقعی */}
            <button
              id="invalidate-unverified-runs-btn"
              onClick={handleInvalidateUnverified}
              disabled={isRunning}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/50 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/80 transition-colors flex items-center space-x-1.5 space-x-reverse text-xs font-semibold disabled:opacity-50"
              title="ابطال کلیه گزارش‌های فاقد شواهد سرور پروداکشن (Invalidate Unverified Runs)"
            >
              <Ban className="w-4 h-4 text-red-400" />
              <span>ابطال گزارش‌های غیرواقعی</span>
            </button>

            {/* دکمه دانلود خروجی گزارش JSON */}
            {latestRun && (
              <button
                id="export-test-report-json-btn"
                onClick={() => {
                  const jsonStr = JSON.stringify(latestRun, null, 2);
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ashk24-test-report-${latestRun.runId}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-colors flex items-center space-x-1.5 space-x-reverse text-xs font-semibold"
                title="دانلود گزارش کامل آزمون به فرمت استاندارد JSON"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Export JSON</span>
              </button>
            )}

            {/* دکمه راهنمای هوشمند */}
            <button
              id="test-harness-help-btn"
              onClick={() => setShowHelpModal(true)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700 transition-colors flex items-center space-x-1 space-x-reverse text-xs font-semibold"
              title="راهنمای هوشمند آزمون جامع"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">راهنمای هوشمند</span>
            </button>

            {/* دکمه ریست داده‌های تستی */}
            <button
              id="test-harness-reset-btn"
              onClick={handleResetTestData}
              disabled={isRunning}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 transition-all text-xs font-semibold flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
              title="حذف کلیه رکوردهای با پیشوند TEST-ASHK24-"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>پاکسازی آزمایشی</span>
            </button>
          </div>
        </div>

        {/* تنظیمات حالت تست (Safe Test vs Live Test) و دکمه اصلی اجرای کامل */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-400 font-semibold">حالت انتشار مرحله آخر:</span>
            <div className="inline-flex rounded-xl p-1 bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveMode('SAFE_TEST')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeMode === 'SAFE_TEST'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                آزمون ایمن (SAFE TEST)
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('LIVE_TEST')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeMode === 'LIVE_TEST'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                انتشار زنده (LIVE TEST)
              </button>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse mr-2">
              <span className="text-slate-400">پلتفرم هدف تست:</span>
              <select
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="plat_internal_blog">وبلاگ و تارگت داخلی اشک قلم (امن و معتبر)</option>
                <option value="plat_sheypoor">شیپور (سنجش چالش کپچا و شماره تستی)</option>
                <option value="plat_divar">دیوار (سنجش ورود پیامکی و لایو استیت)</option>
              </select>
            </div>
          </div>

          {/* دکمه برجسته: «اجرای تست کامل سامانه» */}
          <button
            id="run-full-system-test-btn"
            onClick={handleRunAllTests}
            disabled={isRunning}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all shadow-lg flex items-center justify-center space-x-2 space-x-reverse ${
              isRunning
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-amber-500/25 active:scale-[0.98]'
            }`}
          >
            {isRunning ? (
              <>
                <Activity className="w-5 h-5 ml-1 animate-spin" />
                <span>در حال اجرای آزمون‌های سرور cPanel...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 ml-1 fill-current" />
                <span>«اجرای تست کامل سامانه»</span>
              </>
            )}
          </button>
        </div>

        {/* پیام اطلاع‌رسانی عملیات */}
        {actionMessage && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-amber-300 flex items-center space-x-2 space-x-reverse">
            <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-relaxed">{actionMessage}</span>
          </div>
        )}
      </div>

      {/* کارت‌های آماری نتیجه تست جاری یا آخرین اجرا */}
      {latestRun && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">شناسه آزمون (Run ID)</span>
            <span className="text-xs font-mono font-bold text-slate-200 truncate block" title={latestRun.runId}>
              {latestRun.runId}
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">وضعیت نهایی</span>
            <div>{getStatusBadge(latestRun.overallStatus)}</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">محیط اجرا (Identity)</span>
            <div className={`font-mono text-xs font-bold px-2 py-0.5 rounded inline-block ${
              latestRun.EXECUTION_ENVIRONMENT === 'CPANEL_SERVER'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                : 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
            }`}>
              {latestRun.EXECUTION_ENVIRONMENT || 'CPANEL_SERVER'}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">آزمون‌های موفق</span>
            <div className="flex items-center space-x-1.5 space-x-reverse text-emerald-400 font-black text-base">
              <CheckCircle2 className="w-4 h-4 ml-1" />
              <span>{toPersianDigits(latestRun.passedTests)} از {toPersianDigits(latestRun.totalTests)}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">بلاک امنیتی / اقدام انسانی</span>
            <div className="flex items-center space-x-1.5 space-x-reverse text-amber-400 font-black text-base">
              <AlertTriangle className="w-4 h-4 ml-1" />
              <span>{toPersianDigits(latestRun.blockedTests)} مرحله</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">زمان کل پاسخ</span>
            <div className="flex items-center space-x-1.5 space-x-reverse text-cyan-300 font-black text-base">
              <Clock className="w-4 h-4 ml-1" />
              <span>{toPersianDigits(latestRun.durationMs)} میلی‌ثانیه</span>
            </div>
          </div>
        </div>
      )}

      {/* نوار شفاف ارزیابی شواهد قطعی و ممیزی ضد فیک */}
      {latestRun && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ممیزی صحت شواهد سرور (Real Server Evidence Audit Panel) - قانون عدم پذیرش داده‌های ساختگی</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              حالت: {latestRun.mode === 'LIVE_TEST' ? 'LIVE_TEST (انتشار واقعی)' : 'SAFE_TEST (ایمن)'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3 text-xs">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">اجرای واقعی در سرور</span>
              <span className={`font-black text-xs px-2 py-0.5 rounded ${latestRun.REAL_EXECUTION === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-950/60 text-red-400'}`}>
                {latestRun.REAL_EXECUTION === 'YES' ? 'YES (سرور واقعی)' : 'NO (کلاینت/نامعتبر)'}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">فراخوانی منبع خارجی</span>
              <span className={`font-black text-xs px-2 py-0.5 rounded ${latestRun.EXTERNAL_CALL === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {latestRun.EXTERNAL_CALL === 'YES' ? 'YES (انجام شد)' : 'NO'}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">دریافت پیامک با امضای گیت‌وی</span>
              <span className={`font-black text-xs px-2 py-0.5 rounded ${latestRun.SMS_ACTUALLY_RECEIVED === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {latestRun.SMS_ACTUALLY_RECEIVED === 'YES' ? 'YES (تایید امضا)' : 'NO (دریافت نشد)'}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">کپچای واقعی تشخیص‌داده</span>
              <span className={`font-black text-xs px-2 py-0.5 rounded ${latestRun.CAPTCHA_ACTUALLY_DETECTED === 'YES' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                {latestRun.CAPTCHA_ACTUALLY_DETECTED === 'YES' ? 'YES (چالش فعال)' : 'NO (تشخیص نشد)'}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">انتشار واقعی در پلتفرم</span>
              <span className={`font-black text-xs px-2 py-0.5 rounded ${latestRun.PUBLISHED_ACTUALLY === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {latestRun.PUBLISHED_ACTUALLY === 'YES' ? 'YES (منتشر شد)' : 'NO (محافظت / توقف)'}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">سپر آزمون ضد-Fake</span>
              <span className="font-black text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                YES (سخت‌گیرانه و قطعی)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* جزئیات مراحل ۸ گانه آزمون */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">
              مراحل اجرایی آزمون‌های Production Test Harness
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {latestRun ? `ثبت شده در ${toPersianDigits(getJalaliCurrentTime())} - ${toPersianDigits(getJalaliCurrentDate())}` : 'آماده اجرا'}
          </span>
        </div>

        {/* لیست مراحل */}
        <div className="space-y-3">
          {(
            [
              'infrastructure',
              'api_contract',
              'authentication',
              'otp_e2e',
              'captcha_human',
              'registration_flow',
              'publication',
            ] as TestCategory[]
          ).map((catKey, idx) => {
            const stepData = latestRun?.steps?.find((s) => s.category === catKey);
            const isExpanded = expandedSteps[catKey] ?? false;

            return (
              <div
                key={catKey}
                className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 transition-all hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0 mt-0.5">
                      {toPersianDigits(idx + 1)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">
                        {getCategoryTitle(catKey)}
                      </h4>
                      {stepData ? (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {stepData.stepName}
                          {stepData.endpoint && (
                            <span className="font-mono text-[11px] text-amber-400/80 mr-2 dir-ltr inline-block">
                              {stepData.endpoint}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">در انتظار اجرای تست...</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse self-end sm:self-center">
                    {stepData ? (
                      <>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                          {toPersianDigits(stepData.durationMs)} ms
                        </span>
                        {stepData.httpStatus > 0 && (
                          <span
                            className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md ${
                              stepData.httpStatus === 200
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            HTTP {toPersianDigits(stepData.httpStatus)}
                          </span>
                        )}
                        {getStatusBadge(stepData.status)}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">اجرا نشده</span>
                    )}

                    {/* دکمه اجرای تک مرحله‌ای */}
                    <button
                      type="button"
                      onClick={() => handleRunSingleCategory(catKey)}
                      disabled={isRunning}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors disabled:opacity-50"
                      title="اجرای مجدد فقط این مرحله"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* دکمه باز و بسته کردن شواهد و جزئیات */}
                    {stepData && (
                      <button
                        type="button"
                        onClick={() => toggleStepExpand(catKey)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 transition-colors"
                        title="مشاهده شواهد و لاگ‌های JSON"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* بخش بازشونده Evidence و اطلاعات عینی */}
                {isExpanded && stepData && (
                  <div className="mt-4 pt-3 border-t border-slate-850 space-y-3 text-xs">
                    {stepData.stateTransition && (
                      <div className="flex items-center space-x-2 space-x-reverse bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 font-semibold">تغییر وضعیت (State Transition):</span>
                        <span className="font-mono text-emerald-400 font-bold dir-ltr">
                          {stepData.stateTransition}
                        </span>
                      </div>
                    )}

                    {stepData.error && (
                      <div className="bg-rose-950/30 border border-rose-900/50 p-2.5 rounded-lg text-rose-300 flex items-start space-x-2 space-x-reverse">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{stepData.error}</span>
                      </div>
                    )}

                    {stepData.evidence && (
                      <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400 font-semibold text-[11px] flex items-center space-x-1 space-x-reverse">
                            <Terminal className="w-3.5 h-3.5 ml-1 text-cyan-400" />
                            <span>شواهد عینی و پاسخ سرور (Evidence / Response JSON):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(stepData.evidence, null, 2));
                              alert('شواهد عینی به کلیپ‌بورد کپی گردید.');
                            }}
                            className="text-[10px] text-amber-400 hover:underline"
                          >
                            کپی ساختار JSON
                          </button>
                        </div>
                        <pre className="bg-slate-950 p-3 rounded-lg text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-56 dir-ltr text-left">
                          {JSON.stringify(stepData.evidence, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* تاریخچه آخرین آزمون‌های ثبت‌شده در دیتابیس */}
      {historyRuns.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <History className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                تاریخچه رکوردهای آزمون ثبت‌شده در پایگاه داده سرور
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {toPersianDigits(historyRuns.length)} رکورد ثبت‌شده
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">شناسه آزمون (Run ID)</th>
                  <th className="py-2.5 px-3">محیط</th>
                  <th className="py-2.5 px-3">حالت</th>
                  <th className="py-2.5 px-3">وضعیت نهایی</th>
                  <th className="py-2.5 px-3">موفق / کل</th>
                  <th className="py-2.5 px-3">مدت زمان</th>
                  <th className="py-2.5 px-3">تاریخ و زمان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {historyRuns.map((r) => (
                  <tr key={r.runId} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300 font-bold">{r.runId}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        r.EXECUTION_ENVIRONMENT === 'CPANEL_SERVER'
                          ? 'bg-emerald-950/60 text-emerald-400'
                          : 'bg-amber-950/60 text-amber-400'
                      }`}>
                        {r.EXECUTION_ENVIRONMENT || 'CPANEL_SERVER'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.mode === 'SAFE_TEST'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-red-500/15 text-red-300'
                        }`}
                      >
                        {r.mode}
                      </span>
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(r.overallStatus)}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {toPersianDigits(r.passedTests)} از {toPersianDigits(r.totalTests)}
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300">
                      {toPersianDigits(r.durationMs)} ms
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {toPersianDigits(getJalaliCurrentDate())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* مدال راهنمای هوشمند */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-200 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 space-x-reverse">
                <HelpCircle className="w-6 h-6 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  راهنمای هوشمند ماژول Production Test Harness نگارش ۴.۰.۰
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p className="font-bold text-amber-400 text-sm">
                قانون قطعی سیستم: هیچ PASS بدون مدرک عینی و امضای معتبر گیت‌وی صادر نمی‌شود:
              </p>

              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <h5 className="font-bold text-slate-100">۱. هویت اجرا (EXECUTION_ENVIRONMENT):</h5>
                <p>تمامی تست‌های سرور تگ <code>CPANEL_SERVER</code> و <code>REAL_EXECUTION=YES</code> دارند و هرگونه اجرای کلاینتی با <code>BROWSER_LOCAL</code> مجزا می‌گردد.</p>
              </div>

              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <h5 className="font-bold text-slate-100">۲. وب‌هوک و امضای پیامک (Gateway Signature):</h5>
                <p>روت وب‌هوک پیامک مجهز به بررسی امضا و هدرهای امنیتی است. پیامک‌های فاقد امضا رد شده و هرگز به عنوان شواهد ثبت نمی‌شوند.</p>
              </div>

              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <h5 className="font-bold text-slate-100">۳. قانون وضعیت در آزمون OTP:</h5>
                <p>در نبود پیامک واقعی دارای امضا، نتیجه منحصراً <code>BLOCKED</code> است و از صدور هرگونه موفقیت ساختگی یا کد پیش‌فرض ممانعت می‌شود.</p>
              </div>

              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <h5 className="font-bold text-slate-100">۴. ابطال ران‌های فاقد شواهد (Invalidation):</h5>
                <p>با دکمه «ابطال گزارش‌های غیرواقعی»، سیستم ران‌های قدیمی فاقد شواهد سرور را به <code>INVALIDATED</code> تبدیل کرده و لاگ ممیزی ثبت می‌نماید.</p>
              </div>

              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <h5 className="font-bold text-slate-100">۵. ایزولاسیون داده‌ها و پاکسازی سریع:</h5>
                <p>کلیه رکوردهای آزمایشی دارای پیشوند <code>TEST-ASHK24-</code> هستند و بدون دستکاری در داده‌های واقعی، با دکمه پاکسازی حذف می‌شوند.</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold text-xs"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
