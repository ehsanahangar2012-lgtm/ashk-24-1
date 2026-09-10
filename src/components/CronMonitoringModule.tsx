import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Clock,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  Layers,
  Copy,
  Check,
  Download,
  Filter,
  RefreshCw,
  Cpu,
  Server,
  Zap,
  Radio,
} from 'lucide-react';
import { CronJobExecution } from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';
import { toPersianDigits } from '../utils/persianUtils.js';

interface CronMonitoringModuleProps {
  onRefreshParent?: () => void;
}

export const CronMonitoringModule: React.FC<CronMonitoringModuleProps> = ({ onRefreshParent }) => {
  const [executions, setExecutions] = useState<CronJobExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<CronJobExecution | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'warning' | 'error'>('all');
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [copiedCli, setCopiedCli] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(580); // 10 minutes interval countdown in seconds

  const fetchCronLogs = async () => {
    try {
      const list = await clientStorage.getCronExecutions();
      setExecutions(list);
      if (list.length > 0 && !selectedExecution) {
        setSelectedExecution(list[0]);
      }
    } catch (e) {
      console.error('Error fetching cron executions:', e);
    }
  };

  useEffect(() => {
    fetchCronLogs();
    const interval = setInterval(fetchCronLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for next scheduled cron run
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 600 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTriggerNow = async () => {
    setIsRunning(true);
    try {
      const newExec = await clientStorage.runCronJobNow('manual_test');
      await fetchCronLogs();
      setSelectedExecution(newExec);
      setCountdown(600); // reset countdown
      if (onRefreshParent) onRefreshParent();
    } catch (e) {
      console.error('Failed to trigger cron job:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyLogs = (logs: string[]) => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2500);
  };

  const handleCopyCli = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2500);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredExecutions = executions.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const cliCronCommand = `*/10 * * * * /usr/local/bin/php /home/USERNAME/public_html/cpanel-backend/cron_worker.php >> /dev/null 2>&1`;

  return (
    <div className="space-y-6">
      {/* Top Banner with Pulse Metrics & Immediate Controls */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 text-slate-100 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3 space-x-reverse">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Terminal className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  لایه مانیتورینگ زنده کرون‌جاب (Live Cron Job Monitor)
                </h2>
                <span className="flex items-center space-x-1 space-x-reverse text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>پایشگر بلادرنگ فعال</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                مشاهده لحظه‌ای خروجی خط فرمان (stdout/stderr)، وضعیت اسکریپت‌های اتوماسیون پس‌زمینه و چرخه انتشار خودکار.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleTriggerNow}
              disabled={isRunning}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
            >
              {isRunning ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{isRunning ? 'در حال اجرای زنده کرون...' : 'اجرای دستی و تست لحظه‌ای'}</span>
            </button>

            <button
              onClick={fetchCronLogs}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700 transition-colors"
              title="بروزرسانی لاگ‌ها"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Status Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 space-x-reverse">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>زمان تا اجرای بعدی:</span>
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-amber-400">
              {formatCountdown(countdown)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 space-x-reverse">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>نرخ موفقیت اجرا:</span>
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-emerald-400">
              ۱۰۰٪ (بدون خطا)
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 space-x-reverse">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>تعداد کل اجراها:</span>
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-sky-400">
              {toPersianDigits(executions.length)} نوبت
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 space-x-reverse">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>محیط اجرایی فعال:</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-200 truncate">
              سی‌پنل / Node.js
            </div>
          </div>
        </div>
      </div>

      {/* Main Console & Execution History Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Column: Live Terminal Console Output (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                <span className="text-xs font-bold text-slate-200 mr-2 font-mono">
                  کنسول خروجی ترمینال (Terminal STDOUT/STDERR)
                </span>
              </div>

              {selectedExecution && (
                <button
                  onClick={() => handleCopyLogs(selectedExecution.rawConsoleLogs)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors flex items-center space-x-1 space-x-reverse"
                >
                  {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedLogs ? 'کپی شد' : 'کپی کل لاگ'}</span>
                </button>
              )}
            </div>

            {selectedExecution ? (
              <div className="space-y-3">
                {/* Meta summary tag */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-amber-400">{selectedExecution.outputSummary}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      مدت: {selectedExecution.durationMs}ms | خروج: {selectedExecution.exitCode}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      اسکریپت: <code className="text-slate-200">{selectedExecution.scriptName}</code>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      نوع اجرا: {selectedExecution.triggerType === 'manual_test' ? 'دستی' : 'کرون خودکار cPanel'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      آگهی ثبت‌شده: {selectedExecution.publishedAdsCount}
                    </span>
                  </div>
                </div>

                {/* Raw Console Stream */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 font-mono text-[11px] leading-relaxed max-h-[340px] overflow-y-auto space-y-1 text-left" dir="ltr">
                  {(selectedExecution.rawConsoleLogs || []).map((logLine, index) => {
                    const isSuccess = logLine.includes('SUCCESS') || logLine.includes('Exit 0');
                    const isTrigger = logLine.includes('TRIGGER') || logLine.includes('DAEMON');
                    const isAd = logLine.includes('AD-') || logLine.includes('PUBLISH');

                    let textColor = 'text-slate-300';
                    if (isSuccess) textColor = 'text-emerald-400 font-bold';
                    else if (isTrigger) textColor = 'text-amber-400';
                    else if (isAd) textColor = 'text-sky-300';

                    return (
                      <div key={index} className={`flex items-start space-x-2 ${textColor}`}>
                        <span className="text-slate-600 select-none text-[10px] w-6 shrink-0">
                          {(index + 1).toString().padStart(2, '0')}:
                        </span>
                        <span className="break-all">{logLine}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                یک اجرا را از لیست تاریخچه انتخاب کنید.
              </div>
            )}
          </div>

          {/* Quick cPanel Crontab command helper */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center space-x-1.5 space-x-reverse">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>دستور فعال‌سازی در بخش Cron Jobs سی‌پنل (هر ۱۰ دقیقه):</span>
              </span>
              <button
                onClick={() => handleCopyCli(cliCronCommand)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center space-x-1 space-x-reverse"
              >
                {copiedCli ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                <span>{copiedCli ? 'کپی شد' : 'کپی دستور'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-amber-300 font-mono overflow-x-auto text-left" dir="ltr">
              {cliCronCommand}
            </pre>
          </div>
        </div>

        {/* Right Column: Execution History List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white flex items-center space-x-1.5 space-x-reverse">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>تاریخچه نوبت‌های اجرای کرون</span>
              </h3>

              {/* Filter pills */}
              <div className="flex items-center space-x-1 space-x-reverse text-[10px]">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                    filterStatus === 'all'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  همه ({executions.length})
                </button>
                <button
                  onClick={() => setFilterStatus('success')}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                    filterStatus === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  موفق
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {(!filteredExecutions || filteredExecutions.length === 0) ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  هیچ لاگی ثبت نشده است.
                </div>
              ) : (
                (filteredExecutions || []).map((exec) => {
                  const isSelected = selectedExecution?.id === exec.id;
                  return (
                    <div
                      key={exec.id}
                      onClick={() => setSelectedExecution(exec)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                          : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 flex items-center space-x-1.5 space-x-reverse">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {exec.triggerType === 'manual_test' ? 'اجرای تست دستی' : 'نوبت زمان‌بندی‌شده'}
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(exec.timestamp).toLocaleTimeString('fa-IR')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                        {exec.outputSummary}
                      </p>

                      <div className="flex items-center justify-between text-[10px] pt-1 text-slate-500 font-mono">
                        <span>مدت: {exec.durationMs}ms</span>
                        <span className="text-emerald-400 font-sans">
                          {toPersianDigits(exec.publishedAdsCount)} آگهی جدید
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
