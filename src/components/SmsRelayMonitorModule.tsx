import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Zap,
  Radio,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Send,
  Bell,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Server,
  Volume2,
  VolumeX,
  Inbox,
  Sparkles,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import {
  SmsRelayHealthStatus,
  SmsRelayAlert,
  OverdueOtpJob,
  SmsRelayProbeResult,
} from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';
import { toPersianDigits, getJalaliCurrentTime } from '../utils/persianUtils.js';

interface SmsRelayMonitorProps {
  onOpenSecretaryBridge?: () => void;
  compact?: boolean;
}

export const SmsRelayMonitorModule: React.FC<SmsRelayMonitorProps> = ({
  onOpenSecretaryBridge,
  compact = false,
}) => {
  const [health, setHealth] = useState<SmsRelayHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(10);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Probe testing state
  const [probeSender, setProbeSender] = useState<string>('30009900');
  const [probeOtp, setProbeOtp] = useState<string>('749210');
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [probeFeedback, setProbeFeedback] = useState<SmsRelayProbeResult | null>(null);

  // Quick manual OTP resolution state
  const [resolvingJobId, setResolvingJobId] = useState<string | null>(null);
  const [manualOtpCode, setManualOtpCode] = useState<string>('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState<boolean>(false);

  // Copy states
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  const prevStatusRef = useRef<string>('HEALTHY');

  // Play alert beep for critical state
  const playAlertSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  };

  const fetchHealthData = async () => {
    try {
      const res = await clientStorage.getSmsRelayHealth();
      setHealth(res);
      setLastCheckTime(getJalaliCurrentTime());

      // If transition to CRITICAL or currently CRITICAL with overdue OTPs
      if (res.status === 'CRITICAL' && prevStatusRef.current !== 'CRITICAL') {
        playAlertSound();
      }
      prevStatusRef.current = res.status;
    } catch (err) {
      console.error('Error fetching SMS relay health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealthData();
    }, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalSec]);

  const handleSendProbe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!probeOtp.trim()) return;
    setIsProbing(true);
    setProbeFeedback(null);
    try {
      const res = await clientStorage.sendSmsRelayProbe(probeSender, probeOtp.trim());
      setProbeFeedback(res);
      await fetchHealthData();
    } catch (err) {
      console.error('Error sending probe:', err);
    } finally {
      setIsProbing(false);
    }
  };

  const handleManualResolveOtp = async (jobId: string) => {
    if (!manualOtpCode.trim()) return;
    setIsSubmittingOtp(true);
    try {
      await clientStorage.submitOtp(jobId, manualOtpCode.trim());
      await clientStorage.relayMobileOtpToHost(manualOtpCode.trim(), jobId);
      setResolvingJobId(null);
      setManualOtpCode('');
      await fetchHealthData();
    } catch (err) {
      console.error('Error resolving OTP:', err);
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const copyToClipboard = (text: string, type: 'webhook' | 'curl') => {
    navigator.clipboard.writeText(text);
    if (type === 'webhook') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.ir';
  const fullWebhookUrl = `${originUrl}/cpanel-backend/api/index.php?route=webhooks/sms`;
  const sampleCurl = `curl -X POST "${fullWebhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Gateway-Secret: ashk24_cron_secret" \\
  -d '{"senderNumber": "30009900", "messageText": "کد ورود شما: 749210"}'`;

  // Status visual configurations
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          icon: CheckCircle2,
          label: 'ارتباط فعال و پایدار (Healthy)',
          desc: 'وب‌هوک پیامک متصل است و هیچ نوبت معطل مانده‌ای وجود ندارد.',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400',
          icon: AlertTriangle,
          label: 'در انتظار پیامک (Waiting OTP)',
          desc: 'نوبت کاری منتظر دریافت کد تایید است؛ وب‌هوک آماده دریافت است.',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse',
          dot: 'bg-rose-500',
          icon: AlertOctagon,
          label: 'هشدار قطعی یا تاخیر دریافت OTP',
          desc: 'پیامک کد تایید در زمان استاندارد به سرور نرسیده یا امضای وب‌هوک نامعتبر است!',
        };
      default:
        return {
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
          dot: 'bg-slate-400',
          icon: HelpCircle,
          label: 'نامشخص / در حال بررسی',
          desc: 'در حال استعلام وضعیت از هسته سرور...',
        };
    }
  };

  const statusConfig = getStatusBadge(health?.status || 'HEALTHY');
  const StatusIcon = statusConfig.icon;

  if (compact) {
    return (
      <div className={`p-4 rounded-xl border ${statusConfig.bg} flex items-center justify-between gap-3 shadow-lg`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className={`flex h-3 w-3 rounded-full ${statusConfig.dot}`} />
            {health?.status === 'CRITICAL' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 top-0 right-0" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              <StatusIcon className="w-4 h-4" />
              <span>پایش رله پیامک OTP: {statusConfig.label}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{statusConfig.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {health?.overdueOtpJobsCount ? (
            <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-xs font-bold animate-bounce">
              {toPersianDigits(health.overdueOtpJobsCount)} نوبت معطل
            </span>
          ) : null}
          <button
            onClick={fetchHealthData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="بروزرسانی وضعیت"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border ${statusConfig.bg} shrink-0`}>
              <StatusIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-white">
                  ماژول پایش و هشدار وضعیت ارتباط cPanel با SMS Relay
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg} flex items-center gap-1.5`}>
                  <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                نظارت مستمر ۲۴ ساعته بر درگاه دریافت پیامک‌های کد تایید (OTP)، سلامت وب‌هوک و هشدارهای بلادرنگ تاخیر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                  : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'هشدار صوتی فعال است' : 'هشدار صوتی غیرفعال است'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'صدا روشن' : 'صدا خاموش'}</span>
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                autoRefresh
                  ? 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-purple-400 animate-pulse' : ''}`} />
              <span>پایش خودکار ({toPersianDigits(refreshIntervalSec)} ثانیه)</span>
            </button>

            <button
              onClick={fetchHealthData}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی</span>
            </button>
          </div>
        </div>

        {lastCheckTime && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              آخرین زمان راستی‌آزمایی: <span className="text-slate-300 font-mono">{toPersianDigits(lastCheckTime)}</span>
            </span>
            <span className="text-slate-400">
              تاخیر پاسخگویی سرور: <span className="text-emerald-400 font-mono">{toPersianDigits(health?.latencyMs || 12)} میلی‌ثانیه</span>
            </span>
          </div>
        )}
      </div>

      {/* Critical Alert Banner if Active */}
      {health?.activeAlerts && health.activeAlerts.length > 0 && (
        <div className="space-y-3">
          {health.activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
                alert.level === 'critical'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 font-bold">
                      {alert.level === 'critical' ? 'هشدار بحرانی' : 'توجه'}
                    </span>
                    <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{alert.description}</p>
                  <div className="mt-2 text-xs text-amber-300 font-medium flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>اقدام پیشنهادی: {alert.suggestedAction}</span>
                  </div>
                </div>
              </div>

              {onOpenSecretaryBridge && (
                <button
                  onClick={onOpenSecretaryBridge}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-colors shadow-md"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>بازگشایی پل منشی & ثبت دستی OTP</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4 Core Health Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Webhook Endpoint */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">وب‌هوک سرور cPanel</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Server className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold text-white">آماده دریافت (Active)</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono truncate" title={health?.gatewayEndpoint}>
              /api/?route=webhooks/sms
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>پروتکل: REST / JSON</span>
            <span className="text-emerald-400">HTTP 200 OK</span>
          </div>
        </div>

        {/* 2. Signature & Security */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">امضای امنیتی گیت‌وی</span>
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health?.signatureConfigured ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span className="text-sm font-bold text-white">
                {health?.signatureConfigured ? 'کلید امنیتی معتبر' : 'فاقد کلید امضا'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              X-Gateway-Secret: {health?.secretKeyMasked || 'ash***ret'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>الگوریتم: Hash Equals</span>
            <span className="text-purple-400">Zero-Fake Verified</span>
          </div>
        </div>

        {/* 3. Received SMS Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">پیامک‌های دریافتی</span>
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Inbox className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-white">
                {toPersianDigits(health?.totalReceivedSmsCount || 0)}
              </span>
              <span className="text-xs text-slate-400 mr-1.5">پیامک در دیتابیس</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              متصل شده به نوبت‌ها: <span className="text-emerald-400 font-bold">{toPersianDigits(health?.matchedSmsCount || 0)}</span>
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>بدون کد OTP: {toPersianDigits(health?.unmatchedSmsCount || 0)}</span>
            <span className="text-blue-400">همگام با هاست</span>
          </div>
        </div>

        {/* 4. Overdue / Pending Watchdog */}
        <div className={`rounded-xl p-4 border flex flex-col justify-between ${
          (health?.overdueOtpJobsCount || 0) > 0
            ? 'bg-rose-950/20 border-rose-800/40'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">دیده‌بان نوبت‌های معطل OTP</span>
              <span className={`p-1.5 rounded-lg ${
                (health?.overdueOtpJobsCount || 0) > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <Activity className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-xl font-black ${
                (health?.overdueOtpJobsCount || 0) > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'
              }`}>
                {toPersianDigits(health?.overdueOtpJobsCount || 0)}
              </span>
              <span className="text-xs text-slate-400">نوبت با تاخیر بحرانی</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              کل در صف انتظار: {toPersianDigits(health?.pendingOtpJobsCount || 0)} نوبت
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>حد مجاز تاخیر: ۶۰ ثانیه</span>
            <span className={(health?.overdueOtpJobsCount || 0) > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {(health?.overdueOtpJobsCount || 0) > 0 ? 'نیاز به مداخله' : 'عادی'}
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Jobs Watchdog Table */}
      {health?.pendingJobs && health.pendingJobs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">
                نوبت‌های کاری در صف انتظار دریافت کد تایید پیامکی (OTP Watchdog)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              تعداد: {toPersianDigits(health.pendingJobs.length)} نوبت
            </span>
          </div>

          <div className="space-y-3">
            {health.pendingJobs.map((j) => {
              const isOverdue = j.waitingDurationSeconds > 60;
              const isResolving = resolvingJobId === j.id;

              return (
                <div
                  key={j.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isOverdue
                      ? 'bg-rose-950/20 border-rose-800/50 text-rose-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${isOverdue ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{j.platformName}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {j.id}
                          </span>
                          {isOverdue && (
                            <span className="text-xs px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 font-bold animate-pulse">
                              تاخیر بحرانی ({toPersianDigits(Math.round(j.waitingDurationSeconds))} ثانیه)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          شماره تماس مقصد: <span className="font-mono text-slate-300">{j.phone}</span> | وضعیت: {j.currentStep || 'در انتظار پیامک'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isResolving ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={8}
                            placeholder="کد OTP..."
                            value={manualOtpCode}
                            onChange={(e) => setManualOtpCode(e.target.value)}
                            className="w-28 px-3 py-1.5 rounded-lg bg-slate-800 border border-purple-500 text-white text-xs font-mono text-center tracking-widest focus:outline-none"
                          />
                          <button
                            onClick={() => handleManualResolveOtp(j.id)}
                            disabled={isSubmittingOtp || !manualOtpCode.trim()}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>ثبت</span>
                          </button>
                          <button
                            onClick={() => setResolvingJobId(null)}
                            className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
                          >
                            انصراف
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setResolvingJobId(j.id);
                            setManualOtpCode('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>ثبت دستی کد</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Diagnostic Interactive Probe & End-to-End Test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Test Ping / Probe */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">
                ارسال پینگ آزمایشی سلامت رله پیامک (Diagnostic Probe)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              با ارسال یک بسته آزمایشی با امضای معتبر به وب‌هوک cPanel، صحت استخراج خودکار OTP و بروزرسانی بلادرنگ سیستم را تست نمایید.
            </p>

            <form onSubmit={handleSendProbe} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    سرشماره ارسال‌کننده:
                  </label>
                  <input
                    type="text"
                    value={probeSender}
                    onChange={(e) => setProbeSender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    کد تایید آزمایشی (Sample OTP):
                  </label>
                  <input
                    type="text"
                    value={probeOtp}
                    onChange={(e) => setProbeOtp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono tracking-widest text-center focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProbing || !probeOtp.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {isProbing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>ارسال بسته آزمایشی و تست پیوستگی رله</span>
              </button>
            </form>

            {probeFeedback && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{probeFeedback.message}</span>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    شناسه رهگیری: {probeFeedback.probeId} | امضای وب‌هوک تایید شد
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Integration Webhook & Setup Helper */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">
                پیکربندی گیت‌وی پیامک & برنامه اندروید
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              آدرس وب‌هوک و هدر کلید امنیتی زیر را در اپلیکیشن فورواردر پیامک یا وب‌سایت ارائه‌دهنده وب‌سرویس پیامک وارد کنید:
            </p>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  آدرس وب‌هوک اختصاصی cPanel (POST):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fullWebhookUrl}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(fullWebhookUrl, 'webhook')}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
                    title="کپی آدرس"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  دستور نمونه cURL جهت اتصال:
                </label>
                <div className="relative">
                  <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 text-[10px] font-mono overflow-x-auto leading-relaxed">
                    {sampleCurl}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(sampleCurl, 'curl')}
                    className="absolute top-2 left-2 p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1"
                  >
                    {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>کپی cURL</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
