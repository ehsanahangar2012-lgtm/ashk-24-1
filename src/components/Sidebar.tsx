import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Globe,
  Megaphone,
  Radio,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  Smartphone,
  BookOpen,
  FolderOpen,
  BarChart3,
  Puzzle,
  Workflow,
  Terminal,
  FolderDown,
} from 'lucide-react';

export type TabType =
  | 'ad_crawler'
  | 'company'
  | 'assets_config'
  | 'platforms'
  | 'campaigns'
  | 'jobs'
  | 'health_monitor'
  | 'analytics'
  | 'mobile_companion'
  | 'extension_bridge'
  | 'orchestrator_matrix'
  | 'local_agent'
  | 'build_packages';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeJobsCount: number;
  unreadSmsCount: number;
  reportsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenStepByStepGuide?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeJobsCount,
  unreadSmsCount,
  reportsCount = 4,
  isOpenMobile = false,
  onCloseMobile,
  onOpenStepByStepGuide,
}) => {
  const menuItems = [
    {
      id: 'ad_crawler' as TabType,
      label: '★ پایش و ثبت مستقیم با OTP',
      icon: Sparkles,
      badge: 'موتور جدید v5.5',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30',
    },
    {
      id: 'company' as TabType,
      label: '۱. پروفایل و مدیریت مشتریان',
      icon: Building2,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'assets_config' as TabType,
      label: '۲. دارایی‌ها و کانفیگ مشتری',
      icon: FolderOpen,
      badge: 'Assets',
      badgeColor: 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30',
    },
    {
      id: 'platforms' as TabType,
      label: '۳. کشف و پایش رسانه‌ها',
      icon: Globe,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'campaigns' as TabType,
      label: '۴. مدیریت آگهی‌ها (کمپین)',
      icon: Megaphone,
      badge: 'متن & عکس',
      badgeColor: 'bg-purple-500/20 text-purple-300 font-bold',
    },
    {
      id: 'jobs' as TabType,
      label: '۵. صف انتشار خودکار (Jobs)',
      icon: Radio,
      badge: activeJobsCount > 0 ? `${activeJobsCount} جاب` : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'health_monitor' as TabType,
      label: '۶. پایش سلامت و افت CTR',
      icon: ShieldCheck,
      badge: 'هوشمند',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30',
    },
    {
      id: 'analytics' as TabType,
      label: '۷. داشبورد تحلیلی و بازدهی',
      icon: BarChart3,
      badge: 'Recharts',
      badgeColor: 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30',
    },
    {
      id: 'mobile_companion' as TabType,
      label: '۸. رله خودکار پیامک اشک ۲۴',
      icon: Smartphone,
      badge: 'SMS Relay',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30',
    },
    {
      id: 'extension_bridge' as TabType,
      label: '۹. لوله ارتباطی و ورکر افزونه',
      icon: Puzzle,
      badge: 'Bridge',
      badgeColor: 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30',
    },
    {
      id: 'orchestrator_matrix' as TabType,
      label: '۱۰. ماتریس هماهنگی خودمختار',
      icon: Workflow,
      badge: 'هوشمند',
      badgeColor: 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30',
    },
    {
      id: 'local_agent' as TabType,
      label: '۱۱. ایجنت دسکتاپ محلی (Playwright)',
      icon: Terminal,
      badge: '۱-کلیک',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30',
    },
    {
      id: 'build_packages' as TabType,
      label: '۱۲. مخزن بیلدها و پکیج‌ها (Builds Vault)',
      icon: FolderDown,
      badge: 'پکیج‌ها',
      badgeColor: 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30',
    },
  ];

  const sidebarContent = (
    <div className="w-64 bg-slate-950 border-l border-slate-800 shrink-0 p-4 h-full flex flex-col justify-between overflow-y-auto">
      <div className="space-y-1">
        <div className="flex items-center justify-between px-3 py-2 mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            منوی اصلی
          </span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              title="بستن منو"
            >
              ✕
            </button>
          )}
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5 space-x-reverse">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System info box & Step-by-Step Guide Button */}
      <div className="mt-4 space-y-2">
        {onOpenStepByStepGuide && (
          <button
            onClick={() => {
              onOpenStepByStepGuide();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-300 hover:border-amber-400 text-xs font-bold transition-all text-right flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div>راهنمای ۵ مرحله‌ای</div>
                <div className="text-[10px] text-slate-400 font-normal">از نصب تا انتشار قطعی</div>
              </div>
            </div>
            <span className="text-amber-400 font-bold text-xs">←</span>
          </button>
        )}

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center space-x-1.5 space-x-reverse text-amber-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مدیریت انتشار خودمختار</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            اجرای بدون توقف وظایف ثبت آگهی در پس‌زمینه توسط گیت‌هاب اکشن.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-950 border-l border-slate-800 shrink-0 min-h-[calc(100vh-61px)] flex-col justify-between">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative z-50 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
