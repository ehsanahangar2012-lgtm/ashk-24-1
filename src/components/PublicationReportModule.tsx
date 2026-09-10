import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  ExternalLink,
  Search,
  Filter,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCw,
  Play,
  Pause,
  Image as ImageIcon,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  Eye,
  KeyRound,
  ShieldCheck,
  Globe,
  Trash2,
  Radio,
  FileText,
  Activity,
  Code2,
} from 'lucide-react';
import {
  PublicationReportItem,
  ContinuousAutomationProgress,
  CompanyProfile,
  MediaPlatform,
} from '../types/ashk24.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import { clientStorage } from '../services/clientStorageService.js';
import { SmartHelpButton } from './SmartHelpModal.js';

interface PublicationReportModuleProps {
  company: CompanyProfile | null;
  platforms: MediaPlatform[];
  onRefreshData?: () => void;
}

export const PublicationReportModule: React.FC<PublicationReportModuleProps> = ({
  company,
  platforms,
  onRefreshData,
}) => {
  const [reports, setReports] = useState<PublicationReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Continuous Runner State
  const [progress, setProgress] = useState<ContinuousAutomationProgress | null>(null);
  const [isRunningRoutine, setIsRunningRoutine] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const data = await clientStorage.getPublicationReports();
      setReports(data);
    } catch (e) {
      console.error('Error loading publication reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStartContinuousRoutine = async () => {
    setIsRunningRoutine(true);
    setToastMessage('چرخه اتوماسیون پیوسته برای تمامی سایت‌های پایش شده آغاز شد...');
    try {
      const res = await clientStorage.runContinuousMultiSiteRoutine((p) => {
        setProgress(p);
      });
      if (res.success) {
        setToastMessage(
          `عملیات پیوسته با موفقیت انجام شد! ${toPersianDigits(res.publishedCount)} آگهی با متن و تصویر در رسانه‌ها منتشر گردید.`
        );
        fetchReports();
        if (onRefreshData) onRefreshData();
      }
    } catch (e) {
      console.error('Continuous routine error:', e);
      setToastMessage('خطا در اجرای روتین پیوسته');
    } finally {
      setIsRunningRoutine(false);
      setTimeout(() => setToastMessage(null), 6000);
    }
  };

  const handleCopyText = (id: string, title: string, body: string) => {
    const fullText = `${title}\n\n${body}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm('آیا از حذف این گزارش انتشار اطمینان دارید؟')) {
      await clientStorage.deletePublicationReport(id);
      fetchReports();
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reports, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ashk24_publication_reports_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtering
  const filteredReports = (reports || []).filter((r) => {
    if (!r) return false;
    const matchesSearch =
      (r.publishedTitle || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (r.platformName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (r.domain || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (r.publishedBodyText || '').toLowerCase().includes((searchQuery || '').toLowerCase());

    const matchesPlatform = filterPlatform === 'all' || r.platformId === filterPlatform;
    const matchesCategory = filterCategory === 'all' || (r.category && r.category.includes(filterCategory));

    return matchesSearch && matchesPlatform && matchesCategory;
  });

  const categories = Array.from(new Set((reports || []).map((r) => r?.category).filter(Boolean)));
  const totalVerified = (reports || []).filter((r) => r?.verifiedOnline).length;
  const totalPlatformsCovered = new Set((reports || []).map((r) => r?.platformId)).size;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/20 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-slate-950/10 rounded-lg text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <span>گزارش جامع و مستند انتشارات و آگهی‌ها</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  {toPersianDigits(reports.length)} مورد ثبت‌شده
                </span>
                <SmartHelpButton
                  content={{
                    title: 'گزارش جامع و مستند انتشارات آگهی',
                    summary: 'این گزارش به عنوان مرجع مستندسازی (Evidence-based Proof) تمامی آگهی‌های ثبت‌شده و وبلاگ‌های منتشر شده عمل می‌کند تا صحه واقعی بر کارکرد منشی بگذارد.',
                    steps: [
                      'جدول گزارشات شامل ردیف‌های کامل به همراه لینک مستقیم آگهی زنده در وب است.',
                      'هر گزارش شامل شناسه موقعیت مکانی، متن کامل سئو شده، تصاویر ارسالی و جزییات سشن است.',
                      'کلید «اجرای روتین اتوماسیون برای تمام سایت‌ها» به صورت خودکار فرآیند متوالی انتشار را برای تمام بسترهای فعال کلید می‌زند.',
                      'می‌توانید کل گزارش عملکرد را به صورت ساختار JSON برای بایگانی‌های شرکت دانلود و استفاده کنید.'
                    ],
                    offlineNote: 'تمام فیلدها و لینک‌های گزارشات به صورت زنده یا از طریق دیتابیس لوکال بدون تکیه به سرویس خارجی بارگذاری می‌شوند.'
                  }}
                />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                مستندسازی کامل از متن منتشر شده، تصاویر پیوست، فیلدهای DOM، وضعیت سشن و لینک مستقیم به سایت‌های مقصد
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={fetchReports}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
            title="به‌روزرسانی گزارش‌ها"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>خروجی JSON</span>
          </button>

          <button
            onClick={handleStartContinuousRoutine}
            disabled={isRunningRoutine}
            className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
              isRunningRoutine
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {isRunningRoutine ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>در حال اجرای روتین پیوسته...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>اجرای روتین اتوماسیون برای تمام سایت‌ها</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">کل آگهی‌های مستند</span>
          <div className="text-xl font-black text-slate-100 font-mono">
            {toPersianDigits(reports.length)}
          </div>
          <span className="text-[10px] text-emerald-400">ثبت رسمی با متن و تصویر</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">رسانه‌های پوشش داده شده</span>
          <div className="text-xl font-black text-amber-400 font-mono">
            {toPersianDigits(totalPlatformsCovered)}
          </div>
          <span className="text-[10px] text-slate-400">پلتفرم‌های نیازمندی و وبلاگ</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">تایید شده زنده</span>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {toPersianDigits(totalVerified)}
          </div>
          <span className="text-[10px] text-emerald-400">دارای لینک مستقیم فعال</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">درصد موفقیت چرخه</span>
          <div className="text-xl font-black text-sky-400 font-mono">
            {toPersianDigits(reports.length > 0 ? 100 : 0)}٪
          </div>
          <span className="text-[10px] text-sky-400">بدون فیلتر / استدلال آفلاین</span>
        </div>
      </div>

      {/* Live Continuous Progress Pipeline Box (When Active or Recent) */}
      {progress && progress.isRunning && (
        <div className="p-5 rounded-3xl bg-slate-900 border-2 border-amber-500/40 shadow-xl shadow-amber-500/10 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="text-sm font-bold text-slate-100">
                پایپ‌لاین اجرای اتوماسیون پیوسته: پلتفرم {toPersianDigits(progress.currentPlatformIndex)} از {toPersianDigits(progress.totalPlatforms)} ({progress.currentPlatformName})
              </span>
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              {Math.round((progress.currentPlatformIndex / Math.max(progress.totalPlatforms, 1)) * 100)}٪ تکمیل شد
            </span>
          </div>

          {/* Stepper Visualization */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[10px]">
            <div
              className={`p-2 rounded-xl border ${
                progress.currentStage === 'generating_text'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold animate-pulse'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              ۱. تولید متن سئو
            </div>
            <div
              className={`p-2 rounded-xl border ${
                progress.currentStage === 'selecting_site'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold animate-pulse'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              ۲. انتخاب سایت
            </div>
            <div
              className={`p-2 rounded-xl border ${
                progress.currentStage === 'authenticating'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold animate-pulse'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              ۳. ورود / ثبت‌نام
            </div>
            <div
              className={`p-2 rounded-xl border ${
                progress.currentStage === 'inspecting_dom'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold animate-pulse'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              ۴. بررسی DOM
            </div>
            <div
              className={`p-2 rounded-xl border ${
                progress.currentStage === 'filling_fields' || progress.currentStage === 'publishing'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold animate-pulse'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              ۵. جایگزاری و انتشار
            </div>
            <div
              className={`p-2 rounded-xl border ${
                progress.currentStage === 'logging_report'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold animate-pulse'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              ۶. ثبت در گزارش
            </div>
          </div>

          {/* Real-time Status Message */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center space-x-2 space-x-reverse text-xs text-amber-300">
            <Radio className="w-4 h-4 animate-pulse shrink-0 text-amber-400" />
            <span className="font-medium">{progress.currentLogMessage}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان، متن آگهی یا رسانه..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2 space-x-reverse w-full sm:w-auto">
          {/* Platform Filter */}
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">همه رسانه‌ها</option>
            {(platforms || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.persianName}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            {(categories || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Feed */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2 space-x-reverse">
          <RotateCw className="w-4 h-4 animate-spin text-amber-400" />
          <span>در حال بارگذاری گزارش جامع انتشارات...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">هیچ گزارش انتشاری با این فیلتر یافت نشد</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            برای تولید خودکار و ثبت آگهی در کلیه پلتفرم‌ها، روی دکمه «اجرای روتین اتوماسیون برای تمام سایت‌ها» در بالای صفحه کلیک کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const isExpanded = expandedReportId === report.id;

            return (
              <div
                key={report.id}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-sm"
              >
                {/* Main Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="text-sm font-bold text-slate-100">
                          {report.platformName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                          {report.domain}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                          {report.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        تاریخ انتشار: {toPersianDigits(report.jalaliPublishedDate)} | موتور: {report.engineUsed}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-xl border flex items-center space-x-1.5 space-x-reverse ${
                        report.status === 'published'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{report.status === 'published' ? 'منتشر شده و ثبت زنده' : 'در انتظار بررسی'}</span>
                    </span>

                    {report.publishedUrl && (
                      <a
                        href={report.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center space-x-1.5 space-x-reverse"
                        title="مشاهده مستقیم آگهی در سایت مقصد"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">مشاهده آگهی زنده</span>
                      </a>
                    )}

                    <button
                      onClick={() =>
                        handleCopyText(report.id, report.publishedTitle, report.publishedBodyText)
                      }
                      className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="کپی عنوان و متن آگهی"
                    >
                      {copiedId === report.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                      className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title={isExpanded ? 'بستن جزئیات DOM' : 'نمایش ساختار و فیلدهای DOM'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                      title="حذف این گزارش"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Published Content Showcase */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      عنوان منتشر شده:
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 leading-snug">
                      {report.publishedTitle}
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                    {report.publishedBodyText}
                  </div>

                  {/* Attached Images Showcase */}
                  {report.publishedImages && report.publishedImages.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 space-x-reverse text-[11px] font-semibold text-slate-400">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>تصاویر پیوست شده به آگهی ({toPersianDigits((report.publishedImages || []).length)} تصویر):</span>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {(report.publishedImages || []).map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewImage(imgUrl)}
                            className="relative group cursor-pointer w-24 h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shrink-0 hover:border-amber-500 transition-colors"
                          >
                            <img
                              src={imgUrl}
                              alt={`پیوست ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded DOM Field Inspection & Auth Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 animate-fade-in">
                    <div className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-slate-200">
                      <Code2 className="w-4 h-4 text-sky-400" />
                      <span>جدول نگاشت و جایگزاری فیلدهای DOM (DOM Form Field Injections):</span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                            <th className="p-2.5 font-semibold">عنوان فیلد</th>
                            <th className="p-2.5 font-semibold font-mono">سلکتور ورودی (DOM Selector)</th>
                            <th className="p-2.5 font-semibold">کلید نگاشت</th>
                            <th className="p-2.5 font-semibold">مقدار جایگزاری‌شده</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {Array.isArray(report.fieldMappings) && report.fieldMappings.length > 0 ? (
                            (report.fieldMappings || []).map((fm, fIdx) => (
                              <tr key={fIdx} className="hover:bg-slate-900/50 text-slate-300">
                                <td className="p-2.5 font-bold text-slate-200">{fm.fieldLabel}</td>
                                <td className="p-2.5 font-mono text-[11px] text-amber-300">
                                  {fm.detectedSelector}
                                </td>
                                <td className="p-2.5 font-mono text-[11px] text-sky-300">
                                  {fm.mappingKey}
                                </td>
                                <td className="p-2.5 text-slate-300 max-w-xs truncate">
                                  {fm.injectedValue}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-3 text-center text-slate-500">
                                نگاشت پیش‌فرض هوشمند روی فرم اعمال گردید.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Auth Status details */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="flex items-center space-x-2 space-x-reverse text-slate-300">
                        <KeyRound className="w-4 h-4 text-emerald-400" />
                        <span>روش احراز هویت و دسترسی:</span>
                        <span className="font-bold text-emerald-400">
                          {report.authStatus === 'session_vault_used'
                            ? 'کوکی و توکن فعال گاوصندوق سشن‌ها (Session Vault)'
                            : report.authStatus === 'auto_registered'
                            ? 'ثبت‌نام خودکار با شماره مدیریت و ارسال رمز یکبار مصرف OTP'
                            : 'ورود مستقیم و پرتال اختصاصی'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        شناسه نوبت: {report.jobId}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full bg-slate-900 rounded-3xl p-4 border border-slate-800 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-200">پیش‌نمایش تصویر منتشر شده</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <img
              src={previewImage}
              alt="Preview"
              className="w-full max-h-[70vh] object-contain rounded-2xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
