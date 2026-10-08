/**
 * کلاینت ارتباطی یکپارچه و امن با بک‌اند سی‌پنل (Ashk24 Secure API Client)
 * بدون هیچ‌گونه سکرت یا توکن هاردکدشده در سمت کلاینت
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

let activeSessionToken: string | null = null;
let activeCpanelApiBase = '/cpanel-backend/api/index.php';

export function setApiSessionToken(token: string | null) {
  activeSessionToken = token;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (token) {
        window.sessionStorage.setItem('ashk24_auth_token', token);
      } else {
        window.sessionStorage.removeItem('ashk24_auth_token');
      }
    }
  } catch (e) {}
}

export function getApiSessionToken(): string | null {
  if (activeSessionToken) return activeSessionToken;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem('ashk24_auth_token');
      if (stored) {
        activeSessionToken = stored;
        return stored;
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('ashk24_auth_token');
      if (stored) {
        activeSessionToken = stored;
        return stored;
      }
    }
  } catch (e) {}
  return null;
}

export async function callApi<T = any>(
  route: string,
  options: RequestInit = {},
  retries: number = 1
): Promise<T | null> {
  const candidateBases = [activeCpanelApiBase, '/cpanel-backend/api/index.php', '/api/index.php'];
  const uniqueBases = Array.from(new Set(candidateBases));
  const token = getApiSessionToken();

  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  for (const base of uniqueBases) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const url = `${base}?route=${encodeURIComponent(route)}`;
        const controller = new AbortController();
        const timeoutMs = options.body instanceof FormData ? 20000 : 8000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
            ...authHeaders,
            ...(options.headers || {}),
          },
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          activeCpanelApiBase = base;
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const parsed = await res.json();
            return parsed as T;
          }
          return (await res.text()) as unknown as T;
        }

        // اگر ۴۰۱ بود توکن منقضی شده
        if (res.status === 401) {
          console.warn(`[Ashk24 API] ۴۰۱ دریافت شد برای مسیر ${route} - نیاز به ورود مجدد.`);
          return null;
        }
      } catch (err) {
        if (attempt === retries) {
          // در آخرین تلاش نیز شکست خورد، برو سراغ بیس بعدی
          break;
        }
      }
    }
  }

  return null;
}
