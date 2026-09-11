import React, { useState, useRef, useEffect } from 'react';
import { APP_VERSION_TAG } from '../config/version.js';
import {
  ShieldCheck,
  Cpu,
  RefreshCw,
  Building2,
  User,
  LogOut,
  Server,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { ResilienceStatus, CompanyProfile, UserAccount } from '../types/ashk24.js';

interface NavbarProps {
  resilience: ResilienceStatus | null;
  company: CompanyProfile | null;
  currentUser: UserAccount | null;
  onOpenCompanyModal: () => void;
  onOpenMediaVault?: () => void;
  onOpenCpanelGuide?: () => void;
  onOpenSecurityModal: () => void;
  onLogout: () => void;
  onRefreshData: () => void;
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  company,
  currentUser,
  onOpenCompanyModal,
  onOpenMediaVault,
  onOpenCpanelGuide,
  onOpenSecurityModal,
  onLogout,
  onRefreshData,
  onMenuToggle,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 lg:sticky lg:top-0 z-30 px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse min-w-0 shrink-0">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-850 shrink-0 transition-colors"
              title="منوی اصلی"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-sm sm:text-xl shrink-0">
            ۲۴
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse">
              <h1 className="text-xs sm:text-base font-bold text-slate-100 tracking-tight truncate">
                سامانه اشک ۲۴
              </h1>
              <span className="inline-block text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 font-mono">
                {APP_VERSION_TAG}
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400">
              اتوماسیون بازاریابی، تولید محتوا و انتشار خودکار آگهی (پلتفرم cPanel PHP)
            </p>
          </div>
        </div>

        {/* Desktop Controls (lg and up) */}
        <div className="hidden lg:flex items-center space-x-2 space-x-reverse shrink-0">
          {/* Active Backend Indicator */}
          <div className="flex items-center space-x-2 space-x-reverse px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <Server className="w-4 h-4 ml-1 shrink-0" />
            <span className="hidden xl:inline">
              بک‌اند cPanel PHP 8.x + MySQL
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefreshData}
            title="بروزرسانی اطلاعات"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Company Profile Button */}
          <button
            onClick={onOpenCompanyModal}
            className="flex items-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-colors shrink-0"
          >
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate max-w-[120px]">
              {company?.companyName || 'پروفایل شرکت'}
            </span>
          </button>

          {/* Security & Accounts Button */}
          <button
            onClick={onOpenSecurityModal}
            className="flex items-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-colors shrink-0"
            title="مدیریت حساب‌های کاربری و امنیت"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[100px]">
              {currentUser?.fullName || currentUser?.username || 'مدیریت کاربران'}
            </span>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="خروج از حساب کاربری"
            className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile & Tablet Dropdown Menu Controls (< lg) */}
        <div className="flex lg:hidden items-center space-x-2 space-x-reverse shrink-0 relative" ref={menuRef}>
          <button
            onClick={onRefreshData}
            title="بروزرسانی"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex items-center space-x-1 space-x-reverse p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold shrink-0"
          >
            <User className="w-4 h-4 text-amber-400" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {mobileMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1 text-xs">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCompanyModal();
                }}
                className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 flex items-center space-x-2 space-x-reverse"
              >
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{company?.companyName || 'پروفایل شرکت'}</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSecurityModal();
                }}
                className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 flex items-center space-x-2 space-x-reverse"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>مدیریت کاربران و کلمه عبور</span>
              </button>

              <div className="border-t border-slate-800 my-1" />

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-rose-500/20 text-rose-400 flex items-center space-x-2 space-x-reverse"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>خروج از سامانه</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
