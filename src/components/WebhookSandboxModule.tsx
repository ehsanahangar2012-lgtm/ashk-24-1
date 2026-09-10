import React, { useState } from 'react';
import {
  Inbox,
  Send,
  CheckCircle2,
  ShieldCheck,
  Mail,
  MessageSquare,
  Smartphone,
  Eye,
  Sparkles,
  Copy,
  Check,
  ScanLine,
  RefreshCw,
} from 'lucide-react';
import { SmsWebhookPayload } from '../types/ashk24.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import { solveCaptchaOffline, OcrResult } from '../utils/offlineOcrEngine.js';

interface WebhookSandboxModuleProps {
  smsLogs: SmsWebhookPayload[];
  onRefreshSmsLogs: () => void;
}

type ChannelType = 'sms' | 'bale' | 'eitaa' | 'rubika' | 'telegram' | 'ocr_tester';

export const WebhookSandboxModule: React.FC<WebhookSandboxModuleProps> = ({
  smsLogs,
  onRefreshSmsLogs,
}) => {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('sms');
  const [senderNumber, setSenderNumber] = useState<string>('30002100');
  const [receiverNumber, setReceiverNumber] = useState<string>('09123456789');
  const [messageText, setMessageText] = useState<string>(
    'کد تایید ورود شما به سامانه دیوار: 584920\nاعتبار کد: ۲ دقیقه'
  );
  const [simulating, setSimulating] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // OCR state
  const [ocrImageSample, setOcrImageSample] = useState<string>('sample1');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      if (activeChannel === 'sms') {
        await fetch('/cpanel-backend/api/index.php?route=webhooks/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderNumber,
            receiverNumber,
            messageText,
          }),
        });
      } else {
        await fetch('/cpanel-backend/api/index.php?route=webhooks/messenger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messenger: activeChannel,
            from: senderNumber,
            text: messageText,
          }),
        });
      }
      onRefreshSmsLogs();
    } catch (e) {
      console.error('Webhook simulation error:', e);
    } finally {
      setSimulating(false);
    }
  };

  const handleRunOcrTest = async () => {
    setOcrLoading(true);
    try {
      // Create sample captcha canvas
      const canvas = document.createElement('canvas');
      canvas.width = 140;
      canvas.height = 45;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, 140, 45);
        ctx.font = 'bold 26px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const sampleDigits = ocrImageSample === 'sample1' ? '74921' : ocrImageSample === 'sample2' ? '38506' : '91482';
        ctx.fillText(sampleDigits, 70, 23);

        // Add some noise lines
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(10, 20);
        ctx.lineTo(130, 25);
        ctx.stroke();

        const dataUrl = canvas.toDataURL('image/png');
        const res = await solveCaptchaOffline(dataUrl);
        setOcrResult(res);
      }
    } catch (e) {
      console.error('OCR test error:', e);
    } finally {
      setOcrLoading(false);
    }
  };

  const channelNames: Record<ChannelType, string> = {
    sms: 'درگاه پیامک (SMS)',
    bale: 'پیام‌رسان بله (Bale Bot)',
    eitaa: 'پیام‌رسان ایتا (Eitaa Bot)',
    rubika: 'پیام‌رسان روبیکا (Rubika Bot)',
    telegram: 'تلگرام (Telegram Bot)',
    ocr_tester: 'موتور OCR کپچا (آفلاین)',
  };

  const webhookEndpoint =
    activeChannel === 'sms'
      ? `${window.location.origin}/cpanel-backend/api/index.php?route=webhooks/sms`
      : `${window.location.origin}/cpanel-backend/api/index.php?route=webhooks/messenger&type=${activeChannel}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
            <Inbox className="w-5 h-5 text-amber-400" />
            <span>سندباکس وب‌هوک‌های بومی پیامک، پیام‌رسان‌ها و حل کپچا</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دریافت بی‌درنگ کدهای ورود (OTP)، وب‌هوک بات‌های بله/ایتا/روبیکا و حل آفلاین کدهای امنیتی تصویری
          </p>
        </div>

        {/* Copy Webhook URL */}
        <div className="flex items-center space-x-2 space-x-reverse bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-mono text-[11px] truncate max-w-[200px] sm:max-w-[260px]">
            {webhookEndpoint}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(webhookEndpoint);
              setCopiedUrl(true);
              setTimeout(() => setCopiedUrl(false), 2000);
            }}
            className="p-1 rounded-lg text-amber-400 hover:bg-slate-800 transition-all shrink-0"
            title="کپی آدرس وب‌هوک"
          >
            {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['sms', 'bale', 'eitaa', 'rubika', 'telegram', 'ocr_tester'] as ChannelType[]).map((ch) => (
          <button
            key={ch}
            onClick={() => {
              setActiveChannel(ch);
              if (ch === 'bale') {
                setSenderNumber('@BaleBot_User');
                setMessageText('کد تایید ورود به دیوار برای شماره شما: 639812');
              } else if (ch === 'eitaa') {
                setSenderNumber('@Eitaa_Channel');
                setMessageText('کد فعالسازی شیپور: 481023');
              } else if (ch === 'rubika') {
                setSenderNumber('rubika_bot_id');
                setMessageText('کد ورود ایستگاه: 893140');
              } else if (ch === 'sms') {
                setSenderNumber('30002100');
                setMessageText('کد تایید ورود شما به سامانه دیوار: 584920\nاعتبار کد: ۲ دقیقه');
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 space-x-reverse ${
              activeChannel === ch
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {ch === 'ocr_tester' ? <ScanLine className="w-3.5 h-3.5 ml-1" /> : <MessageSquare className="w-3.5 h-3.5 ml-1" />}
            <span>{channelNames[ch]}</span>
          </button>
        ))}
      </div>

      {activeChannel === 'ocr_tester' ? (
        /* OCR Test Bench */
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <ScanLine className="w-4 h-4 text-emerald-400" />
                <span>موتور پردازش تصویر و OCR بومی کپچاهای فارسی و عددی</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                پردازش پیکسلی، باینری‌سازی تطبیقی و استخراج ارقام بدون ارسال به سرور خارجی یا مصرف اینترنت
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              ۱۰۰٪ آفلاین
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-300">نمونه کپچای آزمایشی:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sample1', label: 'کپچای ۱ (۷۴۹۲۱)' },
                  { id: 'sample2', label: 'کپچای ۲ (۳۸۵۰۶)' },
                  { id: 'sample3', label: 'کپچای ۳ (۹۱۴۸۲)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setOcrImageSample(s.id)}
                    className={`p-2.5 rounded-xl text-xs font-medium text-center transition-all ${
                      ocrImageSample === s.id
                        ? 'bg-amber-500/20 border border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[90px]">
                <div className="px-6 py-3 bg-slate-100 rounded-lg text-slate-950 font-black text-2xl tracking-widest font-mono select-none shadow-inner border border-slate-300">
                  {ocrImageSample === 'sample1' ? '7 4 9 2 1' : ocrImageSample === 'sample2' ? '3 8 5 0 6' : '9 1 4 8 2'}
                </div>
              </div>

              <button
                onClick={handleRunOcrTest}
                disabled={ocrLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
              >
                <ScanLine className="w-4 h-4 ml-1" />
                <span>{ocrLoading ? 'در حال پردازش...' : 'استخراج و حل خودکار کپچا (Run OCR Solver)'}</span>
              </button>
            </div>

            {/* OCR Output */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-center">
              <span className="text-xs font-semibold text-slate-400">نتیجه پردازش و حل کپچا:</span>
              {ocrResult ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                    <span className="text-xs text-emerald-400 font-medium">کد امنیتی استخراج‌شده:</span>
                    <div className="text-2xl font-black text-emerald-300 font-mono tracking-widest">
                      {ocrResult.text} ({ocrResult.persianDigits})
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 text-slate-300">
                      <span className="text-slate-500 block text-[10px]">دقت تخمین:</span>
                      <span className="font-bold text-amber-400 font-mono">{toPersianDigits(ocrResult.confidence)}٪</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 text-slate-300">
                      <span className="text-slate-500 block text-[10px]">زمان پردازش:</span>
                      <span className="font-bold text-slate-200 font-mono">{toPersianDigits(ocrResult.processingTimeMs)} میلی‌ثانیه</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-500 py-8">
                  دکمه حل خودکار کپچا را لمس کنید تا الگوهای پیکسلی استخراج شوند.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Messenger / SMS Webhook Simulator */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Simulator Input */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center space-x-2 space-x-reverse">
              <Send className="w-4 h-4 text-amber-400" />
              <span>شبیه‌ساز پیام ورودی ({channelNames[activeChannel]})</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">فرستنده / بات:</label>
                <input
                  type="text"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">شناسه مقصد:</label>
                <input
                  type="text"
                  value={receiverNumber}
                  onChange={(e) => setReceiverNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">متن پیام دریافتی:</label>
              <textarea
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 leading-relaxed font-sans"
              />
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
            >
              <Send className="w-4 h-4 ml-1" />
              <span>ارسال پیام آزمایشی به وب‌هوک</span>
            </button>
          </div>

          {/* Live Incoming Logs */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-200">پیام‌ها و کدهای OTP پردازش‌شده</h3>
              <span className="text-xs text-slate-400">تعداد: {toPersianDigits((smsLogs || []).length)}</span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {(!smsLogs || smsLogs.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  پیامی ثبت نشده است. از فرم سمت راست یک پیام تست ارسال کنید.
                </div>
              ) : (
                (smsLogs || []).map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-400">{log.senderNumber}</span>
                      {log.extractedCode ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold font-mono border border-emerald-500/30">
                          کد OTP استخراج شده: {log.extractedCode}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">کدی یافت نشد</span>
                      )}
                    </div>

                    <p className="text-slate-200 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      {log.messageText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
