import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Download,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  X,
  Filter,
  ShieldCheck,
  RefreshCw,
  Bug,
  Radio,
  Puzzle,
  Globe
} from 'lucide-react';
import { diagnosticLogger, DiagnosticLogEntry } from '../utils/diagnosticLogger';
import { APP_VERSION } from '../config/version';
import { toPersianDigits } from '../utils/persianUtils';
import { SmartHelpButton } from './SmartHelpModal';

interface DiagnosticLoggerModalProps {
  onClose: () => void;
}

export const DiagnosticLoggerModal: React.FC<DiagnosticLoggerModalProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(diagnosticLogger.getLogs());
  const [filter, setFilter] = useState<'all' | 'extension_error' | 'websocket_error' | 'runtime_crash' | 'network_error'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = diagnosticLogger.subscribe((updated) => {
      setLogs(updated);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (filter === 'all') return true;
    return l.category === filter;
  });

  const handleCopyEntry = (log: DiagnosticLogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm('آیا از پاکسازی تمام لاگ‌های تشخیصی ذخیره‌شده در مرورگر اطمینان دارید؟')) {
      diagnosticLogger.clearLogs();
    }
  };

  const handleDownload = () => {
    diagnosticLogger.downloadLogsAsJson();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <h3 className="text-base font-bold text-slate-100">
                  مرکز لاگ‌گیری و عیب‌یابی پیشرفته اشک ۲۴ (Diagnostic Logger)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ثبت خودکار کلیه خطاهای اتصال افزونه، وب‌سوکت، لوله‌های داده و مهار خطای صفحه سیاه
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <SmartHelpButton
              content={{
                title: 'مرکز لاگ‌گیر پیشرفته اشک ۲۴',
                summary: 'این ابزار تمام خطاهای اتصال به افزونه، رله‌های داده و مشکلات زمان اجرای جاوااسکریپت را به شکل محلی ذخیره می‌کند.',
                steps: [
                  'در صورت بروز هرگونه مشکل یا قطعی افزونه، فایل JSON را با دکمه «دانلود خروجی JSON» استخراج کنید.',
                  'داده‌ها در حافظه محلی ذخیره می‌شوند و حتی در صورت بارگذاری مجدد صفحه حفظ خواهند شد.',
                  'می‌توانید لاگ‌ها را بر اساس دسته (افزونه، وب‌سوکت، خطاها) فیلتر کنید.'
                ],
                offlineNote: 'تمام فرآیند ثبت و استخراج لاگ‌ها ۱۰۰٪ آفلاین و بدون ارسال به سرورهای خارجی انجام می‌شود.'
              }}
            />

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              همه لاگ‌ها ({toPersianDigits(logs.length)})
            </button>
            <button
              onClick={() => setFilter('extension_error')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 space-x-reverse ${
                filter === 'extension_error'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Puzzle className="w-3.5 h-3.5 ml-1" />
              <span>خطاهای افزونه</span>
            </button>
            <button
              onClick={() => setFilter('websocket_error')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 space-x-reverse ${
                filter === 'websocket_error'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 ml-1" />
              <span>خطاهای وب‌سوکت / لوله</span>
            </button>
            <button
              onClick={() => setFilter('runtime_crash')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 space-x-reverse ${
                filter === 'runtime_crash'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Bug className="w-3.5 h-3.5 ml-1" />
              <span>مهار کرش / رندر</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 space-x-reverse"
            >
              <Download className="w-4 h-4 ml-1" />
              <span>دانلود خروجی JSON</span>
            </button>
            <button
              onClick={handleCopyAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition-all flex items-center space-x-1 space-x-reverse"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400 ml-1" /> : <Copy className="w-3.5 h-3.5 ml-1" />}
              <span>{copiedAll ? 'کپی شد' : 'کپی همه'}</span>
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
              title="پاکسازی لاگ‌ها"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Log Viewer Container */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-950 font-mono text-xs space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500/50 mx-auto" />
              <div className="text-sm text-slate-400 font-bold">هیچ خطایی در این دسته ثبت نشده است.</div>
              <div className="text-xs text-slate-600">سامانه و لوله‌های ارتباطی با پایداری کامل در حال اجرا هستند.</div>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        log.category === 'extension_error'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : log.category === 'websocket_error'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : log.category === 'runtime_crash'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      }`}
                    >
                      {log.category}
                    </span>
                    <span className="text-slate-400 font-sans text-xs">منبع: {log.source}</span>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-[10px] text-slate-500">{log.timestampJalali}</span>
                    <button
                      onClick={() => handleCopyEntry(log)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      title="کپی لاگ"
                    >
                      {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-slate-200 leading-relaxed font-sans text-xs break-words">
                  {log.message}
                </div>

                {log.stack && (
                  <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-rose-300/90 overflow-x-auto dir-ltr text-left">
                    {log.stack}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div>
            تعداد رکوردهای ثبت‌شده در مرورگر: <span className="font-bold text-slate-200 font-mono">{toPersianDigits(logs.length)}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
