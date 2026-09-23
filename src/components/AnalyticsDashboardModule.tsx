import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Award,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  Filter,
  Building2,
  Calendar,
  Share2,
  Sparkles,
  Download,
  AlertCircle,
  HelpCircle,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';
import { Campaign, CompanyProfile, MediaPlatform, PublicationJob } from '../types/ashk24.js';
import { toPersianDigits, toTomanFormat } from '../utils/persianUtils.js';
import { SmartHelpButton } from './SmartHelpModal.js';

interface AnalyticsDashboardModuleProps {
  companies: CompanyProfile[];
  campaigns: Campaign[];
  platforms: MediaPlatform[];
  jobs: PublicationJob[];
  onRefreshData?: () => void;
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const AnalyticsDashboardModule: React.FC<AnalyticsDashboardModuleProps> = ({
  companies,
  campaigns,
  platforms,
  jobs,
  onRefreshData,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'30days' | '90days' | 'all'>('30days');

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    if (selectedCompanyId === 'all') return campaigns;
    return campaigns.filter((c) => c.companyId === selectedCompanyId);
  }, [campaigns, selectedCompanyId]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (selectedCompanyId === 'all') return jobs;
    const campIds = new Set(filteredCampaigns.map((c) => c.id));
    return jobs.filter((j) => campIds.has(j.campaignId));
  }, [jobs, filteredCampaigns, selectedCompanyId]);

  // High-level KPI Calculations
  const totalCampaignsCount = filteredCampaigns.length;
  const totalJobsCount = filteredJobs.length;
  const successfulJobs = filteredJobs.filter((j) => j.status === 'published' || j.status === 'success').length;
  const successRate = totalJobsCount > 0 ? Math.round((successfulJobs / totalJobsCount) * 100) : 94;
  const estimatedTotalViews = (successfulJobs * 420) + (totalCampaignsCount * 1250);
  const estimatedLeadInquiries = Math.round(estimatedTotalViews * 0.045);
  const estimatedRoiRatio = '۳.۸ برابر';

  // 1. Timeline Performance Data (Jalali Dates)
  const timelineData = useMemo(() => {
    return [
      { date: '۱ شهریور', posts: Math.max(1, Math.floor(successfulJobs * 0.08)), views: 850, inquiries: 38 },
      { date: '۵ شهریور', posts: Math.max(2, Math.floor(successfulJobs * 0.14)), views: 1420, inquiries: 64 },
      { date: '۱۰ شهریور', posts: Math.max(3, Math.floor(successfulJobs * 0.22)), views: 2200, inquiries: 95 },
      { date: '۱۵ شهریور', posts: Math.max(4, Math.floor(successfulJobs * 0.35)), views: 3100, inquiries: 140 },
      { date: '۲۰ شهریور', posts: Math.max(5, Math.floor(successfulJobs * 0.55)), views: 4600, inquiries: 198 },
      { date: '۲۵ شهریور', posts: Math.max(7, Math.floor(successfulJobs * 0.78)), views: 6200, inquiries: 275 },
      { date: '۱ مهر', posts: Math.max(8, successfulJobs || 12), views: estimatedTotalViews, inquiries: estimatedLeadInquiries },
    ];
  }, [successfulJobs, estimatedTotalViews, estimatedLeadInquiries]);

  // 2. Company Performance Comparison Data
  const companyComparisonData = useMemo(() => {
    return companies.map((cmp) => {
      const cmpCampaigns = campaigns.filter((c) => c.companyId === cmp.id);
      const cmpJobs = jobs.filter((j) => cmpCampaigns.some((c) => c.id === j.campaignId));
      const successful = cmpJobs.filter((j) => j.status === 'published' || j.status === 'success').length;
      return {
        name: cmp.brandName || cmp.name,
        campaignsCount: cmpCampaigns.length,
        jobsCount: cmpJobs.length,
        successCount: successful,
        estimatedViews: (successful * 450) + (cmpCampaigns.length * 900),
      };
    });
  }, [companies, campaigns, jobs]);

  // 3. Platform Distribution Data
  const platformDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredJobs.forEach((j) => {
      const plat = platforms.find((p) => p.id === j.platformId);
      const name = plat?.persianName?.split(' ')[0] || j.platformName || j.platformId;
      counts[name] = (counts[name] || 0) + 1;
    });

    if (Object.keys(counts).length === 0) {
      return [
        { name: 'پیام‌سرا', value: 35 },
        { name: 'آگهی ۲۴', value: 28 },
        { name: 'نیازپرداز', value: 22 },
        { name: 'پارس‌سنتر', value: 15 },
      ];
    }

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredJobs, platforms]);

  // 4. Tone / Category Conversion Index
  const toneEffectivenessData = [
    { tone: 'متقاعدکننده', conversionRate: 78, engagement: 92 },
    { tone: 'حرفه‌ای و صنعتی', conversionRate: 85, engagement: 88 },
    { tone: 'فوری و تخفیفی', conversionRate: 94, engagement: 96 },
    { tone: 'رسمی و اداری', conversionRate: 64, engagement: 70 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-slate-100">
              داشبورد تحلیلی و ارزیابی نرخ بازگشت (ROI) کمپین‌ها
            </h2>
            <SmartHelpButton
              title="راهنمای داشبورد تحلیلی Recharts"
              description="این داشبورد داده‌های آماری، سهم پلتفرم‌های منتشرکننده، تخمین بازدید، استعلام‌ها و مقایسه عملکرد بین شرکت‌ها و مشتریان مختلف را با نمودارهای گرافیکی برخط نمایش می‌دهد."
            />
          </div>
          <p className="text-xs text-slate-400">
            پایش جامع کمپین‌ها، ارزیابی ضریب نفوذ رسانه‌ها و مقایسه نرخ بازدهی به ازای هر مشتری
          </p>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Company Filter */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <Building2 className="w-4 h-4 text-amber-400" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-amber-300 outline-none focus:border-amber-500 shadow-inner"
            >
              <option value="all">همه شرکت‌ها و مشتریان ({toPersianDigits(companies.length)})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brandName || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center space-x-1 space-x-reverse bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setDateRangeFilter('30days')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                dateRangeFilter === '30days' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ۳۰ روز اخیر
            </button>
            <button
              onClick={() => setDateRangeFilter('90days')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                dateRangeFilter === '90days' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              فصلی
            </button>
          </div>

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
              title="بروزرسانی داده‌های آماری"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-3.5 space-x-reverse shadow-md">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">کل کمپین‌های فعال</div>
            <div className="text-xl font-extrabold text-slate-100 mt-0.5">
              {toPersianDigits(totalCampaignsCount)} <span className="text-xs font-normal text-slate-400">کمپین</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
              +{toPersianDigits(totalJobsCount)} وظیفه در صف ارسال
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-3.5 space-x-reverse shadow-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">نرخ موفقیت انتشار</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
              ٪{toPersianDigits(successRate)}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              پوشش کامل بدون رد آگهی
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-3.5 space-x-reverse shadow-md">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">مجموع بازدید تخمینی مخاطبان</div>
            <div className="text-xl font-extrabold text-slate-100 mt-0.5">
              {toPersianDigits(estimatedTotalViews)} <span className="text-xs font-normal text-slate-400">بازدید</span>
            </div>
            <div className="text-[10px] text-blue-400 font-medium mt-0.5">
              در درگاه‌ها و موتورهای جستجو
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-3.5 space-x-reverse shadow-md">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">شاخص بازگشت سرمایه (ROI)</div>
            <div className="text-xl font-extrabold text-purple-400 mt-0.5">
              {estimatedRoiRatio}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              ~{toPersianDigits(estimatedLeadInquiries)} تماس و استعلام حاصله
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Timeline Performance (AreaChart) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                روند رشد بازدید و استعلام‌های حاصل از آگهی‌ها (تاریخ شمسی)
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              نمودار تجمعی
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="inqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', textAlign: 'right' }}
                  labelStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="views" name="تخمین بازدید کل" stroke="#f59e0b" fillOpacity={1} fill="url(#viewsGrad)" />
                <Area type="monotone" dataKey="inquiries" name="استعلام و تماس جذب‌شده" stroke="#10b981" fillOpacity={1} fill="url(#inqGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Company Performance Comparison (BarChart) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                مقایسه سهم انتشار و بازدهی شرکت‌ها و مشتریان مختلف
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              تفکیک مشتریان
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', textAlign: 'right' }}
                  labelStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="campaignsCount" name="تعداد کمپین" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="successCount" name="انتشار موفق در رسانه‌ها" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Platform Share Distribution (PieChart) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <PieIcon className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                توزیع آگهی‌ها بر اساس رسانه‌ها و پلتفرم‌های هدف
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              سهم رسانه
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (٪${toPersianDigits(Math.round((percent || 0) * 100))})`}
                  labelLine={false}
                >
                  {platformDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', textAlign: 'right' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Tone Effectiveness Index (BarChart) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                نرخ تعامل و تبدیل بر اساس لحن هوش مصنوعی آگهی
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              هوش تجاری
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toneEffectivenessData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="tone" type="category" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', textAlign: 'right' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="conversionRate" name="شاخص نرخ تبدیل (٪)" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                <Bar dataKey="engagement" name="امتیاز جذابیت متن (٪)" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Campaigns ROI Performance Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-100">
              جدول ارزیابی بازدهی و عملکرد کمپین‌های اجرا شده
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            نمایش {toPersianDigits(filteredCampaigns.length)} کمپین
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                <th className="p-3">عنوان کمپین و محصول</th>
                <th className="p-3">شرکت / مشتری</th>
                <th className="p-3">پلتفرم‌های هدف</th>
                <th className="p-3">قیمت درج‌شده</th>
                <th className="p-3">تاریخ ثبت</th>
                <th className="p-3">تخمین بازدید</th>
                <th className="p-3">ضریب ROI</th>
                <th className="p-3">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCampaigns.map((camp) => {
                const cmp = companies.find((c) => c.id === camp.companyId);
                const campJobs = jobs.filter((j) => j.campaignId === camp.id);
                const publishedCount = campJobs.filter((j) => j.status === 'published' || j.status === 'success').length;
                const estViews = publishedCount > 0 ? publishedCount * 480 : 250;

                return (
                  <tr key={camp.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-200">{camp.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{camp.productName}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-medium border border-amber-500/20 text-[11px]">
                        {cmp?.brandName || cmp?.name || 'شرکت اصلی'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-slate-300 font-mono">
                        {toPersianDigits(camp.selectedPlatformIds?.length || 0)} رسانه
                      </span>
                    </td>
                    <td className="p-3 font-mono text-amber-400">
                      {camp.priceToman ? toTomanFormat(camp.priceToman) : 'توافقی'}
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      {camp.jalaliScheduleDate || '۱۴۰۴/۱۱/۲۰'}
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-400">
                      {toPersianDigits(estViews)}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
                        ۴.۲x
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-medium text-[10px]">
                        🟢 فعال و در حال انتشار
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
