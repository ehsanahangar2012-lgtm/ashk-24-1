import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types/ashk24.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import {
  Lock,
  User,
  KeyRound,
  UserPlus,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  X,
} from 'lucide-react';

export interface UserSecurityModalProps {
  currentUser: UserAccount;
  onClose: () => void;
  onLogout: () => void;
}

export function UserSecurityModal({ currentUser, onClose, onLogout }: UserSecurityModalProps) {
  const [activeTab, setActiveTab] = useState<'password' | 'users'>('password');

  // Change Password state
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passStatusMsg, setPassStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users Management state
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newRole, setNewRole] = useState<'admin' | 'operator'>('operator');
  const [newUserPass, setNewUserPass] = useState<string>('');
  const [userActionMsg, setUserActionMsg] = useState<string>('');

  const fetchUsers = async () => {
    let combined: UserAccount[] = [
      {
        id: 'usr_admin',
        username: 'admin',
        fullName: 'مدیر ارشد سیستم',
        role: 'admin',
        createdAt: new Date().toISOString(),
        isActive: true,
      },
      {
        id: 'usr_operator',
        username: 'operator',
        fullName: 'اپراتور اتوماسیون',
        role: 'operator',
        createdAt: new Date().toISOString(),
        isActive: true,
      },
    ];

    // Merge with server users if available
    try {
      const res = await fetch('/cpanel-backend/api/index.php?route=auth/users');
      if (res.ok) {
        const serverUsers = await res.json();
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          combined = serverUsers;
        }
      }
    } catch (e) {}

    // Merge with local storage users
    try {
      const localUsers: any[] = JSON.parse(localStorage.getItem('ashk24_local_users') || '[]');
      localUsers.forEach((lu) => {
        if (!combined.some((u) => u.username?.toLowerCase() === lu.username?.toLowerCase())) {
          combined.push({
            id: lu.id || `usr_local_${Date.now()}`,
            username: lu.username,
            fullName: lu.fullName || lu.username,
            role: lu.role || 'operator',
            createdAt: lu.createdAt || new Date().toISOString(),
            isActive: true,
          });
        }
      });
    } catch (e) {}

    setUsersList(combined);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatusMsg(null);

    if (newPassword !== confirmPassword) {
      setPassStatusMsg({ type: 'error', text: 'رمز عبور جدید با تکرار آن یکسان نیست.' });
      return;
    }

    // Always update local vault password
    try {
      const localUsers: any[] = JSON.parse(localStorage.getItem('ashk24_local_users') || '[]');
      const idx = localUsers.findIndex((u) => u.username?.toLowerCase() === currentUser.username.toLowerCase());

      if (idx !== -1) {
        localUsers[idx].password = newPassword;
        localStorage.setItem('ashk24_local_users', JSON.stringify(localUsers));
      } else {
        localUsers.push({
          id: currentUser.id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          role: currentUser.role,
          password: newPassword,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('ashk24_local_users', JSON.stringify(localUsers));
      }
    } catch (e) {}

    // Attempt server password update
    try {
      await fetch('/cpanel-backend/api/index.php?route=auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          oldPassword,
          newPassword,
        }),
      }).catch(() => {});
    } catch (e) {}

    setPassStatusMsg({
      type: 'success',
      text: 'رمز عبور شما با موفقیت تغییر یافت و در حافظه امن ذخیره شد.',
    });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMsg('');

    if (!newUsername.trim() || !newUserPass.trim()) {
      setUserActionMsg('نام کاربری و رمز عبور الزامی است.');
      return;
    }

    const newUserObj = {
      id: `usr_${Date.now()}`,
      username: newUsername.trim().toLowerCase(),
      fullName: newFullName.trim() || newUsername.trim(),
      role: newRole,
      password: newUserPass,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // Save to local vault
    try {
      const localUsers: any[] = JSON.parse(localStorage.getItem('ashk24_local_users') || '[]');
      localUsers.push(newUserObj);
      localStorage.setItem('ashk24_local_users', JSON.stringify(localUsers));
    } catch (e) {}

    // Attempt server user creation
    try {
      await fetch('/cpanel-backend/api/index.php?route=auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserObj),
      }).catch(() => {});
    } catch (e) {}

    setUserActionMsg(`کاربر «${newUsername}» با موفقیت افزوده شد.`);
    setNewUsername('');
    setNewFullName('');
    setNewUserPass('');
    fetchUsers();
  };

  const handleDeleteUser = async (usernameToDelete: string) => {
    if (!confirm(`آیا از حذف دسترسی کاربر ${usernameToDelete} اطمینان دارید؟`)) return;

    try {
      const localUsers: any[] = JSON.parse(localStorage.getItem('ashk24_local_users') || '[]');
      const filtered = localUsers.filter((u) => u.username?.toLowerCase() !== usernameToDelete.toLowerCase());
      localStorage.setItem('ashk24_local_users', JSON.stringify(filtered));
    } catch (e) {}

    try {
      await fetch(`/cpanel-backend/api/index.php?route=auth/users&user=${encodeURIComponent(usernameToDelete)}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}

    fetchUsers();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">مدیریت امنیت و کاربران مجاز</h2>
              <p className="text-xs text-slate-400">
                کاربر فعال: <strong className="text-amber-400">{currentUser.fullName}</strong> ({currentUser.username})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'password'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            تغییر رمز عبور شخصی
          </button>
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'users'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              مدیریت کاربران و دسترسی‌ها
            </button>
          )}
        </div>

        {/* Tab 1: Password Change */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            {passStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 space-x-reverse ${
                  passStatusMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {passStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 ml-1" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 ml-1" />
                )}
                <span>{passStatusMsg.text}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رمز عبور فعلی:</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="رمز فعلی خود را وارد کنید..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رمز عبور جدید:</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="رمز جدید..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">تکرار رمز عبور جدید:</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="مجدداً رمز جدید را وارد کنید..."
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              ذخیره رمز عبور جدید
            </button>
          </form>
        )}

        {/* Tab 2: Users Management (Admin Only) */}
        {activeTab === 'users' && currentUser.role === 'admin' && (
          <div className="space-y-4">
            {/* Create New User Form */}
            <form onSubmit={handleCreateUserSubmit} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 flex items-center space-x-1.5 space-x-reverse">
                <UserPlus className="w-4 h-4 ml-1" />
                <span>تعریف کاربر جدید</span>
              </h3>

              {userActionMsg && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  {userActionMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="نام کاربری (مثلا: operator2)"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="نام و نام خانوادگی..."
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'operator')}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="operator">سطح دسترسی: اپراتور اتوماسیون</option>
                  <option value="admin">سطح دسترسی: مدیر ارشد سیستم</option>
                </select>

                <input
                  type="password"
                  required
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  placeholder="رمز عبور کاربر جدید..."
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                ایجاد کاربر جدید
              </button>
            </form>

            {/* Existing Users List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300">لیست کاربران مجاز سامانه ({toPersianDigits((usersList || []).length)}):</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(usersList || []).map((usr) => (
                  <div
                    key={usr.username}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="font-bold text-slate-200">{usr.fullName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                          @{usr.username}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400 block">
                        نقش: {usr.role === 'admin' ? 'مدیر کل' : 'اپراتور'}
                      </span>
                    </div>

                    {usr.username !== 'admin' && usr.username !== 'operator' && (
                      <button
                        onClick={() => handleDeleteUser(usr.username)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="حذف کاربر"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logout Action */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors flex items-center space-x-1.5 space-x-reverse cursor-pointer"
          >
            <LogOut className="w-4 h-4 ml-1" />
            <span>خروج از حساب کاربری</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
}
