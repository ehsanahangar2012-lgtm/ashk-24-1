import React, { useState, useEffect, useMemo } from 'react';
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
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  Terminal,
  Cpu,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  Workflow,
  Puzzle,
  Power
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import {
  PublicationJob,
  CriticalElementCheck,
  SelectorValidationReport,
  DiagnosticConsoleEntry,
} from '../types/ashk24.js';
import { toPersianDigits, getJalaliCurrentTime } from '../utils/persianUtils.js';
import { clientStorage } from '../services/clientStorageService.js';
import { extensionBridge, ExtensionWorkerStatus } from '../utils/extensionBridge.js';
import { PublicationDiagnosticsInspector } from './PublicationDiagnosticsInspector.js';
import { SmsRelayMonitorModule } from './SmsRelayMonitorModule.js';

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
  
  // Status filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'waiting_action' | 'under_review' | 'failed' | 'published'>('all');
  const [chartViewType, setChartViewType] = useState<'bar' | 'donut'>('bar');
  const [expandedLogJobs, setExpandedLogJobs] = useState<Record<string, boolean>>({});

  // Target Site Assistant & Live DOM Inspector State
  const [assistantJob, setAssistantJob] = useState<PublicationJob | null>(null);
  const [domFields, setDomFields] = useState<any[] | null>(null);
  const [isInspectingDom, setIsInspectingDom] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selector Validator (Dry-Run Check before Trigger)
  const [selectorValidationModal, setSelectorValidationModal] = useState<SelectorValidationReport | null>(null);
  const [isValidatingSelectors, setIsValidatingSelectors] = useState<boolean>(false);
  const [validatingPlatformId, setValidatingPlatformId] = useState<string | null>(null);
  const [showSelectorHelp, setShowSelectorHelp] = useState<boolean>(false);

  // Diagnostic Console State
  const [showDiagnosticConsole, setShowDiagnosticConsole] = useState<boolean>(false);
  const [diagnosticEntries, setDiagnosticEntries] = useState<DiagnosticConsoleEntry[]>([]);
  const [diagFilter, setDiagFilter] = useState<'all' | '404' | 'error' | 'timeout' | 'ok'>('all');
  const [isLoadingDiagConsole, setIsLoadingDiagConsole] = useState<boolean>(false);
  const [showDiagConsoleHelp, setShowDiagConsoleHelp] = useState<boolean>(false);
  const [copiedDiagEntryId, setCopiedDiagEntryId] = useState<string | null>(null);

  // Live Extension Worker Status
  const [workerStatus, setWorkerStatus] = useState<ExtensionWorkerStatus>(extensionBridge.getStatus());

  useEffect(() => {
    const unsubscribe = extensionBridge.subscribe((newStatus) => {
      setWorkerStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const toggleJobLogExpanded = (jobId: string) => {
    setExpandedLogJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  // Memoized Status Counts and Chart Data for Recharts
  const statusStats = useMemo(() => {
    const total = jobs.length;
    const pending = jobs.filter(j => j.status === 'pending').length;
    const preparing = jobs.filter(j => ['preparing', 'processing', 'parsing_dom', 'filling_data', 'navigating', 'claimed'].includes(j.status)).length;
    const waitingAction = jobs.filter(j => ['waiting_otp', 'paused_user_action', 'waiting_human_action', 'solving_captcha'].includes(j.status)).length;
    const underReview = jobs.filter(j => j.status === 'under_review' || j.currentStep?.includes('بررسی ناظر')).length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    const published = jobs.filter(j => j.status === 'published').length;

    const chartData = [
      {
        id: 'pending',
        name: 'در صف کرون‌جاب',
        fullLabel: 'در صف کرون‌جاب سی‌پنل (Pending)',
        count: pending,
        color: '#f59e0b', // amber-500
        desc: 'منتظر فراخوانی دوره‌ای یا کلید پردازش',
      },
      {
        id: 'preparing',
        name: 'آماده‌سازی DOM',
        fullLabel: 'آماده‌سازی و تحلیل ساختار (Preparing)',
        count: preparing,
        color: '#0284c7', // sky-600
        desc: 'تحلیل ساختار فرم و نگاشت متون آگهی',
      },
      {
        id: 'waiting_action',
        name: 'انتظار پیامک/اقدام',
        fullLabel: 'انتظار پیامک OTP و اقدام انسانی (Waiting)',
        count: waitingAction,
        color: '#a855f7', // purple-500
        desc: 'منتظر دریافت خودکار کد OTP یا حل کپچا',
      },
      {
        id: 'under_review',
        name: 'در صف بررسی ناظر',
        fullLabel: 'در صف بررسی ناظر پلتفرم (Under Review)',
        count: underReview,
        color: '#8b5cf6', // violet-500
        desc: 'اطلاعات با موفقیت به سرور مقصد تحویل داده شد',
      },
      {
        id: 'failed',
        name: 'متوقف / خطا',
        fullLabel: 'متوقف شده یا خطای سرور مقصد (Failed)',
        count: failed,
        color: '#f43f5e', // rose-500
        desc: 'نیازمند بررسی توکن یا ارتباط سرور',
      },
      {
        id: 'published',
        name: 'منتشر شده',
        fullLabel: 'منتشر شده نهایی با لینک (Published)',
        count: published,
        color: '#10b981', // emerald-500
        desc: 'تایید نهایی با مدرک لینک فعال',
      },
    ];

    const pieData = chartData.filter(d => d.count > 0);

    return { total, pending, preparing, waitingAction, underReview, failed, published, chartData, pieData };
  }, [jobs]);

  // Filtered jobs according to status filter
  const filteredJobs = useMemo(() => {
    if (statusFilter === 'all') return jobs;
    if (statusFilter === 'pending') return jobs.filter(j => j.status === 'pending');
    if (statusFilter === 'preparing') return jobs.filter(j => ['preparing', 'processing', 'parsing_dom', 'filling_data', 'navigating', 'claimed'].includes(j.status));
    if (statusFilter === 'waiting_action') return jobs.filter(j => ['waiting_otp', 'paused_user_action', 'waiting_human_action', 'solving_captcha'].includes(j.status));
    if (statusFilter === 'under_review') return jobs.filter(j => j.status === 'under_review' || j.currentStep?.includes('بررسی ناظر'));
    if (statusFilter === 'failed') return jobs.filter(j => j.status === 'failed');
    if (statusFilter === 'published') return jobs.filter(j => j.status === 'published');
    return jobs;
  }, [jobs, statusFilter]);

  // Job Execution & Bottleneck Diagnosis Helper
  const getJobExecutionDiagnosis = (job: PublicationJob) => {
    const lastLog = job.logs && job.logs.length > 0 ? job.logs[job.logs.length - 1] : null;
    const isPending = job.status === 'pending';
    const isPreparing = ['preparing', 'processing', 'parsing_dom', 'filling_data', 'navigating', 'claimed'].includes(job.status);
    const isWaitingOtp = job.status === 'waiting_otp' || job.status === 'paused_user_action';
    const isWaitingCaptcha = job.status === 'waiting_human_action' || job.status === 'solving_captcha';
    const isUnderReview = job.status === 'under_review' || job.currentStep?.includes('بررسی ناظر');
    const isFailed = job.status === 'failed';

    let causeTitle = '';
    let causeDescription = '';
    let recommendedAction = '';
    let badgeColor = 'bg-amber-500/10 border-amber-500/30 text-amber-300';
    let iconType: 'clock' | 'code' | 'key' | 'shield' | 'alert' | 'check' = 'clock';

    if (isPending) {
      causeTitle = 'در صف پردازش کرون‌جاب سی‌پنل (Waiting Cron Dispatch)';
      causeDescription = 'نوبت در پایگاه داده سی‌پنل ثبت شده و در صف پردازش دوره‌ای قرار دارد. به دلیل ماهیت سرورهای PHP، اسکریپت cron_worker.php باید به صورت دوره‌ای توسط Cron Jobs هاست یا به صورت دستی فراخوانی شود.';
      recommendedAction = 'روی دکمه «⚡ پردازش فوری همین نوبت» یا دکمه سبز «پردازش زنده» در بالا کلیک کنید تا نوبت فوراً به جریان بیفتد.';
      badgeColor = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      iconType = 'clock';
    } else if (isUnderReview) {
      causeTitle = 'ارسال موفق به پلتفرم و قرارگیری در صف بررسی ناظر (Under Moderation)';
      causeDescription = `اطلاعات کامل آگهی، عناوین و مشخصات اشک قلم با موفقیت در وب‌سایت ${job.platformName} ثبت گردید. بر اساس ساختار این رسانه، آگهی پیش از نمایش عمومی در لیست، در صف بازبینی ممیزین قرار می‌گیرد.`;
      recommendedAction = 'با کلیک روی «پیگیری در صف بررسی ناظر» وضعیت تایید را در پنل سایت مقصد مشاهده فرمایید.';
      badgeColor = 'bg-violet-500/10 border-violet-500/30 text-violet-300';
      iconType = 'check';
    } else if (isPreparing) {
      causeTitle = 'تحلیل ساختار فرم و آماده‌سازی محتوا (Form Preparation)';
      causeDescription = `محتوای متنی سئو شده، کلمات کلیدی و تصاویر جعبه/کارتن اشک قلم آماده شده و ربات در حال تطبیق سلکتورهای وب‌سایت ${job.platformName} است.`;
      recommendedAction = 'در صورت تاخیر سرور، از دکمه «دستیار ورود به سایت مقصد» جهت درج ۱-کلیکه استفاده فرمایید.';
      badgeColor = 'bg-sky-500/10 border-sky-500/30 text-sky-400';
      iconType = 'code';
    } else if (isWaitingOtp) {
      causeTitle = 'در انتظار دریافت کد پیامکی تایید (Awaiting SMS OTP)';
      causeDescription = `درخواست ورود به وب‌سایت ${job.platformName} ثبت شده و سامانه منتظر دریافت کد ۵ یا ۶ رقمی پیامک شده به شماره ۰۹۱۵۳۱۰۸۷۶۳ است.`;
      recommendedAction = 'اپلیکیشن همراه اندروید به صورت خودکار پیامک را می‌خواند. همچنین می‌توانید کد را مستقیماً در کادر زیر وارد کنید.';
      badgeColor = 'bg-purple-500/10 border-purple-500/30 text-purple-300';
      iconType = 'key';
    } else if (isWaitingCaptcha) {
      causeTitle = 'تشخیص چالش امنیتی ضد ربات / کپچا (Anti-Bot Check)';
      causeDescription = `سیستم امنیتی سایت ${job.platformName} محافظت کپچا فعال کرده است که نیاز به تایید روی آی‌پی کلاینت دارد.`;
      recommendedAction = 'از طریق لینک مرورگر ابری (noVNC) یا افزونه مرورگر اشک ۲۴ کپچا را تایید کنید.';
      badgeColor = 'bg-rose-500/10 border-rose-500/30 text-rose-300';
      iconType = 'shield';
    } else if (isFailed) {
      causeTitle = 'توقف اجرا به دلیل عدم پاسخ سرور مقصد یا خطا';
      causeDescription = lastLog?.message || 'ارتباط با سرور مقصد دچار وقفه یا خطای اعتبارسنجی شد.';
      recommendedAction = 'روی دکمه «تلاش مجدد» کلیک کنید تا نوبت دوباره پردازش شود.';
      badgeColor = 'bg-red-500/10 border-red-500/30 text-red-400';
      iconType = 'alert';
    } else {
      causeTitle = 'انتشار تایید شده با مدرک لینک مستقیم';
      causeDescription = 'فرآیند با موفقیت پایان یافته و آگهی در رسانه هدف فعال است.';
      recommendedAction = 'جهت بررسی آگهی روی «مشاهده آگهی منتشرشده» کلیک کنید.';
      badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      iconType = 'check';
    }

    return {
      lastLog,
      causeTitle,
      causeDescription,
      recommendedAction,
      badgeColor,
      iconType,
      timestamp: lastLog?.timestamp || (job.updatedAt ? new Date(job.updatedAt).toLocaleTimeString('fa-IR') : 'هم‌اکنون'),
      logStep: lastLog?.step || (isPending ? 'cPanel_Cron_Queue' : 'SystemWorkflow'),
      logMessage: lastLog?.message || job.currentStep || 'در انتظار اجرای کران‌جاب سی‌پنل'
    };
  };

  const handleTriggerSingleJob = async (job: PublicationJob) => {
    setActionLoadingId(job.id);
    try {
      // Advance this specific pending job
      await clientStorage.updateJob(job.id, {
        status: 'processing',
        progressPercent: Math.max(job.progressPercent || 0, 35),
        currentStep: `در حال برقراری ارتباط زنده با پلتفرم ${job.platformName} و ارسال داده‌های اشک قلم...`,
        logs: [
          ...(job.logs || []),
          {
            timestamp: new Date().toLocaleTimeString('fa-IR'),
            step: 'DirectTrigger',
            status: 'info',
            message: `فراخوانی فوری دستی از مانیتور صف برای پلتفرم ${job.platformName} انجام گردید.`
          }
        ]
      });
      showNotification(`پردازش فوری برای ${job.platformName} آغاز شد.`);
      onRefreshJobs();
    } catch (e: any) {
      showNotification('خطا در اجرای فوری نوبت.', 'error');
    } finally {
      setActionLoadingId(null);
    }
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

  const handleStopJob = async (jobId: string, status: 'cancelled' | 'paused' | 'failed' = 'cancelled') => {
    setActionLoadingId(jobId);
    try {
      const reason = status === 'paused'
        ? 'نوبت انتشار توسط کاربر توقف موقت (Pause) گردید.'
        : 'نوبت انتشار توسط کاربر لغو و متوقف گردید.';
      await clientStorage.setJobExplicitStatus(jobId, status, reason);
      showNotification(`وضعیت نوبت انتشار با موفقیت به «${status === 'paused' ? 'پاز / تعلیق' : 'لغو / متوقف'}» تغییر یافت.`);
      onRefreshJobs();
    } catch (e: any) {
      showNotification('خطا در تغییر وضعیت صریح نوبت.', 'error');
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

  const handleRetryAllFailed = async () => {
    setBulkActionLoading(true);
    try {
      const count = await clientStorage.retryAllFailedJobs();
      showNotification(`${toPersianDigits(count)} وظیفه ناموفق مجدداً به صف پردازش هوشمند برگشتند.`);
      onRefreshJobs();
    } catch {
      showNotification('خطا در تلاش مجدد وظایف.', 'error');
    } finally {
      setBulkActionLoading(false);
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
    const domain = (job.platformDomain || '').toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');

    if (cleanId.includes('locopoc') || domain.includes('locopoc')) {
      return {
        home: 'https://www.locopoc.com/',
        register: 'https://www.locopoc.com/postad.aspx',
        login: 'https://www.locopoc.com/',
        submitAd: 'https://www.locopoc.com/postad.aspx',
      };
    }
    if (cleanId.includes('irantejarat') || cleanId.includes('iran-tejarat') || domain.includes('iran-tejarat')) {
      return {
        home: 'https://iran-tejarat.com/',
        register: 'https://iran-tejarat.com/LoginPage/InsertAd.html',
        login: 'https://iran-tejarat.com/LoginPage/InsertAd.html',
        submitAd: 'https://iran-tejarat.com/iad.aspx',
      };
    }
    if (cleanId.includes('niazerooz') || domain.includes('niazerooz')) {
      return {
        home: 'https://www.niazerooz.com/',
        register: 'https://www.niazerooz.com/user/register',
        login: 'https://www.niazerooz.com/user/login',
        submitAd: 'https://www.niazerooz.com/ad/new',
      };
    }
    if (cleanId.includes('niazpardaz') || domain.includes('niazpardaz')) {
      return {
        home: 'https://www.niazpardaz.com/',
        register: 'https://www.niazpardaz.com/user/login',
        login: 'https://www.niazpardaz.com/user/login',
        submitAd: 'https://www.niazpardaz.com/ad/new',
      };
    }
    if (cleanId.includes('parscenter') || domain.includes('parscenter')) {
      return {
        home: 'https://parscenter.com/',
        register: 'https://parscenter.com/User/Register',
        login: 'https://parscenter.com/User/Login',
        submitAd: 'https://parscenter.com/Product/Create',
      };
    }
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
        home: 'https://www.agahi24.com/',
        register: 'https://www.agahi24.com/login/',
        login: 'https://www.agahi24.com/login/',
        submitAd: 'https://www.agahi24.com/create-listing/',
      };
    }
    if (cleanId.includes('istgah') || domain.includes('istgah')) {
      return {
        home: 'https://www.istgah.com/',
        register: 'https://www.istgah.com/register/',
        login: 'https://www.istgah.com/user/',
        submitAd: 'https://www.istgah.com/post/',
      };
    }
    if (cleanId.includes('baskool') || domain.includes('baskool')) {
      return {
        home: 'https://www.baskool.com/',
        register: 'https://www.baskool.com/register',
        login: 'https://www.baskool.com/login',
        submitAd: 'https://www.baskool.com/profile/products',
      };
    }
    if (cleanId.includes('divar') || domain.includes('divar')) {
      return {
        home: 'https://divar.ir/',
        register: 'https://divar.ir/',
        login: 'https://divar.ir/',
        submitAd: 'https://divar.ir/new',
      };
    }
    if (cleanId.includes('sheypoor') || domain.includes('sheypoor')) {
      return {
        home: 'https://www.sheypoor.com/',
        register: 'https://www.sheypoor.com/session',
        login: 'https://www.sheypoor.com/session',
        submitAd: 'https://www.sheypoor.com/listing/new',
      };
    }
    if (cleanId.includes('eforosh') || domain.includes('eforosh')) {
      return {
        home: 'https://eforosh.com/',
        register: 'https://eforosh.com/registration',
        login: 'https://eforosh.com/login',
        submitAd: 'https://eforosh.com/',
      };
    }
    const cleanDom = domain || `${cleanId.replace('plat_', '')}.com`;
    return {
      home: `https://${cleanDom}/`,
      register: `https://${cleanDom}/`,
      login: `https://${cleanDom}/`,
      submitAd: `https://${cleanDom}/`,
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
    const urls = getPlatformUrls(job);
    const enteredUrl = window.prompt(
      `لطفاً آدرس لینک مستقیم و واقعی آگهی ثبت‌شده در ${job.platformName} را وارد فرمایید:\n(توجه: وارد کردن آدرس مستقیم آگهی الزامی است و لینک صفحه اصلی پذیرفته نمی‌شود)`,
      job.adUrl || ''
    );
    if (enteredUrl === null) return;

    const trimmed = enteredUrl.trim();
    if (!trimmed || !trimmed.startsWith('http') || trimmed === urls.home || trimmed === urls.home.replace(/\/$/, '')) {
      showNotification('جهت تایید قطعی انتشار، وارد کردن آدرس مستقیم و معتبر صفحه آگهی الزامی است.', 'error');
      return;
    }

    const adUrl = trimmed;
    setActionLoadingId(job.id);
    try {
      await clientStorage.updateJob(job.id, {
        status: 'published',
        progressPercent: 100,
        currentStep: `آگهی با لینک واقعی در ${job.platformName} تایید گردید.`,
        adUrl,
        publishedAt: new Date().toISOString(),
        logs: [
          ...(job.logs || []),
          {
            timestamp: new Date().toLocaleTimeString('fa-IR'),
            step: 'ManualVerification',
            status: 'success',
            message: `لینک واقعی انتشار توسط کاربر ثبت شد: ${adUrl}`,
          },
        ],
      });
      showNotification(`آگهی در ${job.platformName} با موفقیت ثبت گردید.`);
      onRefreshJobs();
      if (assistantJob && assistantJob.id === job.id) {
        setAssistantJob(null);
      }
    } catch (e) {
      showNotification('خطا در ثبت آگهی.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLivePlatformSubmit = async (job: PublicationJob) => {
    setActionLoadingId(job.id);
    try {
      const res = await clientStorage.submitJobToPlatformReal(job.id);
      if (res.success) {
        showNotification(res.message || `اطلاعات آگهی با موفقیت به سرور ${job.platformName} تحویل شد و در صف بررسی ناظر قرار گرفت.`);
      } else {
        showNotification(res.message || `خطا در ثبت مستقیم فرم در ${job.platformName}`, 'error');
      }
      onRefreshJobs();
    } catch (e: any) {
      showNotification(`خطا در ارتباط با سرور ${job.platformName}: ` + (e?.message || 'خطا'), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLiveNiazPardazSubmit = handleLivePlatformSubmit;

  // --- Selector Validator & Dry-Run Utility ---
  const handleRunSelectorValidation = async (target: {
    platformId?: string;
    platformName?: string;
    domain?: string;
    targetUrl?: string;
  }) => {
    setIsValidatingSelectors(true);
    setValidatingPlatformId(target.platformId || target.domain || 'target');
    try {
      const urls = target.platformId ? getPlatformUrls({ platformId: target.platformId, platformDomain: target.domain } as any) : null;
      const targetUrl = target.targetUrl || (urls ? urls.submitAd || urls.home : undefined);

      const result = await clientStorage.validateSelectors({
        platformId: target.platformId,
        domain: target.domain,
        targetUrl,
      });

      setSelectorValidationModal(result);

      if (!result.isAccessible || result.httpStatus === 404) {
        await clientStorage.recordDiagnosticConsoleEntry({
          platformId: target.platformId || target.domain || 'platform',
          platformName: target.platformName || target.domain || 'پلتفرم هدف',
          requestUrl: result.targetUrl,
          httpMethod: 'GET',
          httpStatus: result.httpStatus,
          httpStatusText: result.httpStatusText,
          targetSelectorPath: "form, a[href*='postad'], input[type='tel']",
          errorType: result.httpStatus === 404 ? 'HTTP_404_NOT_FOUND' : 'CONNECTION_TIMEOUT',
          rawResponseSnippet: result.warningNote || `پاسخ HTTP ${result.httpStatus}`,
          resolutionHint: 'لینک مستقیم یا صفحه اصلی تست‌شده در دستیار انتخاب گردد.',
        });
        handleLoadDiagnosticConsole();
        showNotification(`هشدار سلکتور در ${result.platformName}: کد وضعیت HTTP ${result.httpStatus}`, 'error');
      } else {
        showNotification(`اعتبارسنجی سلکتورهای ${result.platformName} با موفقیت تایید شد (پاسخ ${result.httpStatusText}).`);
      }
    } catch (e: any) {
      showNotification('خطا در اجرای اعتبارسنجی سلکتورها: ' + (e?.message || 'خطا'), 'error');
    } finally {
      setIsValidatingSelectors(false);
      setValidatingPlatformId(null);
    }
  };

  // --- Diagnostic Console Load & Operations ---
  const handleLoadDiagnosticConsole = async () => {
    setIsLoadingDiagConsole(true);
    try {
      const logs = await clientStorage.getDiagnosticConsoleEntries();
      setDiagnosticEntries(logs || []);
    } catch (e) {
      console.error('Error fetching diagnostic console entries:', e);
    } finally {
      setIsLoadingDiagConsole(false);
    }
  };

  useEffect(() => {
    handleLoadDiagnosticConsole();
  }, []);

  const handleClearDiagnosticConsole = async () => {
    if (!window.confirm('آیا از پاکسازی تاریخچه کنسول عیب‌یابی اطمینان دارید؟')) return;
    await clientStorage.clearDiagnosticConsoleEntries();
    setDiagnosticEntries([]);
    showNotification('تاریخچه کنسول عیب‌یابی با موفقیت پاکسازی شد.');
  };

  const handleCopyDiagnosticEntry = (entry: DiagnosticConsoleEntry) => {
    const text = `[Ashk24 Diagnostic Entry]
زمان: ${entry.timestamp}
رسانه: ${entry.platformName} (${entry.platformId})
آدرس اندپوینت: ${entry.requestUrl}
متد و وضعیت HTTP: ${entry.httpMethod} -> ${entry.httpStatus} (${entry.httpStatusText})
مسیر سلکتور DOM: ${entry.targetSelectorPath || 'N/A'}
نوع خطا: ${entry.errorType || 'N/A'}
راهنمای رفع: ${entry.resolutionHint}
پاسخ خام: ${entry.rawResponseSnippet || 'N/A'}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedDiagEntryId(entry.id);
      setTimeout(() => setCopiedDiagEntryId(null), 3000);
      showNotification('جزئیات عیب‌یابی در کلیپ‌بورد کپی شد.');
    }
  };

  // Filtered Diagnostic Entries
  const filteredDiagEntries = useMemo(() => {
    if (diagFilter === 'all') return diagnosticEntries;
    if (diagFilter === '404') return diagnosticEntries.filter(e => e.httpStatus === 404 || e.errorType === 'HTTP_404_NOT_FOUND');
    if (diagFilter === 'timeout') return diagnosticEntries.filter(e => e.httpStatus === 0 || e.errorType === 'CONNECTION_TIMEOUT');
    if (diagFilter === 'error') return diagnosticEntries.filter(e => e.httpStatus >= 400 || e.httpStatus === 0);
    if (diagFilter === 'ok') return diagnosticEntries.filter(e => e.httpStatus >= 200 && e.httpStatus < 400);
    return diagnosticEntries;
  }, [diagnosticEntries, diagFilter]);

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
      {/* پایش زنده و وضعیت سلامت رله پیامک OTP */}
      <SmsRelayMonitorModule compact />

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

          {/* Selector Validator Dry-Run Button */}
          <button
            onClick={() => handleRunSelectorValidation({ platformId: 'plat_locopoc', domain: 'locopoc.com', platformName: 'لوکوپوک' })}
            disabled={isValidatingSelectors}
            className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
            title="اجرای تست خشک (Dry-Run) جهت بررسی وجود دکمه‌های ثبت‌نام/ورود و سلکتورهای حیاتی"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            <span>{isValidatingSelectors ? 'در حال تست سلکتور...' : '🔍 اعتبارسنجی سلکتورها (Dry-Run)'}</span>
          </button>

          {/* Diagnostic Console Button */}
          <button
            onClick={() => {
              setShowDiagnosticConsole(!showDiagnosticConsole);
              if (!showDiagnosticConsole) handleLoadDiagnosticConsole();
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 space-x-reverse ${
              showDiagnosticConsole
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
            title="نمایش کنسول زنده عیب‌یابی کدهای وضعیت HTTP، آدرس‌ها و مسیر سلکتورهای DOM"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>{showDiagnosticConsole ? 'بستن کنسول عیب‌یابی' : '💻 کنسول عیب‌یابی HTTP & DOM'}</span>
            {diagnosticEntries.filter(e => e.httpStatus >= 400 || e.httpStatus === 0).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                {toPersianDigits(diagnosticEntries.filter(e => e.httpStatus >= 400 || e.httpStatus === 0).length)}
              </span>
            )}
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

          {/* Bulk Retry Failed Jobs */}
          {statusStats.failed > 0 && (
            <button
              onClick={handleRetryAllFailed}
              disabled={bulkActionLoading}
              title="تلاش مجدد و اجرای هوشمند برای کلیه وظایف با خطا"
              className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-400" />
              <span>تلاش مجدد خطاها ({toPersianDigits(statusStats.failed)})</span>
            </button>
          )}

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

      {/* Diagnostic Console Panel (HTTP Status & DOM Selector Inspector) */}
      {showDiagnosticConsole && (
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2.5 space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <span>کنسول جامع عیب‌یابی HTTP و سلکتورهای DOM</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                      Diagnostic Console
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowDiagConsoleHelp(true)}
                    title="راهنمای کنسول عیب‌یابی"
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs w-6 h-6 flex items-center justify-center"
                  >
                    ؟
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  ثبت اختصاصی کدهای وضعیت HTTP، مسیر URL درخواستی، و رشته سلکتورهای استخراج‌شده برای جلوگیری از خطای ۴۰۴ و بن‌بست‌های ثبت‌نام
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Pills */}
              <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setDiagFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${diagFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  همه ({toPersianDigits(diagnosticEntries.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setDiagFilter('404')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${diagFilter === '404' ? 'bg-rose-500 text-white font-bold' : 'text-rose-400 hover:text-rose-200'}`}
                >
                  خطای ۴۰۴ ({toPersianDigits(diagnosticEntries.filter(e => e.httpStatus === 404 || e.errorType === 'HTTP_404_NOT_FOUND').length)})
                </button>
                <button
                  type="button"
                  onClick={() => setDiagFilter('timeout')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${diagFilter === 'timeout' ? 'bg-amber-600 text-white font-bold' : 'text-amber-400 hover:text-amber-200'}`}
                >
                  تایم‌اوت ({toPersianDigits(diagnosticEntries.filter(e => e.httpStatus === 0 || e.errorType === 'CONNECTION_TIMEOUT').length)})
                </button>
                <button
                  type="button"
                  onClick={() => setDiagFilter('ok')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${diagFilter === 'ok' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400 hover:text-emerald-200'}`}
                >
                  پاسخ موفق ({toPersianDigits(diagnosticEntries.filter(e => e.httpStatus >= 200 && e.httpStatus < 400).length)})
                </button>
              </div>

              <button
                type="button"
                onClick={handleLoadDiagnosticConsole}
                disabled={isLoadingDiagConsole}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                title="بارگذاری مجدد لاگ‌های کنسول"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoadingDiagConsole ? 'animate-spin' : ''}`} />
                <span>بروزرسانی</span>
              </button>

              <button
                type="button"
                onClick={handleClearDiagnosticConsole}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1 transition-colors"
                title="پاکسازی تمام لاگ‌های کنسول"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاکسازی لاگ‌ها</span>
              </button>
            </div>
          </div>

          {/* Console Entries List */}
          {filteredDiagEntries.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">
                هیچ خطای ارتباطی، ۴۰۴ یا عدم تطابق سلکتوری در فیلتر انتخابی ثبت نشده است.
              </p>
              <p className="text-[11px] text-slate-500">
                برای بررسی اولیه اندپوینت‌ها، از دکمه «اعتبارسنجی سلکتورها (Dry-Run)» در بالای جدول استفاده فرمایید.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 font-sans">
              {filteredDiagEntries.map((entry) => {
                const is404 = entry.httpStatus === 404 || entry.errorType === 'HTTP_404_NOT_FOUND';
                const isTimeout = entry.httpStatus === 0 || entry.errorType === 'CONNECTION_TIMEOUT';
                const isSuccess = entry.httpStatus >= 200 && entry.httpStatus < 400;

                return (
                  <div
                    key={entry.id}
                    className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                      is404
                        ? 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                        : isTimeout
                        ? 'bg-amber-950/20 border-amber-900/50 text-amber-200'
                        : isSuccess
                        ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                          is404
                            ? 'bg-rose-500 text-white'
                            : isTimeout
                            ? 'bg-amber-500 text-slate-950'
                            : isSuccess
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-700 text-slate-200'
                        }`}>
                          {entry.httpStatus === 0 ? 'HTTP 0 (تایم‌اوت)' : `HTTP ${entry.httpStatus}`}
                        </span>
                        <span className="font-bold text-slate-100">{entry.platformName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">[{entry.timestamp}]</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyDiagnosticEntry(entry)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          {copiedDiagEntryId === entry.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedDiagEntryId === entry.id ? 'کپی شد' : 'کپی جزئیات'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunSelectorValidation({ platformId: entry.platformId, domain: entry.platformId, targetUrl: entry.requestUrl })}
                          className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>تست مجدد</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <LinkIcon className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="font-semibold">آدرس URL درخواست‌شده:</span>
                        </div>
                        <a
                          href={entry.requestUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline font-mono text-[10px] break-all block flex items-center gap-1"
                        >
                          <span>{entry.requestUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Code2 className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="font-semibold">مسیر سلکتور DOM تست‌شده:</span>
                        </div>
                        <code className="px-2 py-0.5 rounded bg-slate-950 text-sky-300 font-mono text-[10px] block break-all">
                          {entry.targetSelectorPath || 'form, input[name="phone"], button:contains("ورود")'}
                        </code>
                      </div>
                    </div>

                    {entry.resolutionHint && (
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 flex items-start gap-2 text-[11px]">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-300">راهکار و اقدام اصلاحی: </span>
                          <span className="text-slate-300">{entry.resolutionHint}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Real-time Status Chart & Bottleneck Metrics Dashboard (Recharts) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span>نمودار وضعیت لحظه‌ای نوبت‌های پردازش (Real-time Status Chart)</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              تفکیک لحظه‌ای وضعیت وظایف جهت شناسایی سریع گلوگاه‌های کرون‌جاب، نیازمندی به OTP یا چالش‌های امنیتی
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setChartViewType('bar')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  chartViewType === 'bar'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>نمودار ستونی</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewType('donut')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  chartViewType === 'donut'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" />
                <span>نمودار دونات وضعیت</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Summary Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-800 border-amber-500/80 ring-1 ring-amber-500/50'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>کل نوبت‌ها</span>
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100">
              {toPersianDigits(statusStats.total)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/50'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-amber-950/20'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1">
              <span>در صف کرون‌جاب</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {toPersianDigits(statusStats.pending)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('preparing')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              statusFilter === 'preparing'
                ? 'bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/50'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-sky-950/20'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-sky-400 font-medium mb-1">
              <span>آماده‌سازی DOM</span>
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-bold font-mono text-sky-400">
              {toPersianDigits(statusStats.preparing)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('waiting_action')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              statusFilter === 'waiting_action'
                ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/50'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-purple-950/20'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-purple-400 font-medium mb-1">
              <span>انتظار پیامک OTP</span>
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold font-mono text-purple-400">
              {toPersianDigits(statusStats.waitingAction)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('under_review')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              statusFilter === 'under_review'
                ? 'bg-violet-950/30 border-violet-500 ring-1 ring-violet-500/50'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-violet-950/20'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-violet-400 font-medium mb-1">
              <span>در صف بررسی ناظر</span>
              <CheckCircle className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="text-xl font-bold font-mono text-violet-400">
              {toPersianDigits(statusStats.underReview)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('failed')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              statusFilter === 'failed'
                ? 'bg-rose-950/30 border-rose-500 ring-1 ring-rose-500/50'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-rose-950/20'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-rose-400 font-medium mb-1">
              <span>متوقف / خطای سرور</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-400">
              {toPersianDigits(statusStats.failed)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('published')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              statusFilter === 'published'
                ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/50'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-emerald-950/20'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1">
              <span>منتشر شده نهایی</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {toPersianDigits(statusStats.published)}
            </div>
          </button>
        </div>

        {/* Recharts Chart Canvas */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
          <div className="h-48 sm:h-56 w-full" dir="ltr">
            {statusStats.total === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <BarChart3 className="w-8 h-8 opacity-40" />
                <span className="text-xs">هیچ داده‌ای در صف جهت نمایش نمودار وجود ندارد</span>
              </div>
            ) : chartViewType === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusStats.chartData}
                  margin={{ top: 10, right: 20, left: -20, bottom: 20 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'inherit' }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'inherit' }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-right text-xs space-y-1">
                            <p className="font-bold text-slate-100">{data.fullLabel}</p>
                            <p className="text-amber-300 font-mono font-bold">
                              تعداد وظایف: {toPersianDigits(data.count)}
                            </p>
                            <p className="text-[11px] text-slate-400">{data.desc}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    onClick={(entry: any) => {
                      if (entry && entry.id) setStatusFilter(entry.id);
                    }}
                    className="cursor-pointer transition-opacity hover:opacity-85"
                  >
                    {statusStats.chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={statusFilter === entry.id ? '#ffffff' : undefined}
                        strokeWidth={statusFilter === entry.id ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusStats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                    onClick={(entry: any) => {
                      if (entry && entry.id) setStatusFilter(entry.id);
                    }}
                    className="cursor-pointer"
                  >
                    {statusStats.pieData.map((entry, index) => (
                      <Cell
                        key={`pie-cell-${index}`}
                        fill={entry.color}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-right text-xs space-y-1">
                            <p className="font-bold text-slate-100">{data.fullLabel}</p>
                            <p className="text-amber-300 font-mono font-bold">
                              تعداد: {toPersianDigits(data.count)} وظیفه
                            </p>
                            <p className="text-[11px] text-slate-400">{data.desc}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => (
                      <span className="text-xs text-slate-300 mr-2 ml-1">
                        {entry.payload.name} ({toPersianDigits(entry.payload.count)})
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Bottleneck Insight Banner */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {statusStats.pending > 0
                  ? `🔍 تشخیص وضعیت: ${toPersianDigits(statusStats.pending)} وظیفه در صف کرون‌جاب cPanel منتظر اجرا هستند. جهت پیشبرد سریع روی «پردازش زنده» کلیک کنید.`
                  : statusStats.waitingAction > 0
                  ? `📱 تشخیص وضعیت: ${toPersianDigits(statusStats.waitingAction)} وظیفه در انتظار دریافت پیامک تایید OTP خط ۰۹۱۵۳۱۰۸۷۶۳ هستند.`
                  : statusStats.failed > 0
                  ? (
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span>⚠️ تشخیص وضعیت: {toPersianDigits(statusStats.failed)} وظیفه با خطای درگاه مواجه شدند.</span>
                      <button
                        type="button"
                        onClick={handleRetryAllFailed}
                        disabled={bulkActionLoading}
                        className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                      >
                        [تلاش مجدد و انتقال به صف]
                      </button>
                    </span>
                  )
                  : `✓ کلیه وظایف فعال در صف با موفقیت در گردش هستند.`}
              </span>
            </div>

            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline decoration-dotted self-start sm:self-auto"
              >
                نمایش همه نوبت‌ها ({toPersianDigits(statusStats.total)})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {(!filteredJobs || filteredJobs.length === 0) ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <Clock className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">
              {statusFilter === 'all'
                ? 'هیچ نوبت انتشاری در حال اجرا نیست'
                : `هیچ نوبتی در وضعیت «${
                    statusFilter === 'pending'
                      ? 'در صف کرون‌جاب'
                      : statusFilter === 'preparing'
                      ? 'آماده‌سازی DOM'
                      : statusFilter === 'waiting_action'
                      ? 'انتظار پیامک/اقدام'
                      : statusFilter === 'failed'
                      ? 'متوقف شده / خطا'
                      : 'منتشر شده'
                  }» یافت نشد`}
            </h3>
            <p className="text-xs text-slate-500">
              {statusFilter !== 'all' ? (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  بازگشت به نمایش کلیه نوبت‌ها
                </button>
              ) : (
                'از بخش «مدیریت کمپین‌ها» یا «داشبورد» روی دکمه انتشار فوری کمپین کلیک کنید.'
              )}
            </p>
          </div>
        ) : (
          (filteredJobs || []).map((job) => {
            const diag = getJobExecutionDiagnosis(job);
            const isLogExpanded = !!expandedLogJobs[job.id];

            return (
              <div
                key={job.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">
                        پلتفرم: {job.platformName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">({job.id})</span>

                      {/* Live Worker Connection Status for this Platform Job */}
                      {workerStatus.installed && workerStatus.isWorkerEnabled ? (
                        <span
                          className="inline-flex items-center space-x-1 space-x-reverse px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          title="ورکر افزونه آنلاین و متصل به این پلتفرم است"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <Puzzle className="w-3 h-3 ml-0.5" />
                          <span>ورکر متصل و آماده</span>
                        </span>
                      ) : workerStatus.installed ? (
                        <span
                          className="inline-flex items-center space-x-1 space-x-reverse px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          title="افزونه شناسایی شده اما ورکر در حالت Pause است"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <Puzzle className="w-3 h-3 ml-0.5" />
                          <span>ورکر در حالت آماده‌باش</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center space-x-1 space-x-reverse px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700"
                          title="افزونه متصل نیست - اجرای نوبت توسط کرون‌جاب سی‌پنل پردازش می‌شود"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <Puzzle className="w-3 h-3 ml-0.5" />
                          <span>ورکر قطع (cPanel Cron)</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{job.currentStep}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Selector Validator Button per Job */}
                    <button
                      type="button"
                      onClick={() => handleRunSelectorValidation({
                        platformId: job.platformId,
                        platformName: job.platformName,
                        domain: job.platformDomain,
                      })}
                      disabled={isValidatingSelectors && validatingPlatformId === (job.platformId || job.platformDomain)}
                      className="px-2.5 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors flex items-center space-x-1 space-x-reverse disabled:opacity-50"
                      title="تست خشک (Dry-Run) دکمه‌های ورود/ثبت‌نام و شناسایی سلکتورهای این رسانه قبل از اقدام"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        {isValidatingSelectors && validatingPlatformId === (job.platformId || job.platformDomain)
                          ? 'در حال سنجش...'
                          : 'تست سلکتورها (Dry-Run)'}
                      </span>
                    </button>

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

                    {/* Single Job Instant Trigger for Pending Jobs */}
                    {job.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleTriggerSingleJob(job)}
                        disabled={actionLoadingId === job.id}
                        title="پردازش درجا و اختصاصی این نوبت بدون انتظار برای چرخه کرون‌جاب"
                        className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center space-x-1 space-x-reverse disabled:opacity-50 shadow-md shadow-amber-500/20"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{actionLoadingId === job.id ? 'در حال ارسال...' : '⚡ اجرای فوری این نوبت'}</span>
                      </button>
                    )}

                    {/* Real Live NiazPardaz Submission Button */}
                    {(job.platformDomain?.toLowerCase().includes('niazpardaz') || job.platformName?.includes('نیاز')) && job.status !== 'under_review' && job.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => handleLiveNiazPardazSubmit(job)}
                        disabled={actionLoadingId === job.id}
                        title="ثبت مستقیم و واقعی فرم در سرور نیازپرداز (NiazPardaz.com)"
                        className="px-2.5 py-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center space-x-1 space-x-reverse disabled:opacity-50 shadow-md shadow-violet-600/30"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>{actionLoadingId === job.id ? 'در حال ارسال...' : 'ثبت مستقیم در نیازپرداز'}</span>
                      </button>
                    )}

                    {/* Tracking Link for under_review jobs */}
                    {(job.status === 'under_review' || job.currentStep?.includes('بررسی ناظر')) && (
                      <a
                        href={job.trackingUrl || 'https://www.niazpardaz.com/ad/List'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/40 text-xs font-bold transition-colors flex items-center space-x-1 space-x-reverse"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>پیگیری در صف بررسی ناظر (niazpardaz.com)</span>
                      </a>
                    )}

                    {/* Direct Execution via Chrome Extension */}
                    {job.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => {
                          extensionBridge.publishJobViaExtension(
                            job,
                            { title: job.campaignTitle, content: job.campaignContent },
                            { phoneNumber: job.contactPhone, contactPerson: job.contactPerson, email: job.contactEmail }
                          );
                          showNotification(`دستور اجرای مستقیم با افزونه برای نوبت ${job.platformName} به مرورگر ارسال شد.`);
                        }}
                        title="اجرای مستقیم این جاب در مرورگر با افزونه و IP خانگی شما"
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center space-x-1 space-x-reverse"
                      >
                        <Puzzle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>اجرا با افزونه مرورگر</span>
                      </button>
                    )}

                    {/* Fast Forward / Complete Button for processing/pending jobs */}
                    {job.status !== 'published' && job.status !== 'failed' && (
                      <button
                        type="button"
                        onClick={() => handleFastForwardJob(job)}
                        disabled={actionLoadingId === job.id}
                        title="تایید انتشار پس از مشاهده و ثبت لینک واقعی آگهی"
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center space-x-1 space-x-reverse disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{actionLoadingId === job.id ? 'در حال ثبت...' : 'ثبت لینک واقعی انتشار'}</span>
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

                    {/* Explicit Pause & Cancel Buttons */}
                    {job.status !== 'published' && job.status !== 'failed' && job.status !== 'cancelled' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStopJob(job.id, 'paused')}
                          disabled={actionLoadingId === job.id}
                          title="توقف موقت (پاز) این نوبت انتشار"
                          className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors flex items-center space-x-1 space-x-reverse disabled:opacity-50"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{actionLoadingId === job.id ? 'در حال پاز...' : 'توقف موقت (Pause)'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStopJob(job.id, 'cancelled')}
                          disabled={actionLoadingId === job.id}
                          title="لغو کامل و متوقف ساختن این نوبت انتشار"
                          className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-colors flex items-center space-x-1 space-x-reverse disabled:opacity-50"
                        >
                          <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>{actionLoadingId === job.id ? 'در حال لغو...' : 'لغو و توقف'}</span>
                        </button>
                      </div>
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
                          : job.status === 'under_review' || job.currentStep?.includes('بررسی ناظر')
                          ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
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
                        ? 'انتشار موفقیت‌آمیز با لینک تایید شده'
                        : job.status === 'under_review' || job.currentStep?.includes('بررسی ناظر')
                        ? '📋 در صف بررسی ناظر پلتفرم'
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

                {/* ========================================================================= */}
                {/* 🌟 بخش ویژه: آخرین لاگ اجرای کرون‌جاب و تحلیل علت عدم پیشروی (Last Execution Log) */}
                {/* ========================================================================= */}
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-200">
                        آخرین لاگ اجرای کرون‌جاب (Last Execution Log):
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        گام: {diag.logStep}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>زمان ثبت لاگ: {diag.timestamp}</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diag.badgeColor}`}>
                        {job.status === 'pending'
                          ? 'در انتظار دیسپچ کرون‌جاب'
                          : job.status === 'waiting_otp'
                          ? 'نیازمند پیامک OTP'
                          : job.status === 'failed'
                          ? 'خطای اجرایی'
                          : 'در حال اجرای گردش کار'}
                      </span>
                    </div>
                  </div>

                  {/* Log Message Box */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-xs flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 text-slate-200 leading-relaxed">
                      <span className="text-amber-400 font-bold shrink-0">&gt;</span>
                      <span>{diag.logMessage}</span>
                    </div>
                    {job.status === 'pending' && (
                      <button
                        onClick={() => handleTriggerSingleJob(job)}
                        disabled={actionLoadingId === job.id}
                        className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold whitespace-nowrap shrink-0 transition-all"
                      >
                        اجرای فوری
                      </button>
                    )}
                  </div>

                  {/* Diagnostic Root-Cause Explanation */}
                  <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>علت وضعیت فعلی و گلوگاه عدم پیشروی: {diag.causeTitle}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed pr-5">
                      {diag.causeDescription}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-1 pr-5 font-medium">
                      <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>راهکار پیشنهادی: {diag.recommendedAction}</span>
                    </div>
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

                {/* Job Logs Feed (Collapsible / Expandable) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleJobLogExpanded(job.id)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      {isLogExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>تاریخچه کامل کلیه لاگ‌های سیستم ({toPersianDigits((job.logs || []).length)} لاگ ثبت شده)</span>
                    </button>
                    <span className="text-[10px] text-slate-500">
                      {isLogExpanded ? 'جهت بستن کلیک کنید' : 'جهت باز کردن کلیک کنید'}
                    </span>
                  </div>

                  {isLogExpanded && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
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
                  )}
                </div>
                
                {/* Raw JSON Debugger Tool */}
                <div className="pt-2 border-t border-slate-800/50 mt-3">
                  <details className="group">
                    <summary className="text-[11px] font-semibold text-sky-400 cursor-pointer list-none flex items-center gap-1.5 hover:text-sky-300 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block group-open:animate-ping"></span>
                      مشاهده ساختار داده خام JSON نوبت (Raw JSON Debugger)
                    </summary>
                    <div className="mt-2 p-3 rounded-xl bg-[#0a0a0a] border border-slate-800/80 overflow-x-auto">
                      <pre className="text-[10px] text-slate-400 font-mono text-left" dir="ltr">
                        {JSON.stringify(job, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              </div>
            );
          })
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>دسترسی مستقیم و تاییدشده به صفحات {assistantJob.platformName}:</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    بدون خطای ۴۰۴ (لینک‌های تست‌شده)
                  </span>
                </div>
                {(() => {
                  const urls = getPlatformUrls(assistantJob);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <a
                        href={urls.home}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-slate-200 text-xs font-medium flex items-center justify-between transition-colors"
                        title="صفحه اصلی رسمی سایت مقصد"
                      >
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-emerald-400" />
                          <span>صفحه اصلی سایت</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                      <a
                        href={urls.login || urls.register || urls.home}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-200 text-xs font-medium flex items-center justify-between transition-colors"
                        title="صفحه ورود / عضویت مستقیم در سایت"
                      >
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>ورود / ثبت‌نام مستقیم</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      </a>
                      <a
                        href={urls.submitAd || urls.home}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-500/10 text-slate-200 text-xs font-medium flex items-center justify-between transition-colors"
                        title="فرم درج و ثبت آگهی در سایت مقصد"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          <span>فرم ثبت آگهی</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
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

      {/* مودال اعتبارسنجی سلکتورها و دکمه‌های ورود/ثبت‌نام (Selector Validator Dry-Run Modal) */}
      {selectorValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-right overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5 space-x-reverse">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>اعتبارسنجی سلکتورها و دکمه‌های کلیدی: {selectorValidationModal.platformName}</span>
                    </h3>
                    <button
                      onClick={() => setShowSelectorHelp(true)}
                      title="راهنمای اعتبارسنجی سلکتورها"
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs w-6 h-6 flex items-center justify-center"
                    >
                      ؟
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    تست سلامت اندپوینت و پایش وجود دکمه‌های ورود، ثبت‌نام، ارسال آگهی و فیلدها قبل از اجرای فرآیند
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectorValidationModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Target Response Summary */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                selectorValidationModal.isAccessible
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${selectorValidationModal.isAccessible ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    <span className="font-bold text-sm text-slate-100">
                      وضعیت دسترسی سرور: {selectorValidationModal.httpStatusText}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3 text-amber-400" />
                    <span>آدرس ارزیابی‌شده:</span>
                    <a
                      href={selectorValidationModal.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline font-mono text-[10px] truncate max-w-xs block"
                    >
                      {selectorValidationModal.targetUrl}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-left font-mono">
                    <span className="text-[10px] text-slate-400 block">زمان پاسخ:</span>
                    <span className="font-bold text-slate-200">{toPersianDigits(selectorValidationModal.responseTimeMs)} میلی‌ثانیه</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                    selectorValidationModal.httpStatus === 200
                      ? 'bg-emerald-500 text-slate-950'
                      : selectorValidationModal.httpStatus === 404
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-500 text-slate-950'
                  }`}>
                    HTTP {selectorValidationModal.httpStatus}
                  </span>
                </div>
              </div>

              {/* Warning note if 404 */}
              {selectorValidationModal.warningNote && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block">توجه مهم در ارتباط با خطای ۴۰۴:</span>
                    <p className="text-[11px] leading-relaxed">
                      {selectorValidationModal.warningNote}
                      جهت رفع، دکمه‌های مستقیم پورتال در دستیار ورود بررسی و از فعال بودن اندپوینت ثبت‌نام اطمینان حاصل فرمایید.
                    </p>
                  </div>
                </div>
              )}

              {/* Elements & Selectors Check List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>وضعیت وجود دکمه‌ها و عناصر حیاتی در ساختار صفحه (DOM Element Scan):</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {toPersianDigits(selectorValidationModal.elements.filter(e => e.found).length)} از {toPersianDigits(selectorValidationModal.elements.length)} عنصر تایید شد
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {selectorValidationModal.elements.map((el, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                        el.found
                          ? 'bg-slate-950/80 border-slate-800/80 text-slate-200'
                          : 'bg-rose-950/10 border-rose-900/30 text-rose-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {el.found ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span className="font-bold text-slate-100">{el.persianLabel}</span>
                          <span className="text-[10px] font-mono text-slate-400">({el.elementRole})</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 pr-6" dir="ltr">
                          {el.testedSelector}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center pr-6 sm:pr-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          el.found
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {el.found ? `${toPersianDigits(el.confidenceScore)}% شناسایی شد` : 'یافت نشد'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectorValidationModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                بستن گزارش
              </button>

              <button
                onClick={() => handleRunSelectorValidation({
                  platformId: selectorValidationModal.platformId,
                  domain: selectorValidationModal.domain,
                  targetUrl: selectorValidationModal.targetUrl
                })}
                disabled={isValidatingSelectors}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isValidatingSelectors ? 'animate-spin' : ''}`} />
                <span>اجرای مجدد اعتبارسنجی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال راهنمای کنسول عیب‌یابی (Diagnostic Console Help Modal) */}
      {showDiagConsoleHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>راهنمای هوشمند: کنسول عیب‌یابی HTTP و سلکتورها</span>
              </h3>
              <button
                onClick={() => setShowDiagConsoleHelp(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-amber-300">
                کنسول عیب‌یابی چه کاری انجام می‌دهد؟
              </p>
              <p>
                این کنسول تمامی ارتباطات زنده با پلتفرم‌های انتشار آگهی را شنود کرده و در صورتی که صفحه‌ای با خطای ۴۰۴ مواجه شود، نشست منقضی گردد یا سلکتورهای دکمه ثبت‌نام جابجا شده باشند، دقیقاً آدرس، کد وضعیت HTTP و رشته سلکتور را به همراه راهکار اصلاحی به شما نشان می‌دهد.
              </p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block">انواع کدهای وضعیت در کنسول:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong className="text-emerald-300">کد ۲۰۰ (OK):</strong> سرور مقصد صفحه را باز کرده و فیلدها با موفقیت دریافت شدند.</li>
                  <li><strong className="text-rose-400">کد ۴۰۴ (Not Found):</strong> آدرس درخواستی در سایت مقصد تغییر یافته است. از دستیار ثبت‌نام برای رفتن به صفحه اصلی یا صفحه ورود بروزرسانی‌شده استفاده فرمایید.</li>
                  <li><strong className="text-amber-400">کد ۰ یا تایم‌اوت:</strong> محافظت فایروال یا کندی اینترنت رخ داده است.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDiagConsoleHelp(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال راهنمای اعتبارسنجی سلکتورها (Selector Help Modal) */}
      {showSelectorHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>راهنمای هوشمند: اعتبارسنجی زنده سلکتورها (Selector Validator)</span>
              </h3>
              <button
                onClick={() => setShowSelectorHelp(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-amber-300">
                چرا تست خشک (Dry-Run) پیش از اجرای نوبت ضروری است؟
              </p>
              <p>
                برای جلوگیری از هدررفت زمان و ارسال کدهای نامعتبر، ابزار «اعتبارسنجی سلکتورها» یک پیش‌بررسی زنده انجام می‌دهد تا مطمئن شود دکمه‌های ورود، فرم ارسال آگهی و فیلد شماره همراه با بالاترین درصد تطابق در دسترس هستند.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSelectorHelp(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
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
