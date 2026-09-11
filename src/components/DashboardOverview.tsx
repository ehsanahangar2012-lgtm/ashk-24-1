import React from 'react';
import {
  Megaphone,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Inbox,
  Play,
  ShieldCheck,
  Smartphone,
  FileCheck2,
  Eye,
} from 'lucide-react';
import { Campaign, PublicationJob, ResilienceStatus, SmsWebhookPayload } from '../types/ashk24.js';
import { toPersianDigits, toTomanFormat } from '../utils/persianUtils.js';
import { OfflineSyncStatus } from './OfflineSyncStatus';
import { SmartHelpButton } from './SmartHelpModal';

interface DashboardOverviewProps {
  campaigns: Campaign[];
  jobs: PublicationJob[];
  resilience: ResilienceStatus | null;
  smsLogs: SmsWebhookPayload[];
  onNavigateTab: (tab: any) => void;
  onTriggerJob: (campaignId: string, platformId: string) => void;
  onToggleForcedOffline?: (forced: boolean) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  campaigns,
  jobs,
  resilience,
  smsLogs,
  onNavigateTab,
  onTriggerJob,
  onToggleForcedOffline,
}) => {
  const runningJobs = jobs.filter((j) => j.status !== 'published' && j.status !== 'failed');
  const publishedJobs = jobs.filter((j) => j.status === 'published');
  const successRate = jobs.length > 0 ? Math.round((publishedJobs.length / jobs.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 space-x-reverse text-amber-400 text-xs font-semibold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>سیستم اتوماسیون ۲۴ ساعته خودمختار</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              خوش‌آمدید به مرکز فرماندهی بازاریابی اشک ۲۴
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              مدیریت یکپارچه تولید محتوا، تحلیل معنایی فرم‌های وب، استخراج پیامک OTP و انتشار خودکار آگهی در رسانه‌های هدف.
            </p>
          </div>
          <div className="shrink-0 self-start md:self-auto">
            <SmartHelpButton
              content={{
                title: 'داشبورد جامع فرماندهی اشک ۲۴',
                summary: 'این بخش نمای کلان فعالیت‌های انتشار آگهی، آمار ثبت موفق، کارکردهای منشی اتوماتیک و وضعیت سرور را نمایش می‌دهد.',
                steps: [
                  'از دکمه «پایش زنده» برای مشاهده لحظه‌ای عملیات ثبت فرم استفاده کنید.',
                  'وضعیت سینک آفلاین نشان‌دهنده ذخیره‌سازی محلی روی هاست ایران/cPanel بدون نیاز به Node.js است.',
                  'برای ایجاد یا ویرایش پروژه‌ها به بخش کمپین‌ها مراجعه نمایید.'
                ],
                offlineNote: 'تمام داده‌های داشبورد در حافظه محلی ذخیره می‌شوند و حتی هنگام قطعی اینترنت کاملاً رندر می‌گردند.'
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => onNavigateTab('live_visualizer')}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5 space-x-reverse animate-pulse"
          >
            <Eye className="w-4 h-4 ml-1" />
            <span>پایش زنده و تصویری ثبت‌نام</span>
          </button>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>گزارش انتشارات و آگهی‌ها</span>
          </button>
          <button
            onClick={() => onNavigateTab('autonomous')}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>منشی ۲۴ ساعته (24/7 Bot)</span>
          </button>
          <button
            onClick={() => onNavigateTab('mobile_companion')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-amber-300 border border-slate-800 hover:bg-slate-800 font-bold text-xs transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>اتصال همراه موبایل (OTP)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>کمپین‌های فعال</span>
            <Megaphone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {toPersianDigits(campaigns.length)} <span className="text-xs text-slate-400 font-normal">کمپین</span>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center space-x-1 space-x-reverse">
            <TrendingUp className="w-3 h-3" />
            <span>زمان‌بندی شده براساس تقویم شمسی</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>نوبت‌های در حال انتشار</span>
            <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {toPersianDigits(runningJobs.length)} <span className="text-xs text-slate-400 font-normal">فرآیند زنده</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {runningJobs.length > 0 ? 'در حال پایش و دریافت OTP...' : 'تمامی نوبت‌ها تکمیل شدند'}
          </div>
        </div>

        {/* Stat 3 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>نرخ موفقیت انتشار</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            %{toPersianDigits(successRate)}
          </div>
          <div className="text-[11px] text-emerald-400">
            {toPersianDigits(publishedJobs.length)} آگهی موفق ثبت شد
          </div>
        </div>

        {/* Stat 4 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>موتور فعلی سیستم</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 truncate">
            {resilience?.activeEngine === 'cpanel-native-engine' ? 'cPanel PHP (آنلاین)' : 'هوریستیک (آفلاین)'}
          </div>
          <div className="text-[11px] text-slate-400">
            تعداد سوئیچ به پشتیبان: {toPersianDigits(resilience?.fallbackCount || 0)} بار
          </div>
        </div>
      </div>

      {/* Offline Sync Status & Health Component */}
      <OfflineSyncStatus
        onToggleForcedOffline={onToggleForcedOffline}
        isForcedOffline={Boolean(resilience?.forcedOfflineMode)}
      />

      {/* Grid: Active Campaigns & Live OTP Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Campaigns List */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-200">کمپین‌های ثبت‌شده در سامانه</h3>
            </div>
            <button
              onClick={() => onNavigateTab('campaigns')}
              className="text-xs text-amber-400 hover:underline flex items-center space-x-1 space-x-reverse"
            >
              <span>مشاهده همه</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {(campaigns || []).map((camp) => (
              <div
                key={camp.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-xs font-bold text-slate-200">{camp.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-semibold">
                      {camp.jalaliScheduleDate} - {camp.jalaliScheduleTime}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center space-x-3 space-x-reverse">
                    <span>محصول: {camp.productName}</span>
                    <span>|</span>
                    <span>قیمت: {toTomanFormat(camp.priceToman)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  {(camp.selectedPlatformIds || []).slice(0, 2).map((pid) => (
                    <button
                      key={pid}
                      onClick={() => onTriggerJob(camp.id, pid)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium transition-colors flex items-center space-x-1 space-x-reverse"
                    >
                      <Play className="w-3 h-3 fill-amber-400" />
                      <span>اجرا در {pid.replace('plat_', '')}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live SMS & OTP Feed */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Inbox className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-200">جریان زنده پیامک و OTP</h3>
            </div>
            <button
              onClick={() => onNavigateTab('webhooks')}
              className="text-xs text-blue-400 hover:underline"
            >
              سندباکس SMS
            </button>
          </div>

          <div className="space-y-2.5">
            {(!smsLogs || smsLogs.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500">
                هنوز پیامکی دریافت نشده است. هنگام اجرای انتشار، پیامک تایید به صورت زنده ظاهر می‌شود.
              </div>
            ) : (
              (smsLogs || []).slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-mono text-[11px] text-slate-300">{log.senderNumber}</span>
                    {log.extractedCode && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">
                        کد OTP: {log.extractedCode}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed">{log.messageText}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
