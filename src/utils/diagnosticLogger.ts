/**
 * ASHK 24 Advanced Diagnostic Logger (لاگ‌گیر پیشرفته عیب‌یابی)
 * Version: 4.8.5
 *
 * Persists extension connection errors, WebSocket/pipe drops, uncaught runtime exceptions,
 * and React ErrorBoundary crashes in a local JSON storage buffer to prevent black-screen data loss.
 */

import { APP_VERSION } from '../config/version';
import { getJalaliCurrentTime } from './persianUtils';

export interface DiagnosticLogEntry {
  id: string;
  category: 'extension_error' | 'websocket_error' | 'runtime_crash' | 'network_error' | 'bridge_timeout' | 'system_info';
  level: 'error' | 'warn' | 'info';
  timestampIso: string;
  timestampJalali: string;
  source: string;
  message: string;
  details?: any;
  stack?: string | null;
  userAgent: string;
  url: string;
}

const STORAGE_KEY = 'ashk24_diagnostic_logs';
const MAX_LOGS = 250;

class DiagnosticLoggerService {
  private static instance: DiagnosticLoggerService;
  private logs: DiagnosticLogEntry[] = [];
  private listeners: Set<(logs: DiagnosticLogEntry[]) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
    this.attachGlobalErrorHandlers();
  }

  public static getInstance(): DiagnosticLoggerService {
    if (!DiagnosticLoggerService.instance) {
      DiagnosticLoggerService.instance = new DiagnosticLoggerService();
    }
    return DiagnosticLoggerService.instance;
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(0, MAX_LOGS);
        }
      }
    } catch (e) {
      this.logs = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      // Handle storage quota limit
      if (this.logs.length > 50) {
        this.logs = this.logs.slice(0, 50);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
        } catch (err) {}
      }
    }
  }

  private attachGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    // 1. Uncaught global runtime exceptions
    window.addEventListener('error', (event) => {
      this.log({
        category: 'runtime_crash',
        level: 'error',
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : 'window.onerror',
        message: event.message || 'خطای ناشناخته در زمان اجرای برنامه',
        stack: event.error?.stack || null,
        details: {
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // 2. Unhandled Promise Rejections (e.g. WebSocket or failed fetch)
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      let msg = 'عدم رسیدگی به Promise ناموفق (Unhandled Rejection)';
      let stack: string | null = null;
      let details: any = null;

      if (reason instanceof Error) {
        msg = reason.message;
        stack = reason.stack || null;
      } else if (typeof reason === 'string') {
        msg = reason;
      } else if (reason && typeof reason === 'object') {
        details = reason;
      }

      this.log({
        category: 'network_error',
        level: 'error',
        source: 'window.onunhandledrejection',
        message: msg,
        stack,
        details
      });
    });
  }

  public log(entry: {
    category: 'extension_error' | 'websocket_error' | 'runtime_crash' | 'network_error' | 'bridge_timeout' | 'system_info';
    level?: 'error' | 'warn' | 'info';
    source: string;
    message: string;
    details?: any;
    stack?: string | null;
  }) {
    const newEntry: DiagnosticLogEntry = {
      id: 'diag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      category: entry.category,
      level: entry.level || 'error',
      timestampIso: new Date().toISOString(),
      timestampJalali: getJalaliCurrentTime(),
      source: entry.source,
      message: entry.message,
      details: entry.details || null,
      stack: entry.stack || null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : ''
    };

    this.logs.unshift(newEntry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  public getLogs(): DiagnosticLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  public downloadLogsAsJson() {
    if (typeof window === 'undefined') return;

    const payload = {
      app: 'سامانه اتوماسیون انتشار آگهی اشک ۲۴ (ASHK 24)',
      version: APP_VERSION,
      exportTimestampIso: new Date().toISOString(),
      exportTimestampJalali: getJalaliCurrentTime(),
      totalEntries: this.logs.length,
      systemEnvironment: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        onlineStatus: navigator.onLine ? 'online' : 'offline',
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        cPanelCompatible: true
      },
      logs: this.logs
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ashk24-diagnostic-logs-v${APP_VERSION}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public subscribe(listener: (logs: DiagnosticLogEntry[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const current = this.getLogs();
    this.listeners.forEach((l) => l(current));
  }
}

export const diagnosticLogger = DiagnosticLoggerService.getInstance();
