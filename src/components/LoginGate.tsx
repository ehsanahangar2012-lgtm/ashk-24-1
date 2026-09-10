import React, { useState, useEffect, useCallback } from 'react';
import { UserAccount } from '../types/ashk24.js';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  HardDrive,
  RotateCcw,
} from 'lucide-react';
import { APP_VERSION_TAG } from '../config/version.js';

interface LoginGateProps {
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount, token: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

type ServerStatusType = 'checking' | 'node_online' | 'cpanel_online' | 'offline_vault';

export function LoginGate({ currentUser, onLoginSuccess, onLogout, children }: LoginGateProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [infoMsg, setInfoMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<ServerStatusType>('checking');
  const [serverLatency, setServerLatency] = useState<number | null>(null);

  // Probe server connectivity
  const probeServer = useCallback(async () => {
    setServerStatus('checking');
    const start = performance.now();

    // Canonical cPanel PHP Backend Probe
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/cpanel-backend/api/index.php?route=health', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.status === 'ok') {
          setServerLatency(Math.round(performance.now() - start));
          setServerStatus('cpanel_online');
          return;
        }
      }
    } catch (e) {
      // cPanel server unreachable
    }

    // Fallback to local vault
    setServerLatency(null);
    setServerStatus('offline_vault');
  }, []);

  useEffect(() => {
    probeServer();
  }, [probeServer]);

  // Helper to get locally stored users
  const getLocalStoredUsers = (): any[] => {
    try {
      return JSON.parse(localStorage.getItem('ashk24_local_users') || '[]');
    } catch (e) {
      return [];
    }
  };

  const executeLogin = async (uname: string, pass: string) => {
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    const cleanU = uname.trim().toLowerCase();
    const cleanP = pass.trim();

    if (!cleanU || !cleanP) {
      setErrorMsg('لطفاً نام کاربری و رمز عبور را وارد نمایید.');
      setLoading(false);
      return;
    }

    try {
      let authenticatedUser: UserAccount | null = null;
      let authToken: string | null = null;

      // Tier 1: Try Server Login (Node.js API or cPanel PHP Router)
      let serverAuthFailed = false;
      let serverAuthError = '';

      if (serverStatus !== 'offline_vault') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const res = await fetch('/cpanel-backend/api/index.php?route=auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanU, password: cleanP }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
              authenticatedUser = data.user;
              authToken = data.token || `token_ashk24_srv_${Date.now()}`;
            }
          } else if (res.status === 401) {
            const errData = await res.json().catch(() => null);
            serverAuthFailed = true;
            serverAuthError = errData?.error || 'نام کاربری یا کلمه عبور اشتباه است.';
          }
        } catch (e) {
          // Endpoint timed out or network error
        }
      }

      if (serverAuthFailed) {
        setErrorMsg(serverAuthError || 'نام کاربری یا کلمه عبور در احراز هویت سرور اشتباه است.');
        setLoading(false);
        return;
      }

      // Tier 2: Check Local Browser Vault (localStorage) ONLY in offline mode
      if (!authenticatedUser && serverStatus === 'offline_vault') {
        const localUsers = getLocalStoredUsers();
        const matchedLocal = localUsers.find(
          (u) => u.username?.toLowerCase() === cleanU && u.password === cleanP
        );

        if (matchedLocal) {
          authenticatedUser = {
            id: matchedLocal.id || `usr_local_${Date.now()}`,
            username: matchedLocal.username,
            fullName: matchedLocal.fullName || matchedLocal.username,
            role: matchedLocal.role || 'operator',
            createdAt: matchedLocal.createdAt || new Date().toISOString(),
            isActive: true,
          };
          authToken = `token_ashk24_vault_${Date.now()}_${cleanU}`;
        }
      }

      if (authenticatedUser && authToken) {
        if (rememberMe) {
          localStorage.setItem('ashk24_remember_user', JSON.stringify({ username: cleanU }));
        }
        onLoginSuccess(authenticatedUser, authToken);
        setLoading(false);
        return;
      } else {
        setErrorMsg('نام کاربری یا رمز عبور نامعتبر است. برای ورود سریع می‌توانید از دکمه‌های ورود سریع زیر استفاده کنید.');
      }
    } catch (err: any) {
      setErrorMsg('خطایی در فرآیند احراز هویت رخ داد. لطفاً مجدداً تلاش نمایید.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(username, password);
  };

  const handleQuickLogin = (uname: string, pass: string) => {
    setUsername(uname);
    setPassword(pass);
    executeLogin(uname, pass);
  };

  const handleResetDefaultPasswords = async () => {
    setResetting(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      // 1. Reset on cPanel server
      await fetch('/cpanel-backend/api/index.php?route=auth/reset-passwords', { method: 'POST' }).catch(() => {});

      // 3. Reset in local storage
      const defaultLocal = [
        {
          id: 'usr_admin',
          username: 'admin',
          fullName: 'مدیر ارشد سیستم',
          role: 'admin',
          password: 'ashk24',
          createdAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 'usr_operator',
          username: 'operator',
          fullName: 'اپراتور اتوماسیون',
          role: 'operator',
          password: 'ashk24',
          createdAt: new Date().toISOString(),
          isActive: true,
        },
      ];
      localStorage.setItem('ashk24_local_users', JSON.stringify(defaultLocal));

      setInfoMsg('کلمات عبور پیش‌فرض (admin و operator) با موفقیت به ashk24 بازنشانی شد.');
      setUsername('admin');
      setPassword('ashk24');
    } catch (e) {
      setErrorMsg('خطا در بازنشانی کلمات عبور.');
    } finally {
      setResetting(false);
    }
  };

  // If user is already authenticated, render app
  if (currentUser) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans dir-rtl">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 text-slate-950 font-black text-2xl">
            ۲۴
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center space-x-2 space-x-reverse">
              <h1 className="text-xl sm:text-2xl font-black text-white">سامانه اشک ۲۴</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {APP_VERSION_TAG}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              اتوماسیون بازاریابی، تولید محتوا، کشف رسانه و انتشار آگهی
            </p>
          </div>

          {/* Live Server Status Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px]">
            <div className="flex items-center space-x-2 space-x-reverse min-w-0">
              {serverStatus === 'checking' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                  <span className="text-slate-400 truncate">در حال بررسی اتصال سرور...</span>
                </>
              )}
              {(serverStatus === 'cpanel_online' || (serverStatus as string) === 'node_online') && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-emerald-400 font-bold truncate">بک‌اند پایگاه داده cPanel (PHP 8) فعال</span>
                  {serverLatency && <span className="text-slate-500 text-[10px] font-mono">({serverLatency}ms)</span>}
                </>
              )}
              {serverStatus === 'offline_vault' && (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-300 font-medium truncate">گاوصندوق آفلاین مرورگر فعال</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={probeServer}
              title="تست مجدد اتصال به سرور"
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 space-x-reverse">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 space-x-reverse">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">نام کاربری</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثلاً: admin یا operator"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-xs text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">رمز عبور ورود</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="کلمه عبور خود را وارد کنید..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-10 pl-10 text-xs text-slate-100 focus:outline-none focus:border-amber-500 transition-colors font-mono"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-slate-300 absolute left-3.5 top-3.5 transition-colors"
                title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-2 space-x-reverse cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
              />
              <span>مرا به خاطر بسپار</span>
            </label>

            <button
              type="button"
              disabled={resetting}
              onClick={handleResetDefaultPasswords}
              className="text-amber-400/80 hover:text-amber-300 text-[11px] underline flex items-center space-x-1 space-x-reverse cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3 ml-1" />
              <span>{resetting ? 'در حال بازنشانی...' : 'بازیابی رمزهای پیش‌فرض'}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center space-x-2 space-x-reverse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال تایید اعتبار و ورود...</span>
              </div>
            ) : (
              <>
                <KeyRound className="w-4 h-4 ml-1" />
                <span>ورود به سامانه اشک ۲۴</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Access Credentials Buttons */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">ورود سریع با حساب‌های پیش‌فرض:</span>
            <span className="text-slate-500 font-mono text-[10px]">رمز: ashk24</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'ashk24')}
              className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border border-slate-700/50 text-xs transition-colors font-semibold flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 ml-1 shrink-0" />
              <span className="truncate">مدیر کل (admin)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('operator', 'ashk24')}
              className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 border border-slate-700/50 text-xs transition-colors font-semibold flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
              <span className="truncate">اپراتور (operator)</span>
            </button>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-500 pt-1">
          سازگار با زیرساخت‌های سرور ایرانی و سیستم‌های هاستینگ cPanel • بدون تداخل با فیلترینگ
        </div>
      </div>
    </div>
  );
}

export { UserSecurityModal } from './UserSecurityModal.js';
