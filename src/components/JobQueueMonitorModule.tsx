import React, { useState } from 'react';
import {
  Radio,
  Clock,
  ExternalLink,
  RotateCw,
  KeyRound,
  CheckCircle2,
  Copy,
  Sparkles,
  Globe,
  Activity,
  Check,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { PublicationJob } from '../types/ashk24.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import { clientStorage } from '../services/clientStorageService.js';
import { PublicationDiagnosticsInspector } from './PublicationDiagnosticsInspector.js';

interface JobQueueMonitorModuleProps {
  jobs: PublicationJob[];
  onRefreshJobs: () => void;
}

export const JobQueueMonitorModule: React.FC<JobQueueMonitorModuleProps> = ({
  jobs,
  onRefreshJobs,
}) => {
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpErrorMap, setOtpErrorMap] = useState<Record<string, string>>({});
  const [submittingMap, setSubmittingMap] = useState<Record<string, boolean>>({});
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [copiedDiag, setCopiedDiag] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const handleCopyQuickDiagReport = async () => {
    try {
      const text = await clientStorage.exportPublicationDeepReportText();
      await navigator.clipboard.writeText(text);
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 3000);
    } catch (e) {
      alert('خطا در کپی گزارش عیب‌یابی.');
    }
  };

  const handleSubmitOtp = async (jobId: string) => {
    const code = otpInputs[jobId]?.trim();
    if (!code) {
      setOtpErrorMap((prev) => ({ ...prev, [jobId]: 'لطفاً کد تایید دریافتی را وارد فرمایید.' }));
      return;
    }

    setOtpErrorMap((prev) => ({ ...prev, [jobId]: '' }));
    setSubmittingMap((prev) => ({ ...prev, [jobId]: true }));
    try {
      await clientStorage.submitOtp(jobId, code);
      onRefreshJobs();
    } catch (e: any) {
      const msg = e?.message || 'کد تایید OTP توسط درگاه مقصد رد شد. لطفاً کد صحیح پیامک‌شده را وارد کنید.';
      setOtpErrorMap((prev) => ({ ...prev, [jobId]: msg }));
      onRefreshJobs();
    } finally {
      setSubmittingMap((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleResumeCaptcha = async (jobId: string) => {
    setSubmittingMap((prev) => ({ ...prev, [jobId]: true }));
    try {
      await clientStorage.resumeAfterCaptcha(jobId);
      onRefreshJobs();
    } catch (e) {
      console.error('Error resuming job after captcha:', e);
    } finally {
      setSubmittingMap((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleLaunchTargetSite = (job: PublicationJob) => {
    // Generate real direct registration/submission URL
    let targetUrl = `https://${job.platformId.replace('plat_', '')}.ir`;
    if (job.platformId === 'plat_istgah') {
      targetUrl = 'https://www.istgah.com/register/';
    } else if (job.platformId === 'plat_divar') {
      targetUrl = 'https://divar.ir/my-divar/my-posts';
    } else if (job.platformId === 'plat_sheypoor') {
      targetUrl = 'https://www.sheypoor.com/session';
    } else if (job.platformId === 'plat_niazerooz') {
      targetUrl = 'https://my.niazerooz.com/membership/register';
    } else if (job.platformId === 'plat_agahi24') {
      targetUrl = 'https://agahi24.com/register';
    }

    // Copy formatted Ashk Ghalam payload to clipboard
    const textToCopy = `مجتمع کارتن‌سازی و جعبه‌سازی لوکس و صنعتی اشک قلم مشهد
تلفن سفارشات و هماهنگی: 09153108763
وبسایت رسمی: http://www.ashkghalam.ir
آدرس: مشهد، شهرک صنعتی کلات`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedPayloadId(job.id);
      setTimeout(() => setCopiedPayloadId(null), 4000);
    }

    window.open(targetUrl, '_blank');
  };

  const handleTriggerAllJobs = async () => {
    try {
      const campaigns = await clientStorage.getCampaigns();
      const platforms = await clientStorage.getPlatforms();
      const targetCamp = campaigns[0];
      if (targetCamp) {
        for (const plat of platforms.slice(0, 5)) {
          await clientStorage.triggerJob(targetCamp.id, plat.id);
        }
      }
      onRefreshJobs();
    } catch (e) {
      console.error('Error triggering all jobs:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <span>پایش زنده نوبت‌های انتشار (Live Job Queue & Execution Stream)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مشاهده مراحل واقعی تحلیل DOM، دریافت کد OTP از پیامک و ثبت نهایی آگهی
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowHelpModal(true)}
            title="راهنمای هوشمند سیستم"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 hover:text-amber-300 transition-colors flex items-center justify-center font-bold text-sm w-8 h-8"
          >
            ؟
          </button>

          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 space-x-reverse ${
              showDiagnostics
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{showDiagnostics ? 'بستن پنل عیب‌یابی' : '🔬 پایش و عیب‌یابی توقف ثبت‌نام'}</span>
          </button>

          <button
            onClick={handleCopyQuickDiagReport}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            {copiedDiag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedDiag ? 'گزارش کپی شد!' : '📋 کپی گزارش عیب‌یابی'}</span>
          </button>

          <button
            onClick={handleTriggerAllJobs}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 space-x-reverse shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>اجرای فوری انتشار آگهی‌ها</span>
          </button>

          <button
            onClick={onRefreshJobs}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors flex items-center space-x-1.5 space-x-reverse"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>به‌روزرسانی نوبت‌ها</span>
          </button>
        </div>
      </div>

      {/* Embedded Deep Diagnostics Inspector when toggled */}
      {showDiagnostics && (
        <PublicationDiagnosticsInspector onRefreshAll={onRefreshJobs} />
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {(!jobs || jobs.length === 0) ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <Clock className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">هیچ نوبت انتشاری در حال اجرا نیست</h3>
            <p className="text-xs text-slate-500">
              از بخش «مدیریت کمپین‌ها» یا «داشبورد» روی دکمه اجرای کمپین کلیک کنید.
            </p>
          </div>
        ) : (
          (jobs || []).map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-sm font-bold text-slate-100">
                      پلتفرم: {job.platformName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">({job.id})</span>
                  </div>
                  <div className="text-xs text-slate-400">{job.currentStep}</div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    type="button"
                    onClick={() => handleLaunchTargetSite(job)}
                    className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center space-x-1.5 space-x-reverse"
                    title="باز کردن صفحه ورود/ثبت‌نام پلتفرم هدف و کپی خودکار مشخصات اشک قلم در کلیپ‌بورد"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>
                      {copiedPayloadId === job.id ? '✓ متن کپی شد (باز شد)' : 'دستیار ورود به سایت مقصد'}
                    </span>
                  </button>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                      job.status === 'published'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : job.status === 'waiting_otp' || job.status === 'paused_user_action'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                        : job.status === 'waiting_human_action'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                        : job.status === 'solving_captcha'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : job.status === 'failed'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}
                  >
                    {job.status === 'published'
                      ? 'انتشار موفقیت‌آمیز'
                      : job.status === 'paused_user_action'
                      ? '🛡️ توقف در انتظار اقدام انسانی (کپچا / پیامک)'
                      : job.status === 'waiting_otp'
                      ? '⚠️ منتظر تایید OTP پیامک'
                      : job.status === 'waiting_human_action'
                      ? '🛡️ اقدام کاربر (حل چالش ضد ربات)'
                      : job.status === 'solving_captcha'
                      ? '🔄 بررسی چالش امنیتی'
                      : job.status === 'failed'
                      ? 'خطا در اجرا'
                      : `در حال اجرا (%${toPersianDigits(job.progressPercent)})`}
                  </span>

                  {job.adUrl && (
                    <a
                      href={job.adUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-semibold hover:bg-blue-500/20 transition-colors flex items-center space-x-1 space-x-reverse"
                    >
                      <span>لینک آگهی</span>
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    </a>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${job.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* OTP & Cloud Browser Interactive Box */}
              {(job.status === 'waiting_otp' || job.status === 'paused_user_action') && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center space-x-2 space-x-reverse text-amber-300 font-bold text-xs">
                    <KeyRound className="w-4.5 h-4.5 text-amber-400" />
                    <span>
                      {job.challengeType === 'CAPTCHA_CHALLENGE'
                        ? 'چالش کپچای امنیتی فعال شد. لطفاً از طریق مرورگر ابری آن را تایید نمایید:'
                        : 'کد پیامک ارسال شده به تلفن همراه (09153108763) را وارد نمایید:'}
                    </span>
                  </div>

                  {job.interactiveUrl && (
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-amber-500/40 flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs text-amber-200">
                        <span className="font-bold">مرورگر ابری تعاملی (noVNC) فعال است: </span>
                        <span>می‌توانید مستقیماً صفحه مرورگر را مشاهده کرده و کپچا یا پیامک را تایید فرمایید.</span>
                      </div>
                      <a
                        href={job.interactiveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md flex items-center space-x-1.5 space-x-reverse"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>مشاهده و حل مستقیم در مرورگر ابری (noVNC)</span>
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="کد ۵ یا ۶ رقمی..."
                      value={otpInputs[job.id] || ''}
                      onChange={(e) => {
                        setOtpInputs({ ...otpInputs, [job.id]: e.target.value });
                        if (otpErrorMap[job.id]) {
                          setOtpErrorMap({ ...otpErrorMap, [job.id]: '' });
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/50 text-amber-300 font-mono text-sm tracking-widest outline-none focus:border-amber-400 w-44"
                    />
                    <button
                      onClick={() => handleSubmitOtp(job.id)}
                      disabled={submittingMap[job.id]}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1 space-x-reverse"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{submittingMap[job.id] ? 'در حال تایید...' : 'تایید و ادامه پروسه'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchTargetSite(job)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center space-x-1 space-x-reverse"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>باز کردن سایت {job.platformName}</span>
                    </button>
                  </div>

                  {otpErrorMap[job.id] && (
                    <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-2 space-x-reverse">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{otpErrorMap[job.id]}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Human Action / CAPTCHA Prompt Interactive Box */}
              {(job.status === 'waiting_human_action' || job.humanActionRequired) && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                  <div className="flex items-start space-x-2 space-x-reverse text-rose-300 font-bold text-xs">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span>گیت امنیتی ضد ربات (DDoS Guard / CAPTCHA) در سایت {job.platformName} فعال شد:</span>
                      <p className="text-[11px] font-normal text-rose-200/90 mt-1 leading-relaxed">
                        {job.challengeInfo?.description || 'سیستم امنیتی سایت مقصد دسترسی سرور را مسدود کرده است. از آنجا که تایید کپچا باید روی همان IP (کلاینت) انجام شود، ادامه فرآیند سمت سرور متوقف گردید. لطفاً از طریق پکیج افزونه مرورگر اقدام فرمایید.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={job.challengeInfo?.targetUrl || `https://${job.platformId.replace('plat_', '')}.ir`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 space-x-reverse shadow-md shadow-amber-500/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>اجرای دستی در تب جدید (کپی اطلاعات انجام شد)</span>
                    </a>
                    <button
                      onClick={() => handleResumeCaptcha(job.id)}
                      disabled={submittingMap[job.id]}
                      className="px-4 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs transition-colors flex items-center space-x-1.5 space-x-reverse border border-slate-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{submittingMap[job.id] ? 'در حال لغو...' : 'خاتمه و ارجاع به افزونه مرورگر (Extension)'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400 mr-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse"></span>
                      نوبت به Extension منتقل می‌شود
                    </span>
                  </div>
                </div>
              )}

              {/* Job Logs Feed */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  لاگ سیستم پردازش (Trace Logs):
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
                  {(job.logs || []).map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-2 space-x-reverse text-slate-300"
                    >
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span
                        className={`font-semibold shrink-0 ${
                          log.status === 'success'
                            ? 'text-emerald-400'
                            : log.status === 'warning'
                            ? 'text-amber-400'
                            : log.status === 'error'
                            ? 'text-red-400'
                            : 'text-blue-400'
                        }`}
                      >
                        [{log.step}]
                      </span>
                      <span className="text-slate-200">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* مودال راهنمای هوشمند */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>راهنمای هوشمند: چرخه ثبت نام، OTP و انتشار آگهی واقعی</span>
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-amber-300">
                چرا کدهای الکی OTP رد می‌شوند و انتشار شبیه‌سازی نمی‌شود؟
              </p>
              <p>
                طبق استانداردهای اشک ۲۴، هرگونه موفقیت ساختگی و شبیه‌سازی اکیداً مسدود شده است. وقتی کدی وارد می‌شود، مستقیماً به API و سرور سایت مقصد (مانند دیوار) ارسال شده و در صورت عدم تطابق با پیامک واقعی، صریحاً خطا نمایش داده می‌شود.
              </p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block">راهکار عملیاتی در سرورهای معمولی cPanel:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong className="text-slate-200">روش افزونه مرورگر (توصیه اول):</strong> با نصب افزونه اشک ۲۴ در مرورگر خودتان، ثبت نام و انتشار با IP واقعی و نشست خودتان در ایران انجام شده و سیستم‌های ضد ربات و کپچا مسدود نمی‌شوند.</li>
                  <li><strong className="text-slate-200">روش وب‌هوک و API مستقیم:</strong> پلتفرم‌های سازگار با cURL از طریق سرور بررسی شده و کد دریافتی به درگاه ارسال می‌شود.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
