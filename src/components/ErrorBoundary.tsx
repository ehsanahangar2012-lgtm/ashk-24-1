import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  public handleReset(): void {
    (this as any).setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-3xl bg-slate-900 border border-rose-500/30 text-right space-y-4 shadow-2xl my-4" dir="rtl">
          <div className="flex items-center space-x-3 space-x-reverse text-rose-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="text-sm font-bold text-white">
              {this.props.fallbackTitle || 'خطا در بارگذاری این بخش از سامانه'}
            </h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            متأسفانه هنگام رندر این ماژول خطایی رخ داده است. خطای رخ داده توسط سیستم محافظ متوقف گردید تا از سیاهی صفحه جلوگیری شود.
          </p>

          {this.state.error && (
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 dir-ltr text-left overflow-x-auto">
              {this.state.error.toString()}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all flex items-center space-x-2 space-x-reverse shadow-lg shadow-amber-500/20"
          >
            <RefreshCw className="w-4 h-4 text-slate-950" />
            <span>تلاش مجدد و بارگذاری ماژول</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
