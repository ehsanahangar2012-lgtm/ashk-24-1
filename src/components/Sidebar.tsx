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
} from 'lucide-react';

export type TabType =
  | 'company'
  | 'platforms'
  | 'campaigns'
  | 'jobs';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeJobsCount: number;
  unreadSmsCount: number;
  reportsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeJobsCount,
  unreadSmsCount,
  reportsCount = 4,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const menuItems = [
    {
      id: 'company' as TabType,
      label: '۱. اطلاعات کسب‌وکار',
      icon: Building2,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'platforms' as TabType,
      label: '۲. کشف رسانه',
      icon: Globe,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'campaigns' as TabType,
      label: '۳. مدیریت آگهی‌ها (کمپین)',
      icon: Megaphone,
      badge: 'متن & عکس',
      badgeColor: 'bg-purple-500/20 text-purple-300 font-bold',
    },
    {
      id: 'jobs' as TabType,
      label: '۴. صف انتشار (Jobs)',
      icon: Radio,
      badge: activeJobsCount > 0 ? `${activeJobsCount} جاب` : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
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

      {/* System info box & Test Button */}
      <div className="mt-4 space-y-2">
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
