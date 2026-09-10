import React, { useState, useEffect } from 'react';
import {
  Bug,
  Cpu,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Terminal,
  FileCode2,
  ShieldCheck,
  Search,
  Filter,
  Trash2,
  ChevronDown,
  ChevronUp,
  Globe,
  Lock,
  Smartphone,
  Eye,
  Layers,
  Camera,
  HeartPulse,
  MousePointer,
  Crosshair,
  AlertCircle,
  Play,
  Maximize2,
} from 'lucide-react';
import { clientStorage } from '../services/clientStorageService.js';
import { SmartHelpButton } from './SmartHelpModal.js';
import {
  PublicationTelemetryLog,
  TelemetryAutoPatch,
  PublicationDebuggerReport,
  TelemetryFailureReason,
  DomWatcherEvent,
  SelfHealingCheckResult,
  PreSubmissionValidationPayload,
} from '../types/ashk24.js';

export const PublicationDebuggerModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'traces' | 'dom_watcher' | 'pre_validation' | 'self_healing'>('traces');
  const [logs, setLogs] = useState<PublicationTelemetryLog[]>([]);
  const [patches, setPatches] = useState<TelemetryAutoPatch[]>([]);
  const [report, setReport] = useState<PublicationDebuggerReport | null>(null);
  const [domEvents, setDomEvents] = useState<DomWatcherEvent[]>([]);
  const [selfHealingResults, setSelfHealingResults] = useState<SelfHealingCheckResult[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [probing, setProbing] = useState<boolean>(false);
  const [auditing, setAuditing] = useState<boolean>(false);
  const [applyingPatchId, setApplyingPatchId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'error' | 'success' | 'patch'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  const loadTelemetryData = async () => {
    setLoading(true);
    try {
      const [fetchedLogs, fetchedPatches, fetchedReport, fetchedDomEvents, fetchedHealing] = await Promise.all([
        clientStorage.getTelemetryLogs(),
        clientStorage.getAutoPatches(),
        clientStorage.getPublicationDebuggerReport(),
        clientStorage.getDomWatcherEvents(),
        clientStorage.getSelfHealingAuditResults(),
      ]);
      setLogs(fetchedLogs);
      setPatches(fetchedPatches);
      setReport(fetchedReport);
      setDomEvents(fetchedDomEvents);
      setSelfHealingResults(fetchedHealing);
    } catch (err: any) {
      console.error('Error loading telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetryData();
  }, []);

  // Poll DOM Watcher Events every 3 seconds if on dom_watcher tab
  useEffect(() => {
    if (activeSubTab !== 'dom_watcher') return;
    const interval = setInterval(async () => {
      const evts = await clientStorage.getDomWatcherEvents();
      setDomEvents(evts);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeSubTab]);

  const handleRunLiveProbe = async () => {
    setProbing(true);
    setStatusMessage({ text: 'در حال اجرای پایش زنده و عیب‌یابی عمیق اندپینت‌های انتشار...', type: 'info' });
    try {
      const res = await clientStorage.triggerTelemetryProbeNow();
      setLogs(res.logs);
      setReport(res.report);
      setStatusMessage({ text: res.message || 'پایش زنده و دیباگ هوشمند با موفقیت انجام شد.', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: `خطا در اجرای دیباگر: ${err.message}`, type: 'error' });
    } finally {
      setProbing(false);
    }
  };

  const handleRunSelfHealingAudit = async () => {
    setAuditing(true);
    setStatusMessage({ text: 'موتور پایشگر خود-ترمیم (Self-Healing): بررسی تطابق DOM فرم‌ها با نقشه مرجع...', type: 'info' });
    try {
      const res = await clientStorage.runSelfHealingAudit();
      setSelfHealingResults(res.results);
      await loadTelemetryData();
      setStatusMessage({
        text: `پایش خود-ترمیم به پایان رسید. تعداد ${res.auditedPlatformsCount} پلتفرم بررسی شد (${res.newPatchesGenerated} پچ جدید تولید گردید).`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({ text: `خطا در پایش خود-ترمیم: ${err.message}`, type: 'error' });
    } finally {
      setAuditing(false);
    }
  };

  const handleSimulatePreValidationTest = async () => {
    setStatusMessage({ text: 'در حال اجرای لایه اعتبارسنجی پیش از ارسال فرم و ثبت اسکرین‌شات لحظه‌ای...', type: 'info' });
    try {
      // Simulate validation check
      const samplePayload: PreSubmissionValidationPayload = {
        platformId: 'plat_divar',
        platformName: 'دیوار',
        formType: 'ad_creation',
        targetUrl: 'https://divar.ir/new',
        validatedAt: new Date().toLocaleTimeString('fa-IR'),
        allValid: false,
        fields: [
          { fieldName: 'شماره همراه کاربری', selector: 'input[type="tel"]', value: '09153108763', isValid: true, hasCssErrorClass: false },
          { fieldName: 'عنوان آگهی رسمی', selector: 'input[name="title"]', value: '', isValid: false, hasCssErrorClass: true, detectedErrorClasses: ['border-red-500', 'is-invalid'], errorMessage: 'عنوان آگهی نمی‌تواند خالی باشد' },
          { fieldName: 'توضیحات و خدمات', selector: 'textarea[name="description"]', value: 'ارائه خدمات اتوماسیون رسمی شرکت.', isValid: true, hasCssErrorClass: false },
          { fieldName: 'قیمت پایه (تومان)', selector: 'input[name="price"]', value: '0', isValid: true, hasCssErrorClass: false },
        ],
        capturedScreenshotBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380" fill="%230f172a"><rect width="600" height="380" rx="12" fill="%230f172a"/><rect x="20" y="20" width="560" height="40" rx="8" fill="%231e293b"/><text x="40" y="45" fill="%2338bdf8" font-family="sans-serif" font-size="14" font-weight="bold">PRE-SUBMISSION FORM VALIDATION SNAPSHOT [DIVAR.IR]</text><rect x="40" y="80" width="520" height="45" rx="6" fill="%23334155" stroke="%2310b981" stroke-width="2"/><text x="55" y="108" fill="%23e2e8f0" font-family="sans-serif" font-size="12">Mobile: 09153108763 [VALID]</text><rect x="40" y="140" width="520" height="45" rx="6" fill="%23450a0a" stroke="%23ef4444" stroke-width="3"/><text x="55" y="168" fill="%23fca5a5" font-family="sans-serif" font-size="12" font-weight="bold">Title: EMPTY [CSS ERROR: .border-red-500 .is-invalid]</text><rect x="40" y="200" width="520" height="70" rx="6" fill="%23334155" stroke="%2310b981" stroke-width="2"/><text x="55" y="238" fill="%23e2e8f0" font-family="sans-serif" font-size="12">Description: Official company automation services [VALID]</text><rect x="40" y="290" width="520" height="45" rx="8" fill="%23991b1b"/><text x="210" y="318" fill="%23ffffff" font-family="sans-serif" font-size="14" font-weight="bold">SUBMIT BLOCKED BY PRE-VALIDATION LAYER</text></svg>',
      };

      const res = await clientStorage.validatePreSubmission(samplePayload);
      await loadTelemetryData();
      setActiveSubTab('pre_validation');
      setStatusMessage({
        text: `تست اعتبارسنجی اجرا شد. فرم مسدود شد (${res.invalidFieldsCount} فیلد نامعتبر/دارای کلاس خطا). اسکرین‌شات لحظه‌ای در لاگ ذخیره گردید.`,
        type: 'error',
      });
    } catch (err: any) {
      setStatusMessage({ text: `خطا در تست اعتبارسنجی: ${err.message}`, type: 'error' });
    }
  };

  const handleApplyPatch = async (patchId: string) => {
    setApplyingPatchId(patchId);
    try {
      const res = await clientStorage.applyAutoPatch(patchId);
      if (res.success) {
        setStatusMessage({ text: res.message, type: 'success' });
        await loadTelemetryData();
      } else {
        setStatusMessage({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `خطا در اعمال پچ: ${err.message}`, type: 'error' });
    } finally {
      setApplyingPatchId(null);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('آیا از پاکسازی تمام لاگ‌های دیباگر و ردگیری‌های پایش اطمینان دارید؟')) {
      await clientStorage.clearTelemetryLogs();
      await clientStorage.clearDomWatcherEvents();
      setStatusMessage({ text: 'کلیه لاگ‌های پایش، رویدادهای DOM و دیباگر پاکسازی شدند.', type: 'info' });
      await loadTelemetryData();
    }
  };

  const getFailureReasonLabel = (reason?: TelemetryFailureReason) => {
    switch (reason) {
      case 'MISSING_SELECTOR':
        return 'عدم شناسایی المان HTML';
      case 'CAPTCHA_BLOCKED':
        return 'بلاک کپچا/ضدروبات';
      case 'RATE_LIMITED':
        return 'محدودیت نرخ ارسال (Rate Limit)';
      case 'INVALID_OTP_FIELD':
        return 'خطای فیلد کد OTP';
      case 'CSRF_TOKEN_EXPIRED':
        return 'انقضای توکن امنیتی CSRF';
      case 'CORS_ORIGIN_REJECTED':
        return 'رد هدر Origin/CORS';
      case 'SESSION_TIMEOUT':
        return 'پایان زمان سشن کاربری';
      case 'NETWORK_OFFLINE':
        return 'عدم دسترسی به سرور مقصد';
      case 'PLATFORM_LAYOUT_CHANGED':
        return 'تغییر ساختار DOM پلتفرم';
      default:
        return 'خطای نا مشخص سیستم';
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (filterType === 'error' && l.status !== 'error') return false;
    if (filterType === 'success' && l.status !== 'success') return false;
    if (filterType === 'patch' && !l.suggestedAutoPatch) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        l.platformName.toLowerCase().includes(term) ||
        l.platformDomain.toLowerCase().includes(term) ||
        (l.errorDetails && l.errorDetails.toLowerCase().includes(term)) ||
        (l.aiDiagnosticSummary && l.aiDiagnosticSummary.toLowerCase().includes(term)) ||
        (l.requestUrl && l.requestUrl.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const preValidationLogs = logs.filter((l) => l.stage === 'pre_validation' || l.preValidationResult || l.validationScreenshotBase64);

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3 space-x-reverse mb-2">
              <span className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Bug className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                  <span>دیباگر و پایش هوشمند ثبت‌نام و انتشار (God-Mode AI Telemetry)</span>
                  <SmartHelpButton
                    content={{
                      title: 'دیباگر و پایش هوشمند تلمتری (Telemetry Debugger)',
                      summary: 'این ابزار تخصصی پایش لحظه‌ای و ثبت عیوب در تمامی مراحل انتشار آگهی را بر عهده داشته و راهکارهای اصلاحی خودکار (Self-Healing) را به اجرا درمی‌آورد.',
                      steps: [
                        'بخش ردگیری‌های شبکه لاگ‌های کامل ارتباط با سرور و هرگونه شکست احتمالی را ذخیره می‌کند.',
                        'بخش دیده‌بان تعاملات DOM کلیک‌ها و مقادیر ثبت‌شده توسط ربات را به صورت شفاف ردگیری می‌کند.',
                        'بخش اعتبارسنجی پیش از ارسال تصاویری از فرم را درست پیش از کلیک نهایی ثبت و بایگانی می‌کند.',
                        'بخش پایشگر خود-ترمیم با شناسایی ناهماهنگی‌های فیلدها، اقدام به اعمال پچ‌های اصلاحی بدون نیاز به تغییر کد منبع می‌کند.'
                      ],
                      offlineNote: 'تمام فرآیندهای عیب‌یابی و پچ‌های خود-ترمیم به صورت کاملاً لوکال و آفلاین بدون نیاز به اتصال دائم اینترنت عمل می‌کنند.'
                    }}
                  />
                </h1>
                <p className="text-xs text-indigo-200/80 mt-1">
                  پایش زنده اندپینت‌های API، تحلیل DOM، اعتبارسنجی پیش از ارسال فرم و ترمیم خودکار ناهماهنگی‌ها
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse w-full md:w-auto">
            <button
              onClick={handleRunLiveProbe}
              disabled={probing}
              className="flex-1 md:flex-initial flex items-center justify-center space-x-2 space-x-reverse px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 text-xs sm:text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${probing ? 'animate-spin' : ''}`} />
              <span>{probing ? 'در حال پایش...' : 'پایش زنده دامنه‌ها'}</span>
            </button>

            <button
              onClick={handleSimulatePreValidationTest}
              className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium rounded-xl border border-rose-500/30 text-xs flex items-center space-x-1.5 space-x-reverse transition"
              title="تست لایه اعتبارسنجی فرم"
            >
              <Camera className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">تست اعتبارسنجی + اسکرین‌شات</span>
            </button>

            <button
              onClick={loadTelemetryData}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleClearLogs}
              className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl border border-rose-500/30 transition"
              title="پاکسازی لاگ‌ها"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Navigation Sub-Tabs */}
        <div className="mt-6 pt-4 border-t border-indigo-900/50 flex flex-wrap gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('traces')}
            className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 space-x-reverse ${
              activeSubTab === 'traces'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>ردگیری‌های شبکه و لاگ‌ها ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('dom_watcher')}
            className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 space-x-reverse ${
              activeSubTab === 'dom_watcher'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <MousePointer className="w-4 h-4 text-amber-400" />
            <span>دیده‌بان زنده تعاملات DOM ({domEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pre_validation')}
            className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 space-x-reverse ${
              activeSubTab === 'pre_validation'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>اعتبارسنجی پیش از ارسال + اسکرین‌شات ({preValidationLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('self_healing')}
            className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 space-x-reverse ${
              activeSubTab === 'self_healing'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>پایشگر خود-ترمیم (Self-Healing Monitor)</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
          }`}
        >
          <div className="flex items-center space-x-2 space-x-reverse">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {statusMessage.type === 'error' && <XCircle className="w-5 h-5 text-rose-500" />}
            {statusMessage.type === 'info' && <Activity className="w-5 h-5 text-indigo-500 animate-spin" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 mr-4"
          >
            بستن
          </button>
        </div>
      )}

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">کل ردگیری‌های پایش</div>
            <div className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">
              {report?.totalTraces || logs.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">ثبت‌شده در دیتابیس هوشمند</div>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">رویدادهای دیده‌بان DOM</div>
            <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {domEvents.length}
            </div>
            <div className="text-[11px] text-amber-500 mt-0.5">ثبت زنده تعاملات با فیلدها</div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <MousePointer className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">اسکرین‌شات‌های اعتبارسنجی</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {preValidationLogs.length}
            </div>
            <div className="text-[11px] text-emerald-500 mt-0.5">ثبت خودکار لحظه پیش از کلیک</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Camera className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">وضعیت پایشگر خود-ترمیم</div>
            <div className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
              {selfHealingResults.filter((r) => !r.isCompliant).length > 0 ? 'نیاز به پچ' : 'سالم'}
            </div>
            <div className="text-[11px] text-rose-500 mt-0.5">
              {selfHealingResults.length} پلتفرم پایش‌شده
            </div>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
            <HeartPulse className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* AI Auto-Patches Banner */}
      {patches.some((p) => p.status === 'pending') && (
        <div className="bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-indigo-900/10 border border-indigo-500/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse text-indigo-700 dark:text-indigo-300 font-semibold text-base">
              <Zap className="w-5 h-5 text-indigo-500" />
              <span>پچ‌های اصلاحی هوشمند پیشنهادی (AI Auto-Fix Patches)</span>
            </div>
            <span className="text-xs px-2.5 py-1 bg-indigo-500/20 text-indigo-400 rounded-full font-medium">
              {(patches || []).filter((p) => p.status === 'pending').length} پچ آماده
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(patches || [])
              .filter((p) => p.status === 'pending')
              .map((patch) => (
                <div
                  key={patch.patchId}
                  className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-indigo-200 dark:border-indigo-950 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md">
                        {patch.issueType}
                      </span>
                      <span className="text-[11px] text-slate-400">شناسه: {patch.patchId}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{patch.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {patch.description}
                    </p>

                    {patch.suggestedSelectorFix && (
                      <div className="bg-slate-950 text-amber-400 font-mono text-[11px] p-2 rounded-lg overflow-x-auto dir-ltr">
                        Suggested Selector: {patch.suggestedSelectorFix}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">پلتفرم هدف: {patch.targetPlatformId}</span>
                    <button
                      onClick={() => handleApplyPatch(patch.patchId)}
                      disabled={applyingPatchId === patch.patchId}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 space-x-reverse transition"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{applyingPatchId === patch.patchId ? 'در حال اعمال...' : 'اعمال فوری پچ'}</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 1: TRACES & NETWORK LOGS --- */}
      {activeSubTab === 'traces' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-2 space-x-reverse text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Terminal className="w-4 h-4 text-indigo-500" />
              <span>جریان پایش زنده و لاگ‌های دیباگر (Live Telemetry Packets)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  همه ({logs.length})
                </button>
                <button
                  onClick={() => setFilterType('error')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterType === 'error'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  خطاها ({logs.filter((l) => l.status === 'error').length})
                </button>
                <button
                  onClick={() => setFilterType('success')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterType === 'success'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  موفق ({logs.filter((l) => l.status === 'success').length})
                </button>
              </div>

              <div className="relative flex-1 md:w-48">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="جستجوی دامنه، خطا..."
                  className="w-full pr-9 pl-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[600px] overflow-y-auto">
            {(!filteredLogs || filteredLogs.length === 0) ? (
              <div className="p-12 text-center text-slate-400">
                <Bug className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">هیچ لاگ ردگیری با فیلتر انتخابی یافت نشد.</p>
              </div>
            ) : (
              (filteredLogs || []).map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div key={log.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3 space-x-reverse min-w-0">
                        <span
                          className={`p-2 rounded-xl flex-shrink-0 ${
                            log.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : log.status === 'warning'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : log.status === 'warning' ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 space-x-reverse flex-wrap">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                              {log.platformName}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">({log.platformDomain})</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-medium">
                              {log.stage}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-xl">
                            {log.aiDiagnosticSummary || log.errorDetails || log.requestUrl}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 space-x-reverse flex-shrink-0 self-end sm:self-center">
                        {log.failureReason && (
                          <span className="text-xs px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg font-medium">
                            {getFailureReasonLabel(log.failureReason)}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 dir-ltr">{log.timestamp}</span>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-5 pt-2 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 space-x-reverse">
                              <Globe className="w-4 h-4 text-indigo-500" />
                              <span>درخواست شبکه</span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 space-y-1 dir-ltr">
                              <div><strong className="text-indigo-400">Method:</strong> {log.requestMethod || 'POST'}</div>
                              <div className="break-all"><strong className="text-indigo-400">URL:</strong> {log.requestUrl}</div>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 space-x-reverse">
                              <FileCode2 className="w-4 h-4 text-emerald-500" />
                              <span>عنااصر DOM</span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-300 space-y-1">
                              <div><strong>ورودی‌ها:</strong> {log.detectedFormInputs?.join(', ') || 'ندارد'}</div>
                              <div><strong>کپچا:</strong> {log.detectedCaptchaType || 'ندارد'}</div>
                            </div>
                          </div>
                        </div>

                        {log.aiDiagnosticSummary && (
                          <div className="bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3.5 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                            <div className="font-bold flex items-center space-x-1.5 space-x-reverse">
                              <Cpu className="w-4 h-4 text-indigo-500" />
                              <span>تحلیل هوشمند دیباگر:</span>
                            </div>
                            <p className="leading-relaxed">{log.aiDiagnosticSummary}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 2: REAL-TIME DOM WATCHER --- */}
      {activeSubTab === 'dom_watcher' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-2 space-x-reverse">
              <MousePointer className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  دیده‌بان زنده تعاملات DOM (Real-time DOM Watcher)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ردگیری متنی تمام تلاش‌های هوش مصنوعی برای یافتن سلکتورها، تایپ متون و کلیک روی دکمه‌ها
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                await clientStorage.clearDomWatcherEvents();
                setDomEvents([]);
              }}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-xs font-medium transition"
            >
              پاکسازی رویدادهای DOM
            </button>
          </div>

          <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 max-h-[500px] overflow-y-auto divide-y divide-slate-800/80">
            {(!domEvents || domEvents.length === 0) ? (
              <div className="p-8 text-center text-slate-500">
                <Crosshair className="w-10 h-10 mx-auto mb-2 opacity-40 animate-spin" />
                <p>در حال انتظار برای تعامل زنده با عناصر DOM...</p>
                <p className="text-[11px] text-slate-600 mt-1">در تب «ارسال مستقیم فرم»، عملیاتی را تست کنید تا تمام رویدادها اینجا ثبت شوند.</p>
              </div>
            ) : (
              (domEvents || []).map((evt) => (
                <div key={evt.id} className="py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 space-x-reverse min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : evt.status === 'error'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      [{evt.actionType}]
                    </span>

                    <span className="text-indigo-400 font-bold">{evt.platformName}:</span>
                    <span className="text-amber-300 dir-ltr font-bold">{evt.targetSelector}</span>
                    <span className="text-slate-400 dir-rtl text-[11px] truncate">{evt.details}</span>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse text-[11px] text-slate-500">
                    {evt.inputValue && (
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                        Input: "{evt.inputValue}"
                      </span>
                    )}
                    <span className="dir-ltr text-slate-500">{evt.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 3: PRE-SUBMISSION VALIDATION & SCREENSHOTS --- */}
      {activeSubTab === 'pre_validation' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Camera className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  لایه اعتبارسنجی پیش از ارسال + اسکرین‌شات لحظه‌ای (Pre-submission Form Validation)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  بررسی فیلدهای خالی و کلاس‌های خطا پیش از کلیک نهایی + ثبت اسکرین‌شات لحظه خطا
                </p>
              </div>
            </div>

            <button
              onClick={handleSimulatePreValidationTest}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium flex items-center space-x-2 space-x-reverse transition shadow"
            >
              <Play className="w-3.5 h-3.5" />
              <span>اجرای فوری تست اعتبارسنجی</span>
            </button>
          </div>

          <div className="p-5 space-y-4">
            {(!preValidationLogs || preValidationLogs.length === 0) ? (
              <div className="p-12 text-center text-slate-400">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">هنوز لاگ اعتبارسنجی پیش از ارسالی ثبت نشده است.</p>
                <button
                  onClick={handleSimulatePreValidationTest}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  اجرای شبیه‌سازی اعتبارسنجی فرم
                </button>
              </div>
            ) : (
              (preValidationLogs || []).map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span
                        className={`p-1.5 rounded-lg ${
                          log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {log.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{log.platformName}</span>
                      <span className="text-xs text-slate-400 dir-ltr">({log.requestUrl})</span>
                    </div>

                    <span className="text-xs text-slate-400 dir-ltr">{log.timestamp}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {log.errorDetails || log.aiDiagnosticSummary}
                  </p>

                  {/* Fields Breakdown Table */}
                  {log.preValidationResult?.fields && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">فیلدهای بررسی‌شده پیش از کلیک:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(log.preValidationResult.fields || []).map((f, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                              f.isValid && !f.hasCssErrorClass
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold'
                            }`}
                          >
                            <div>
                              <div>{f.fieldName}</div>
                              <div className="font-mono text-[10px] opacity-70 dir-ltr">{f.selector}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px]">
                              {f.isValid && !f.hasCssErrorClass ? 'تایید' : 'خطا / خالی'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Captured Screenshot Preview */}
                  {log.validationScreenshotBase64 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center space-x-1 space-x-reverse">
                          <Camera className="w-4 h-4 text-indigo-500" />
                          <span>اسکرین‌شات ثبت‌شده لحظه اعتبارسنجی (Form Snapshot):</span>
                        </span>

                        <button
                          onClick={() => setSelectedScreenshot(log.validationScreenshotBase64 || null)}
                          className="text-indigo-500 hover:text-indigo-400 text-xs flex items-center space-x-1 space-x-reverse"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>بزرگ‌نمایی اسکرین‌شات</span>
                        </button>
                      </div>

                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 max-w-xl overflow-hidden">
                        <img
                          src={log.validationScreenshotBase64}
                          alt="Validation Screenshot"
                          className="w-full h-auto rounded-lg border border-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 4: SELF-HEALING MONITOR --- */}
      {activeSubTab === 'self_healing' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-2 space-x-reverse">
              <HeartPulse className="w-5 h-5 text-rose-500 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  ماژول پایشگر خود-ترمیم (Self-Healing Monitor Engine)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  فراخوانی دوره‌ای فرم‌ها در محیط ایزوله و مقایسه ساختار زنده DOM با نقشه مرجع برای اصلاح اتوماتیک پچ‌ها
                </p>
              </div>
            </div>

            <button
              onClick={handleRunSelfHealingAudit}
              disabled={auditing}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium flex items-center space-x-2 space-x-reverse transition shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin' : ''}`} />
              <span>{auditing ? 'در حال پایش...' : 'اجرای پایش خود-ترمیم جدید'}</span>
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(selfHealingResults || []).map((res) => (
                <div
                  key={res.platformId}
                  className={`p-5 rounded-2xl border space-y-3 ${
                    res.isCompliant
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-rose-500/5 border-rose-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-slate-800 dark:text-slate-100">{res.platformName}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        res.isCompliant
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {res.isCompliant ? 'کاملاً منطبق' : 'نیازمند ترمیم DOM'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {res.diagnosticSummary}
                  </p>

                  {(res.mismatchedSelectors || []).length > 0 && (
                    <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-rose-200 dark:border-rose-950 space-y-2 text-xs">
                      <div className="font-bold text-rose-600 dark:text-rose-400">انحرافات سلکتوری کشف‌شده:</div>
                      {(res.mismatchedSelectors || []).map((m, idx) => (
                        <div key={idx} className="text-[11px] space-y-1 dir-ltr text-left font-mono">
                          <div className="text-slate-400">Target: {m.fieldRole}</div>
                          <div className="text-rose-400">Old: {m.expectedSelector}</div>
                          <div className="text-emerald-400 font-bold">Suggested: {m.suggestedFixSelector}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>زمان پایش: {res.checkTimestamp}</span>
                    {res.patchId && (
                      <span className="text-indigo-400 font-mono font-bold">پچ خودکار {res.patchId} تولید شد</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Modal Viewer */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center space-x-2 space-x-reverse">
                <Camera className="w-5 h-5 text-indigo-400" />
                <span>تصویر بزرگ‌نمایی اسکرین‌شات لحظه اعتبارسنجی فرم</span>
              </h3>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
              >
                بستن
              </button>
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 overflow-auto max-h-[70vh]">
              <img src={selectedScreenshot} alt="Full Screenshot" className="w-full h-auto rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

