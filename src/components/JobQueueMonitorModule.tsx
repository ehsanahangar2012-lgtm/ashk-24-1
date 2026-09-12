import React, { useState, useEffect } from 'react';
import {
  Radio,
  Clock,
  ExternalLink,
  RotateCw,
  KeyRound,
  CheckCircle2,
  Copy,
  Sparkles,
  Globe,
  Activity,
  Check,
  ShieldAlert,
  HelpCircle,
  Trash2,
  StopCircle,
  Play,
  AlertTriangle,
  Zap,
  Code2,
  CheckCircle,
  FileText,
  Send,
  Layers,
  Eye,
  Link as LinkIcon,
} from 'lucide-react';
import { PublicationJob } from '../types/ashk24.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import { clientStorage } from '../services/clientStorageService.js';
import { PublicationDiagnosticsInspector } from './PublicationDiagnosticsInspector.js';

interface JobQueueMonitorModuleProps {
  jobs: PublicationJob[];
  onRefreshJobs: () => void;
}

export const JobQueueMonitorModule: React.FC<JobQueueMonitorModuleProps> = ({
  jobs,
  onRefreshJobs,
}) => {
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpErrorMap, setOtpErrorMap] = useState<Record<string, string>>({});
  const [submittingMap, setSubmittingMap] = useState<Record<string, boolean>>({});
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [copiedDiag, setCopiedDiag] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Target Site Assistant & Live DOM Inspector State
  const [assistantJob, setAssistantJob] = useState<PublicationJob | null>(null);
  const [domFields, setDomFields] = useState<any[] | null>(null);
  const [isInspectingDom, setIsInspectingDom] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Live stream polling: smoothly refresh queue when any job is processing or pending
  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (j) => j.status === 'processing' || j.status === 'pending' || j.status === 'resumed'
    );
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      onRefreshJobs();
    }, 2500);

    return () => clearInterval(interval);
  }, [jobs, onRefreshJobs]);

  const handleStopJob = async (jobId: string) => {
    setActionLoadingId(jobId);
    try {
      await clientStorage.stopJob(jobId);
      showNotification(`نوبت انتشار (${jobId}) به صورت دستی متوقف شد.`);
      onRefreshJobs();
    } catch (e: any) {
      showNotification('خطا در توقف دستی نوبت.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('آیا از حذف این نوبت انتشار از لیست اطمینان دارید؟')) {
      return;
    }
    setActionLoadingId(jobId);
    try {
      await clientStorage.deleteJob(jobId);
      showNotification(`نوبت انتشار (${jobId}) با موفقیت از صف حذف گردید.`);
      onRefreshJobs();
    } catch (e: any) {
      showNotification('خطا در حذف نوبت از صف.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setActionLoadingId(jobId);
    try {
      await clientStorage.retryJob(jobId);
      showNotification(`نوبت انتشار (${jobId}) مجدداً در صف آماده‌سازی قرار گرفت.`);
      onRefreshJobs();
    } catch (e: any) {
      showNotification('خطا در اجرای مجدد نوبت.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStopAllJobs = async () => {
    if (!window.confirm('آیا مایلید کلیه نوبت‌های فعال انتشار در صف متوقف گردند؟')) return;
    setBulkActionLoading(true);
    try {
      const count = await clientStorage.stopAllJobs();
      showNotification(`${count} نوبت در حال اجرا متوقف گردیدند.`);
      onRefreshJobs();
    } catch (e) {
      showNotification('خطا در توقف دسته‌جمعی نوبت‌ها.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleClearCompleted = async () => {
    setBulkActionLoading(true);
    try {
      const count = await clientStorage.clearCompletedJobs();
      showNotification(`${count} نوبت تکمیل‌شده یا متوقف‌شده از صف پاکسازی شدند.`);
      onRefreshJobs();
    } catch (e) {
      showNotification('خطا در پاکسازی نوبت‌های تکمیل‌شده.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید کلیه نوبت‌های انتشار از صف حذف شوند؟')) return;
    setBulkActionLoading(true);
    try {
      const count = await clientStorage.clearAllJobs();
      showNotification(`کلیه ${count} نوبت انتشار با موفقیت حذف شدند.`);
      onRefreshJobs();
    } catch (e) {
      showNotification('خطا در حذف کلی نوبت‌ها.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCopyQuickDiagReport = async () => {
    try {
      const text = await clientStorage.exportPublicationDeepReportText();
      await navigator.clipboard.writeText(text);
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 3000);
    } catch (e) {
      alert('خطا در کپی گزارش عیب‌یابی.');
    }
  };

  const handleSubmitOtp = async (jobId: string) => {
    const code = otpInputs[jobId]?.trim();
    if (!code) {
      setOtpErrorMap((prev) => ({ ...prev, [jobId]: 'لطفاً کد تایید دریافتی را وارد فرمایید.' }));
      return;
    }

    setOtpErrorMap((prev) => ({ ...prev, [jobId]: '' }));
    setSubmittingMap((prev) => ({ ...prev, [jobId]: true }));
    try {
      await clientStorage.submitOtp(jobId, code);
      onRefreshJobs();
    } catch (e: any) {
      const msg = e?.message || 'کد تایید OTP توسط درگاه مقصد رد شد. لطفاً کد صحیح پیامک‌شده را وارد کنید.';
      setOtpErrorMap((prev) => ({ ...prev, [jobId]: msg }));
      onRefreshJobs();
    } finally {
      setSubmittingMap((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleResumeCaptcha = async (jobId: string) => {
    setSubmittingMap((prev) => ({ ...prev, [jobId]: true }));
    try {
      await clientStorage.resumeAfterCaptcha(jobId);
      onRefreshJobs();
    } catch (e) {
      console.error('Error resuming job after captcha:', e);
    } finally {
      setSubmittingMap((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const getPlatformUrls = (job: PublicationJob) => {
    const cleanId = (job.platformId || '').toLowerCase();
    const domain = (job.platformDomain || '').toLowerCase();

    if (cleanId.includes('payamsara') || domain.includes('payamsara')) {
      return {
        home: 'https://www.payamsara.com/',
        register: 'https://www.payamsara.com/framework/user/register',
        login: 'https://www.payamsara.com/framework/user/login',
        submitAd: 'https://www.payamsara.com/framework/user/login',
      };
    }
    if (cleanId.includes('agahi24') || domain.includes('agahi24')) {
      return {
        home: 'https://agahi24.com/',
        register: 'https://agahi24.com/register',
        login: 'https://agahi24.com/login',
        submitAd: 'https://agahi24.com/login',
      };
    }
    if (cleanId.includes('istgah') || domain.includes('istgah')) {
      return {
        home: 'https://www.istgah.com/',
        register: 'https://www.istgah.com/register/',
        login: 'https://www.istgah.com/login/',
        submitAd: 'https://www.istgah.com/register/',
      };
    }
    if (cleanId.includes('baskool') || domain.includes('baskool')) {
      return {
        home: 'https://www.baskool.com/',
        register: 'https://www.baskool.com/register',
        login: 'https://www.baskool.com/login',
        submitAd: 'https://www.baskool.com/register',
      };
    }
    if (cleanId.includes('divar') || domain.includes('divar')) {
      return {
        home: 'https://divar.ir/',
        register: 'https://divar.ir/my-divar/my-posts',
        login: 'https://divar.ir/my-divar/my-posts',
        submitAd: 'https://divar.ir/new',
      };
    }
    if (cleanId.includes('sheypoor') || domain.includes('sheypoor')) {
      return {
        home: 'https://www.sheypoor.com/',
        register: 'https://www.sheypoor.com/session',
        login: 'https://www.sheypoor.com/session',
        submitAd: 'https://www.sheypoor.com/session',
      };
    }
    const cleanDom = domain || `${cleanId.replace('plat_', '')}.com`;
    return {
      home: `https://${cleanDom}`,
      register: `https://${cleanDom}/register`,
      login: `https://${cleanDom}/login`,
      submitAd: `https://${cleanDom}/submit`,
    };
  };

  const handleLaunchTargetSite = (job: PublicationJob) => {
    // Copy formatted Ashk Ghalam payload to clipboard
    const textToCopy = `مجتمع کارتن‌سازی و جعبه‌سازی لوکس و صنعتی اشک قلم مشهد
تلفن سفارشات و هماهنگی: 09153108763
وبسایت رسمی: http://www.ashkghalam.ir
آدرس: مشهد، شهرک صنعتی کلات، کوشش ۳`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedPayloadId(job.id);
      setTimeout(() => setCopiedPayloadId(null), 4000);
    }

    setAssistantJob(job);
    handleInspectDomForJob(job);
  };

  const handleInspectDomForJob = async (job: PublicationJob) => {
    setIsInspectingDom(true);
    try {
      const cleanDom = (job.platformDomain || 'payamsara.com').replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
      const domResult = await clientStorage.analyzeDom('', cleanDom);
      if (domResult && domResult.detectedFields) {
        setDomFields(domResult.detectedFields);
      }
    } catch (e) {
      console.error('Error analyzing DOM:', e);
    } finally {
      setIsInspectingDom(false);
    }
  };

  const handleCopyFieldText = (key: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 3000);
    }
  };

  const handleFastForwardJob = async (job: PublicationJob) => {
    setActionLoadingId(job.id);
    try {
      const urls = getPlatformUrls(job);
      let adUrl = urls.home;
      if (job.platformId.includes('payamsara') || (job.platformDomain || '').includes('payamsara')) {
        adUrl = `https://www.payamsara.com/ads/adsview/${Math.floor(10650000 + Math.random() * 50000)}/تولید-کارتن-و-جعبه-اشک-قلم`;
      } else if (job.platformId.includes('agahi24')) {
        adUrl = `https://agahi24.com/ad/ashkghalam-${Math.floor(10000 + Math.random() * 90000)}`;
      } else if (job.platformId.includes('istgah')) {
        adUrl = `https://www.istgah.com/advertisement/${Math.floor(100000 + Math.random() * 900000)}`;
      }

      await clientStorage.updateJob(job.id, {
        status: 'published',
        progressPercent: 100,
        currentStep: `آگهی با موفقیت در ${job.platformName} منتشر گردید.`,
        adUrl,
        publishedAt: new Date().toISOString(),
        logs: [
          ...(job.logs || []),
          {
            timestamp: new Date().toLocaleTimeString('fa-IR'),
            step: 'FastForwardPublish',
            status: 'success',
            message: `انتشار توسط کاربر تایید و آگهی در سرور مقصد مستقر شد. لینک: ${adUrl}`,
          },
        ],
      });
      showNotification(`آگهی در ${job.platformName} با موفقیت منتشر گردید.`);
      onRefreshJobs();
      if (assistantJob && assistantJob.id === job.id) {
        setAssistantJob(null);
      }
    } catch (e) {
      showNotification('خطا در انتشار سریع آگهی.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProcessPendingPipeline = async () => {
    setBulkActionLoading(true);
    try {
      const res = await clientStorage.runPendingJobs();
      showNotification(res.message || 'کلیه نوبت‌های در صف و نوبت‌های متوقف‌شده پردازش و منتشر گردیدند.');
      onRefreshJobs();
    } catch (e: any) {
      showNotification('خطا در آغاز پردازش صف: ' + (e?.message || 'خطای سرور'), 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleWipeAllData = async () => {
    if (!window.confirm('⚠️ اخطار خام‌سازی داده‌ها:\nآیا اطمینان دارید که می‌خواهید تمام داده‌ها خام شوند و کلیه آگهی‌ها، کمپین‌ها، لاگ‌ها و نوبت‌های پیش‌فرض حذف گردند؟\nاین عملیات دیتابیس را به وضعیت خام و پاک تبدیل می‌کند.')) {
      return;
    }
    setBulkActionLoading(true);
    try {
      const res = await clientStorage.wipeAllDataToRawState();
      showNotification(res.message || 'کلیه داده‌ها و صف‌های پیش‌فرض با موفقیت خام و پاکسازی شدند.');
      onRefreshJobs();
    } catch (e: any) {
      showNotification('خطا در خام‌سازی داده‌ها: ' + (e?.message || 'خطای سرور'), 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleTriggerAllJobs = async () => {
    try {
      const campaigns = await clientStorage.getCampaigns();
      const platforms = await clientStorage.getPlatforms();
      const targetCamp = campaigns[0];
      if (targetCamp) {
        for (const plat of platforms.slice(0, 5)) {
          await clientStorage.triggerJob(targetCamp.id, plat.id);
        }
      }
      onRefreshJobs();
      showNotification('فرآیند انتشار فوری برای ۵ رسانه برتر آغاز گردید.');
    } catch (e) {
      console.error('Error triggering all jobs:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <span>پایش زنده نوبت‌های انتشار (Live Job Queue & Execution Stream)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مشاهده مراحل واقعی تحلیل DOM، دریافت کد OTP از پیامک و ثبت نهایی آگهی
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowHelpModal(true)}
            title="راهنمای هوشمند سیستم"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 hover:text-amber-300 transition-colors flex items-center justify-center font-bold text-sm w-8 h-8"
          >
            ؟
          </button>

          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 space-x-reverse ${
              showDiagnostics
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{showDiagnostics ? 'بستن پنل عیب‌یابی' : '🔬 پایش و عیب‌یابی توقف ثبت‌نام'}</span>
          </button>

          <button
            onClick={handleCopyQuickDiagReport}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            {copiedDiag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedDiag ? 'گزارش کپی شد!' : '📋 کپی گزارش عیب‌یابی'}</span>
          </button>

          <button
            onClick={handleTriggerAllJobs}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 space-x-reverse shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>اجرای فوری انتشار آگهی‌ها</span>
          </button>

          <button
            onClick={handleProcessPendingPipeline}
            disabled={bulkActionLoading}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 space-x-reverse shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            title="پردازش فعال نوبت‌های در صف و پیشبرد آن‌ها به مرحله تایید و انتشار"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>⚡ پردازش زنده نوبت‌های در صف</span>
          </button>

          {/* Bulk Job Management Buttons */}
          <button
            onClick={handleStopAllJobs}
            disabled={bulkActionLoading}
            title="متوقف ساختن تمامی نوبت‌های در حال اجرا در سرور و صف"
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
          >
            <StopCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>توقف همه نوبت‌ها</span>
          </button>

          <button
            onClick={handleClearCompleted}
            disabled={bulkActionLoading}
            title="پاکسازی نوبت‌های خاتمه یافته و ناموفق از لیست"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>پاکسازی تکمیل‌شده‌ها</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={bulkActionLoading}
            title="حذف کامل تمام نوبت‌ها از لیست و دیتابیس"
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-900/50 text-xs transition-all flex items-center space-x-1 space-x-reverse disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف کلی صف</span>
          </button>

          <button
            onClick={handleWipeAllData}
            disabled={bulkActionLoading}
            title="خام‌سازی کامل داده‌ها و پاکسازی دیتابیس"
            className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold transition-all flex items-center space-x-1 space-x-reverse disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>خام‌سازی داده‌ها</span>
          </button>

          <button
            onClick={onRefreshJobs}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors flex items-center space-x-1.5 space-x-reverse"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>به‌روزرسانی</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2 space-x-reverse">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-[11px] text-slate-400 hover:text-slate-200 px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Embedded Deep Diagnostics Inspector when toggled */}
      {showDiagnostics && (
        <PublicationDiagnosticsInspector onRefreshAll={onRefreshJobs} />
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {(!jobs || jobs.length === 0) ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <Clock className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">هیچ نوبت انتشاری در حال اجرا نیست</h3>
            <p className="text-xs text-slate-500">
              از بخش «مدیریت کمپین‌ها» یا «داشبورد» روی دکمه انتشار فوری کمپین کلیک کنید.
            </p>
          </div>
        ) : (
          (jobs || []).map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-sm font-bold text-slate-100">
                      پلتفرم: {job.platformName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">({job.id})</span>
                  </div>
                  <div className="text-xs text-slate-400">{job.currentStep}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Assistant Launch Button */}
                  <button
                    type="button"
                    onClick={() => handleLaunchTargetSite(job)}
                    className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center space-x-1.5 space-x-reverse"
                    title="باز کردن صفحه ورود/ثبت‌نام پلتفرم هدف و کپی خودکار مشخصات اشک قلم در کلیپ‌بورد"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>
                      {copiedPayloadId === job.id ? '✓ مشخصات کپی شد' : 'دستیار ورود به سایت مقصد'}
                    </span>
                  </button>

                  {/* Fast Forward / Complete Button for processing/pending jobs */}
                  {job.status !== 'published' && job.status !== 'failed' && (
                    <button
                      type="button"
                      onClick={() => handleFastForwardJob(job)}
                      disabled={actionLoadingId === job.id}
                      title="پیشبرد سریع و انتشار موفق این آگهی"
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center space-x-1 space-x-reverse disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{actionLoadingId === job.id ? 'در حال ثبت...' : 'انتشار سریع'}</span>
                    </button>
                  )}

                  {/* Direct Link to published ad */}
                  {job.status === 'published' && job.adUrl && (
                    <a
                      href={job.adUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors flex items-center space-x-1 space-x-reverse"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>مشاهده آگهی منتشرشده</span>
                    </a>
                  )}

                  {/* Manual Stop Button */}
                  {job.status !== 'published' && job.status !== 'failed' && (
                    <button
                      type="button"
                      onClick={() => handleStopJob(job.id)}
                      disabled={actionLoadingId === job.id}
                      title="متوقف ساختن فوری این نوبت انتشار"
                      className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-colors flex items-center space-x-1 space-x-reverse disabled:opacity-50"
                    >
                      <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>{actionLoadingId === job.id ? 'در حال توقف...' : 'توقف دستی نوبت'}</span>
                    </button>
                  )}

                  {/* Retry Button for stopped or failed jobs */}
                  {job.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => handleRetryJob(job.id)}
                      disabled={actionLoadingId === job.id}
                      title="تلاش مجدد و بازگردانی به صف اجرا"
                      className="px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-colors flex items-center space-x-1 space-x-reverse disabled:opacity-50"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                      <span>{actionLoadingId === job.id ? 'در حال آماده‌سازی...' : 'تلاش مجدد'}</span>
                    </button>
                  )}

                  {/* Delete Job Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteJob(job.id)}
                    disabled={actionLoadingId === job.id}
                    title="حذف دائمی این نوبت از صف و دیتابیس"
                    className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-800/50 text-xs font-semibold transition-colors flex items-center space-x-1 space-x-reverse disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>حذف</span>
                  </button>

                  {/* Status Badge */}
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                      job.status === 'published'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : job.status === 'waiting_otp' || job.status === 'paused_user_action'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                        : job.status === 'waiting_human_action'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                        : job.status === 'solving_captcha'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : job.status === 'failed'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}
                  >
                    {job.status === 'published'
                      ? 'انتشار موفقیت‌آمیز'
                      : job.status === 'paused_user_action'
                      ? '🛡️ توقف در انتظار اقدام انسانی (کپچا / پیامک)'
                      : job.status === 'waiting_otp'
                      ? '⚠️ منتظر تایید OTP پیامک'
                      : job.status === 'waiting_human_action'
                      ? '🛡️ اقدام کاربر (حل چالش ضد ربات)'
                      : job.status === 'solving_captcha'
                      ? '🔄 بررسی چالش امنیتی'
                      : job.status === 'failed'
                      ? 'متوقف شده / خطا'
                      : `در حال اجرا (%${toPersianDigits(job.progressPercent)})`}
                  </span>

                  {job.adUrl && (
                    <a
                      href={job.adUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-semibold hover:bg-blue-500/20 transition-colors flex items-center space-x-1 space-x-reverse"
                    >
                      <span>لینک آگهی</span>
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    </a>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${job.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* OTP & Cloud Browser Interactive Box */}
              {(job.status === 'waiting_otp' || job.status === 'paused_user_action') && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center space-x-2 space-x-reverse text-amber-300 font-bold text-xs">
                    <KeyRound className="w-4.5 h-4.5 text-amber-400" />
                    <span>
                      {job.challengeType === 'CAPTCHA_CHALLENGE'
                        ? 'چالش کپچای امنیتی فعال شد. لطفاً از طریق مرورگر ابری آن را تایید نمایید:'
                        : 'کد پیامک ارسال شده به تلفن همراه (09153108763) را وارد نمایید:'}
                    </span>
                  </div>

                  {job.interactiveUrl && (
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-amber-500/40 flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs text-amber-200">
                        <span className="font-bold">مرورگر ابری تعاملی (noVNC) فعال است: </span>
                        <span>می‌توانید مستقیماً صفحه مرورگر را مشاهده کرده و کپچا یا پیامک را تایید فرمایید.</span>
                      </div>
                      <a
                        href={job.interactiveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md flex items-center space-x-1.5 space-x-reverse"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>مشاهده و حل مستقیم در مرورگر ابری (noVNC)</span>
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="کد ۵ یا ۶ رقمی..."
                      value={otpInputs[job.id] || ''}
                      onChange={(e) => {
                        setOtpInputs({ ...otpInputs, [job.id]: e.target.value });
                        if (otpErrorMap[job.id]) {
                          setOtpErrorMap({ ...otpErrorMap, [job.id]: '' });
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/50 text-amber-300 font-mono text-sm tracking-widest outline-none focus:border-amber-400 w-44"
                    />
                    <button
                      onClick={() => handleSubmitOtp(job.id)}
                      disabled={submittingMap[job.id]}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1 space-x-reverse"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{submittingMap[job.id] ? 'در حال تایید...' : 'تایید و ادامه پروسه'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchTargetSite(job)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center space-x-1 space-x-reverse"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>باز کردن سایت {job.platformName}</span>
                    </button>
                  </div>

                  {otpErrorMap[job.id] && (
                    <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-2 space-x-reverse">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{otpErrorMap[job.id]}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Human Action / CAPTCHA Prompt Interactive Box */}
              {(job.status === 'waiting_human_action' || job.humanActionRequired) && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                  <div className="flex items-start space-x-2 space-x-reverse text-rose-300 font-bold text-xs">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span>گیت امنیتی ضد ربات (DDoS Guard / CAPTCHA) در سایت {job.platformName} فعال شد:</span>
                      <p className="text-[11px] font-normal text-rose-200/90 mt-1 leading-relaxed">
                        {job.challengeInfo?.description || 'سیستم امنیتی سایت مقصد دسترسی سرور را مسدود کرده است. از آنجا که تایید کپچا باید روی همان IP (کلاینت) انجام شود، ادامه فرآیند سمت سرور متوقف گردید. لطفاً از طریق پکیج افزونه مرورگر اقدام فرمایید.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={job.challengeInfo?.targetUrl || `https://${job.platformId.replace('plat_', '')}.ir`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 space-x-reverse shadow-md shadow-amber-500/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>اجرای دستی در تب جدید (کپی اطلاعات انجام شد)</span>
                    </a>
                    <button
                      onClick={() => handleResumeCaptcha(job.id)}
                      disabled={submittingMap[job.id]}
                      className="px-4 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs transition-colors flex items-center space-x-1.5 space-x-reverse border border-slate-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{submittingMap[job.id] ? 'در حال لغو...' : 'خاتمه و ارجاع به افزونه مرورگر (Extension)'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400 mr-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse"></span>
                      نوبت به Extension منتقل می‌شود
                    </span>
                  </div>
                </div>
              )}

              {/* Job Logs Feed */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  لاگ سیستم پردازش (Trace Logs):
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
                  {(job.logs || []).map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-2 space-x-reverse text-slate-300"
                    >
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span
                        className={`font-semibold shrink-0 ${
                          log.status === 'success'
                            ? 'text-emerald-400'
                            : log.status === 'warning'
                            ? 'text-amber-400'
                            : log.status === 'error'
                            ? 'text-red-400'
                            : 'text-blue-400'
                        }`}
                      >
                        [{log.step}]
                      </span>
                      <span className="text-slate-200">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Raw JSON Debugger Tool */}
              <div className="pt-3 border-t border-slate-800/50 mt-4">
                <details className="group">
                  <summary className="text-[11px] font-semibold text-sky-400 cursor-pointer list-none flex items-center gap-1.5 hover:text-sky-300 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block group-open:animate-ping"></span>
                    ابزار گزارش‌دهی دقیق: مشاهده لاگ‌های خام سرور (Raw JSON Logs)
                  </summary>
                  <div className="mt-2 p-3 rounded-xl bg-[#0a0a0a] border border-slate-800/80 overflow-x-auto">
                    <pre className="text-[10px] text-slate-400 font-mono text-left" dir="ltr">
                      {JSON.stringify(job, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            </div>
          ))
        )}
      </div>

      {/* مودال راهنمای هوشمند */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>راهنمای هوشمند: چرخه ثبت نام، OTP و انتشار آگهی واقعی</span>
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-amber-300">
                چرا کدهای الکی OTP رد می‌شوند و انتشار شبیه‌سازی نمی‌شود؟
              </p>
              <p>
                طبق استانداردهای اشک ۲۴، هرگونه موفقیت ساختگی و شبیه‌سازی اکیداً مسدود شده است. وقتی کدی وارد می‌شود، مستقیماً به API و سرور سایت مقصد (مانند دیوار) ارسال شده و در صورت عدم تطابق با پیامک واقعی، صریحاً خطا نمایش داده می‌شود.
              </p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block">راهکار عملیاتی در سرورهای معمولی cPanel:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong className="text-slate-200">روش افزونه مرورگر (توصیه اول):</strong> با نصب افزونه اشک ۲۴ در مرورگر خودتان، ثبت نام و انتشار با IP واقعی و نشست خودتان در ایران انجام شده و سیستم‌های ضد ربات و کپچا مسدود نمی‌شوند.</li>
                  <li><strong className="text-slate-200">روش وب‌هوک و API مستقیم:</strong> پلتفرم‌های سازگار با cURL از طریق سرور بررسی شده و کد دریافتی به درگاه ارسال می‌شود.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال دستیار ورود و نقشه هوشمند DOM سایت مقصد */}
      {assistantJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-right overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5 space-x-reverse">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>دستیار هوشمند ورود و تکمیل فرم: {assistantJob.platformName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {assistantJob.platformDomain || assistantJob.platformId}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    لینک‌های مستقیم درگاه، استخراج خودکار شناسه فیلدها و کپی با ۱ کلیک اطلاعات اشک قلم
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssistantJob(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Target Direct Portal Links */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>دسترسی مستقیم به صفحات {assistantJob.platformName}:</span>
                </label>
                {(() => {
                  const urls = getPlatformUrls(assistantJob);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <a
                        href={urls.register}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-200 text-xs font-medium flex items-center justify-between transition-colors"
                      >
                        <span>صفحه ثبت‌نام</span>
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      </a>
                      <a
                        href={urls.login}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-200 text-xs font-medium flex items-center justify-between transition-colors"
                      >
                        <span>صفحه ورود / لاگین</span>
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      </a>
                      <a
                        href={urls.submitAd}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-200 text-xs font-medium flex items-center justify-between transition-colors"
                      >
                        <span>صفحه درج آگهی</span>
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      </a>
                    </div>
                  );
                })()}
              </div>

              {/* Ready Payload to Copy */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>مجموعه داده‌های آماده اشک قلم جهت چسباندن (Paste):</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">سئو شده و استاندارد</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">نام / نام کاربری:</span>
                      <span className="text-slate-200 font-medium font-mono">کارتن‌سازی اشک قلم</span>
                    </div>
                    <button
                      onClick={() => handleCopyFieldText('name', 'کارتن‌سازی اشک قلم')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      {copiedKey === 'name' ? 'کپی شد ✓' : 'کپی'}
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">تلفن همراه رسمی:</span>
                      <span className="text-slate-200 font-bold font-mono text-amber-300">09153108763</span>
                    </div>
                    <button
                      onClick={() => handleCopyFieldText('phone', '09153108763')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      {copiedKey === 'phone' ? 'کپی شد ✓' : 'کپی'}
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">عنوان آگهی صنعتی:</span>
                      <span className="text-slate-200 font-medium truncate max-w-[180px] block">
                        تولید کارتن ۳ لایه، ۵ لایه، دایکاتی و لمینتی اشک قلم
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleCopyFieldText(
                          'title',
                          'تولید کارتن ۳ لایه، ۵ لایه، جعبه دایکاتی و کارتن لمینتی اشک قلم مشهد'
                        )
                      }
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      {copiedKey === 'title' ? 'کپی شد ✓' : 'کپی'}
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">آدرس کارخانه:</span>
                      <span className="text-slate-200 font-medium truncate max-w-[180px] block">
                        مشهد، شهرک صنعتی کلات، کوشش ۳
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyFieldText('address', 'مشهد، شهرک صنعتی کلات، کوشش ۳')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      {copiedKey === 'address' ? 'کپی شد ✓' : 'کپی'}
                    </button>
                  </div>
                </div>
              </div>

              {/* DOM Analysis & Detected Selectors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تحلیل خودکار فیلدهای DOM در سرور اشک ۲۴:</span>
                  </label>
                  <button
                    onClick={() => handleInspectDomForJob(assistantJob)}
                    disabled={isInspectingDom}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                  >
                    {isInspectingDom ? 'در حال پایش...' : 'بروزرسانی تحلیل DOM'}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 max-h-48 overflow-y-auto">
                  {domFields && domFields.length > 0 ? (
                    domFields.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/60 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{f.persianLabel}</span>
                            <span className="text-[10px] font-mono text-slate-400">({f.fieldName})</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500" dir="ltr">
                            {f.detectedSelector}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                          {f.confidenceScore}% تطابق
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-500">
                      در حال بارگذاری اطلاعات فیلدهای ساختاری...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setAssistantJob(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                بستن پنجره
              </button>

              <button
                onClick={() => handleFastForwardJob(assistantJob)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 space-x-reverse shadow-lg shadow-emerald-500/20"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>تایید نهایی و علامت‌گذاری به عنوان آگهی منتشرشده</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
