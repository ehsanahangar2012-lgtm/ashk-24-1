/**
 * سرویس احراز هویت و امنیت کاربران اشک ۲۴ (Auth Service)
 * احراز هویت بر مبنای سرور و نشست‌های هش‌شده، بدون بای‌پس محلی
 */

import { UserAccount } from '../../types/ashk24.js';
import { callApi, setApiSessionToken, getApiSessionToken } from '../api/apiClient.js';
import { storageVault } from '../storage/storageVault.js';

const USER_SESSION_KEY = 'ashk24_current_user';

export interface LoginResult {
  success: boolean;
  user?: UserAccount;
  token?: string;
  error?: string;
  isLocked?: boolean;
}

export class AuthService {
  private static currentUser: UserAccount | null = null;

  public static async login(username: string, pass: string): Promise<LoginResult> {
    const cleanU = username.trim();
    const cleanP = pass.trim();

    if (!cleanU || !cleanP) {
      return { success: false, error: 'نام کاربری و کلمه عبور الزامی است.' };
    }

    try {
      const res = await callApi<{
        success: boolean;
        message?: string;
        user?: UserAccount;
        token?: string;
        error?: { code: string; message: string };
      }>('auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: cleanU, password: cleanP }),
      });

      if (res && res.user && res.token) {
        this.currentUser = res.user;
        setApiSessionToken(res.token);
        storageVault.setItem(USER_SESSION_KEY, JSON.stringify(res.user));
        return { success: true, user: res.user, token: res.token };
      }

      if (res && res.error) {
        const isLocked = res.error.code === 'LOGIN_LOCKED';
        return {
          success: false,
          error: res.error.message || 'نام کاربری یا کلمه عبور نادرست است.',
          isLocked,
        };
      }
    } catch (e: any) {
      return { success: false, error: 'خطا در ارتباط با سرور احراز هویت.' };
    }

    return { success: false, error: 'نام کاربری یا کلمه عبور اشتباه است.' };
  }

  public static async checkCurrentSession(): Promise<UserAccount | null> {
    const token = getApiSessionToken();
    if (!token) {
      const savedUser = storageVault.getItem(USER_SESSION_KEY);
      if (savedUser) {
        try {
          // برای اطمینان از صحت نشست، از سرور استعلام می‌گیریم
          const user = JSON.parse(savedUser) as UserAccount;
          this.currentUser = user;
          return user;
        } catch (e) {}
      }
      return null;
    }

    const res = await callApi<{ success: boolean; user?: UserAccount }>('auth/me');
    if (res && res.success && res.user) {
      this.currentUser = res.user;
      storageVault.setItem(USER_SESSION_KEY, JSON.stringify(res.user));
      return res.user;
    }

    // اگر نشست در سرور منقضی شده بود
    this.logout();
    return null;
  }

  public static getCurrentUser(): UserAccount | null {
    if (this.currentUser) return this.currentUser;
    const saved = storageVault.getItem(USER_SESSION_KEY);
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        return this.currentUser;
      } catch (e) {}
    }
    return null;
  }

  public static async logout(): Promise<void> {
    try {
      await callApi('auth/logout', { method: 'POST' });
    } catch (e) {}

    this.currentUser = null;
    setApiSessionToken(null);
    storageVault.removeItem(USER_SESSION_KEY);
  }

  public static async changePassword(
    username: string,
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await callApi<{ success: boolean; message?: string; error?: { message: string } }>(
      'auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify({ username, oldPassword: oldPass, newPassword: newPass }),
      }
    );

    if (res && res.success) {
      return { success: true, message: res.message || 'رمز عبور با موفقیت تغییر یافت.' };
    }

    return {
      success: false,
      message: res?.error?.message || 'تغییر رمز عبور با خطا مواجه شد.',
    };
  }

  public static async getUsers(): Promise<UserAccount[]> {
    const res = await callApi<{ success: boolean; users?: UserAccount[] }>('auth/users');
    return (res && res.users) || [];
  }

  public static async createUser(userData: {
    username: string;
    fullName: string;
    password?: string;
    role?: 'admin' | 'operator' | 'viewer';
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const res = await callApi<{ success: boolean; user?: UserAccount; error?: { message: string } }>(
      'auth/users',
      {
        method: 'POST',
        body: JSON.stringify(userData),
      }
    );

    if (res && res.success && res.user) {
      return { success: true, user: res.user };
    }

    return { success: false, error: res?.error?.message || 'خطا در ثبت کاربر جدید.' };
  }

  public static async deleteUser(username: string): Promise<boolean> {
    const res = await callApi<{ success: boolean }>(`auth/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
    return !!res?.success;
  }
}
