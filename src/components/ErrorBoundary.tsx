import React from 'react';
import { AlertTriangle, RefreshCw, Download, Terminal, Bug } from 'lucide-react';
import { diagnosticLogger } from '../utils/diagnosticLogger';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
    this.handleReset = this.handleReset.bind(this);
    this.handleDownloadLogs = this.handleDownloadLogs.bind(this);
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ASHK 24 Protected ErrorBoundary]', error, errorInfo);
    
    // Log directly to DiagnosticLogger so user can download JSON even on crash
    diagnosticLogger.log({
      category: 'runtime_crash',
      level: 'error',
      source: this.props.fallbackTitle || 'ErrorBoundary',
      message: error?.message || 'خطای بحرانی در زمان اجرای کامپوننت React',
      stack: error?.stack || null,
      details: {
        componentStack: errorInfo?.componentStack || null
      }
    });

    (this as any).setState({ errorInfo });
  }

  public handleReset(): void {
    (this as any).setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  public handleDownloadLogs(): void {
    diagnosticLogger.downloadLogsAsJson();
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-3xl bg-slate-900 border border-rose-500/40 text-right space-y-4 shadow-2xl my-4" dir="rtl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3 space-x-reverse text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {this.props.fallbackTitle || 'سپر محافظتی اشک ۲۴: مهار خطای رندر'}
                </h3>
                <span className="text-[11px] text-rose-300">جلوگیری هوشمند از پدیده صفحه سیاه (Black Screen Prevention)</span>
              </div>
            </div>

            <button
              onClick={this.handleDownloadLogs}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all flex items-center space-x-1.5 space-x-reverse"
              title="دانلود فایل JSON لاگ‌های عیب‌یابی جهت بررسی یا ارسال به پشتیبانی"
            >
              <Download className="w-4 h-4 ml-1 text-rose-400" />
              <span>دانلود لاگ‌های عیب‌یابی (JSON)</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            خطای رخ‌داده با موفقیت در مخزن لاگ‌های محلی ثبت شد تا از قفل شدن یا سیاه شدن صفحه جلوگیری شود. می‌توانید با کلیک بر دکمه زیر ماژول را مجدداً بارگذاری کنید یا فایل لاگ را برای بررسی دانلود نمایید.
          </p>

          {this.state.error && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 dir-ltr text-left overflow-x-auto">
              <div className="text-slate-500 font-bold mb-1">[Stack Trace]:</div>
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all flex items-center space-x-2 space-x-reverse shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4 text-slate-950 ml-1" />
              <span>تلاش مجدد و بازنشانی ماژول</span>
            </button>

            <button
              onClick={this.handleDownloadLogs}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all flex items-center space-x-1.5 space-x-reverse"
            >
              <Terminal className="w-4 h-4 text-sky-400 ml-1" />
              <span>استخراج بسته تشخیصی JSON</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
