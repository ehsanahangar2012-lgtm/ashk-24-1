import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Send,
  Bell,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Copy,
  Zap,
  Info,
  QrCode,
  Download,
  Flame,
  Check,
  KeyRound,
  Inbox,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Sliders,
  Cpu,
  Mail,
  FileCode,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MobileDeviceConfig, MobileNotificationLog, SmsWebhookPayload, EmailWebhookPayload } from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';
import { toPersianDigits } from '../utils/persianUtils.js';

import { SmartHelpButton } from './SmartHelpModal.js';

export const MobileCompanionModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'host_bridge' | 'otp_checker' | 'apk_download' | 'smart_guide' | 'emulator' | 'pairing'>('host_bridge');
  const [config, setConfig] = useState<MobileDeviceConfig | null>(null);
  const [notifications, setNotifications] = useState<MobileNotificationLog[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsWebhookPayload[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailWebhookPayload[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Host Secretary Bridge States
  const [pendingHostOtps, setPendingHostOtps] = useState<any[]>([]);
  const [manualOtpInput, setManualOtpInput] = useState<string>('');
  const [isRelayingOtp, setIsRelayingOtp] = useState<boolean>(false);
  const [relayFeedback, setRelayFeedback] = useState<string | null>(null);
  const [selectedPlatformForSync, setSelectedPlatformForSync] = useState<string>('plat_divar');
  const [sessionTokenInput, setSessionTokenInput] = useState<string>('');
  const [isSyncingToken, setIsSyncingToken] = useState<boolean>(false);
  const [tokenSyncFeedback, setTokenSyncFeedback] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);
  const [copiedEmailWebhook, setCopiedEmailWebhook] = useState<boolean>(false);
  const [copiedKotlin, setCopiedKotlin] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // SMS & Gmail Test States
  const [testSmsSender, setTestSmsSender] = useState<string>('30009900');
  const [testSmsText, setTestSmsText] = useState<string>('کد ورود به پلتفرم ایستگاه: 749210');
  const [testGmailSender, setTestGmailSender] = useState<string>('accounts@google.com');
  const [testGmailSubject, setTestGmailSubject] = useState<string>('کد تایید امنیتی ورود به شیپور: 382914');
  const [testGmailBody, setTestGmailBody] = useState<string>('کد تایید ورود شما به سامانه: 382914. لطفا این کد را در اختیار دیگران نگذارید.');
  const [simulatingSms, setSimulatingSms] = useState<boolean>(false);
  const [simulatingGmail, setSimulatingGmail] = useState<boolean>(false);

  // Push test states
  const [testPushTitle, setTestPushTitle] = useState<string>('🚀 انتشار موفق آگهی جدید');
  const [testPushMsg, setTestPushMsg] = useState<string>('آگهی کارتن‌سازی با موفقیت در ایستگاه و شیپور منتشر گردید.');

  const requestBrowserNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
  };

  const showRealBrowserNotification = (title: string, body: string) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          dir: 'rtl',
        });
      } catch (e) {
        console.error('Error showing HTML5 browser notification:', e);
      }
    }
  };

  const fetchMobileData = async () => {
    setIsLoading(true);
    try {
      const [cfg, notifs, sms, emails, pendingData] = await Promise.all([
        clientStorage.getMobileConfig(),
        clientStorage.getMobileNotifications(),
        clientStorage.getSmsLogs(),
        clientStorage.getEmailLogs(),
        clientStorage.getPendingOtpsFromHost(),
      ]);
      setConfig(cfg);
      setNotifications(notifs);
      setSmsLogs(sms);
      setEmailLogs(emails);
      if (pendingData && pendingData.pendingJobs) {
        setPendingHostOtps(pendingData.pendingJobs);
      }
    } catch (e) {
      console.error('Error fetching mobile data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelayOtp = async (codeToRelay?: string, jobId?: string) => {
    const code = codeToRelay || manualOtpInput.trim();
    if (!code) return;
    setIsRelayingOtp(true);
    setRelayFeedback(null);
    try {
      const res = await clientStorage.relayMobileOtpToHost(code, jobId);
      setRelayFeedback(res.message);
      setManualOtpInput('');
      await fetchMobileData();
      showRealBrowserNotification('⚡ انتقال کد OTP به هاست', res.message);
    } catch (e: any) {
      setRelayFeedback('خطا در انتقال کد به هاست: ' + (e?.message || 'خطای شبکه'));
    } finally {
      setIsRelayingOtp(false);
    }
  };

  const handleSyncSessionToken = async () => {
    if (!sessionTokenInput.trim()) return;
    setIsSyncingToken(true);
    setTokenSyncFeedback(null);
    try {
      const res = await clientStorage.syncSessionTokenToHost(selectedPlatformForSync, sessionTokenInput.trim());
      setTokenSyncFeedback(res.message);
      setSessionTokenInput('');
      showRealBrowserNotification('🔑 همگام‌سازی توکن سشن', res.message);
    } catch (e: any) {
      setTokenSyncFeedback('خطا در ذخیره توکن سشن: ' + (e?.message || 'خطای سرور'));
    } finally {
      setIsSyncingToken(false);
    }
  };

  useEffect(() => {
    fetchMobileData();

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleBroadcast = (event: MessageEvent) => {
        if (event.data && event.data.type === 'MOBILE_SYNC_STATUS_BROADCAST') {
          if (event.data.payload.config) setConfig(event.data.payload.config);
          if (event.data.payload.notifications) setNotifications(event.data.payload.notifications);
        }
      };
      navigator.serviceWorker.addEventListener('message', handleBroadcast);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        navigator.serviceWorker.removeEventListener('message', handleBroadcast);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const broadcastStatusUpdate = (updatedConfig: MobileDeviceConfig, updatedNotifications: MobileNotificationLog[]) => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'MOBILE_SYNC_STATUS',
        payload: {
          config: updatedConfig,
          notifications: updatedNotifications,
        },
      });
    }
  };

  const handleToggleSetting = async (key: keyof MobileDeviceConfig) => {
    if (!config) return;
    const updatedVal = !config[key];
    const updated = await clientStorage.saveMobileConfig({ [key]: updatedVal });
    setConfig(updated);
    broadcastStatusUpdate(updated, notifications);
  };

  const handleSendTestPush = async () => {
    if (!testPushTitle || !testPushMsg) return;
    const newNotif = await clientStorage.sendMobilePushNotification(
      testPushTitle,
      testPushMsg,
      'ad_published',
      'ایستگاه'
    );
    const nextNotifs = [newNotif, ...notifications];
    setNotifications(nextNotifs);
    showRealBrowserNotification(testPushTitle, testPushMsg);
    if (config) {
      broadcastStatusUpdate(config, nextNotifs);
    }
  };

  const handleSimulateSmsFromPhone = async () => {
    if (!testSmsText) return;
    setSimulatingSms(true);
    try {
      const codeMatch = testSmsText.match(/\d{4,8}/);
      const extracted = codeMatch ? codeMatch[0] : undefined;

      const newPayload: SmsWebhookPayload = {
        id: `sms_${Date.now()}`,
        senderNumber: testSmsSender,
        receiverNumber: '09153108763',
        messageText: testSmsText,
        receivedAt: new Date().toLocaleTimeString('fa-IR'),
        extractedCode: extracted,
        status: extracted ? 'parsed' : 'unmatched',
      };

      await clientStorage.addSmsLog(newPayload);
      setSmsLogs((prev) => [newPayload, ...prev]);

      // Auto-submit OTP to pending jobs and relay to cPanel Host Secretary
      if (extracted) {
        await clientStorage.relayMobileOtpToHost(extracted);
        const jobs = await clientStorage.getJobs();
        const waitingJob = jobs.find((j) => j.status === 'waiting_otp');
        if (waitingJob) {
          await clientStorage.submitOtp(waitingJob.id, extracted);
        }
        await fetchMobileData();
      }

      const title = '🔑 دریافت خودکار کد تایید پیامکی (OTP)';
      const msg = `کد تایید ${extracted || 'ارسال‌شده'} از پیامک تلفن 09153108763 استخراج و در نوبت انتشار درج شد.`;

      const newNotif = await clientStorage.sendMobilePushNotification(
        title,
        msg,
        'otp_required',
        testSmsSender
      );
      const nextNotifs = [newNotif, ...notifications];
      setNotifications(nextNotifs);
      showRealBrowserNotification(title, msg);
      if (config) broadcastStatusUpdate(config, nextNotifs);
    } catch (e) {
      console.error('SMS simulation failed:', e);
    } finally {
      setSimulatingSms(false);
    }
  };

  const handleSimulateGmailFromPhone = async () => {
    if (!testGmailBody && !testGmailSubject) return;
    setSimulatingGmail(true);
    try {
      const fullText = `${testGmailSubject} ${testGmailBody}`;
      const codeMatch = fullText.match(/\b\d{4,8}\b/);
      const extracted = codeMatch ? codeMatch[0] : undefined;

      const linkMatch = fullText.match(/https?:\/\/[^\s]+/);
      const extractedLink = linkMatch ? linkMatch[0] : undefined;

      const newPayload: EmailWebhookPayload = {
        id: `eml_${Date.now()}`,
        from: testGmailSender,
        subject: testGmailSubject,
        body: testGmailBody,
        verificationLink: extractedLink,
        receivedAt: new Date().toLocaleTimeString('fa-IR'),
        status: 'parsed',
      };

      await clientStorage.addEmailLog(newPayload);
      setEmailLogs((prev) => [newPayload, ...prev]);

      // Auto-submit OTP to pending jobs and relay to cPanel Host Secretary
      if (extracted) {
        await clientStorage.relayMobileOtpToHost(extracted);
        const jobs = await clientStorage.getJobs();
        const waitingJob = jobs.find((j) => j.status === 'waiting_otp');
        if (waitingJob) {
          await clientStorage.submitOtp(waitingJob.id, extracted);
        }
        await fetchMobileData();
      }

      const title = '📧 دریافت ایمیل تایید و کد هویت (Gmail)';
      const msg = `کد تایید ${extracted || 'لینک تایید'} از ایمیل دریافتی استخراج گردید.`;

      const newNotif = await clientStorage.sendMobilePushNotification(
        title,
        msg,
        'otp_required',
        'جیمیل / ایمیل'
      );
      const nextNotifs = [newNotif, ...notifications];
      setNotifications(nextNotifs);
      showRealBrowserNotification(title, msg);
      if (config) broadcastStatusUpdate(config, nextNotifs);
    } catch (e) {
      console.error('Gmail simulation failed:', e);
    } finally {
      setSimulatingGmail(false);
    }
  };

  const handleDownloadApkFile = () => {
    const apkUrl = '/downloads/Ashk24_OTP_Companion_v3.9.3.apk';
    const a = document.createElement('a');
    a.href = apkUrl;
    a.download = 'Ashk24_OTP_Companion_v3.9.3.apk';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadSuccess('apk');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const handleDownloadAndroidProjectZip = () => {
    const zipUrl = '/downloads/Ashk24_Android_Project_v3.9.3.zip';
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = 'Ashk24_Android_Project_v3.9.3.zip';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadSuccess('project_zip');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const handleDownloadMacroDroidRule = () => {
    const ruleUrl = '/downloads/Ashk24_MacroDroid_Relay.json';
    const a = document.createElement('a');
    a.href = ruleUrl;
    a.download = 'Ashk24_MacroDroid_Relay.json';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadSuccess('macrodroid');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setDownloadSuccess('pwa_installed');
      }
    } else {
      showRealBrowserNotification(
        '📱 راهنمای نصب وب‌اپلیکیشن روی گوشی',
        'در مرورگر Chrome گوشی، منوی ۳ نقطه را باز کرده و گزینه «افزودن به صفحه اصلی / Install app» را انتخاب نمایید.'
      );
      setDownloadSuccess('pwa_hint');
    }
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const copyToClipboard = (text: string, setCopiedFn: (val: boolean) => void) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedFn(true);
      setTimeout(() => setCopiedFn(false), 3000);
    }
  };

  const kotlinBridgeCode = `// Ashk24 SmsOtpBridgeReceiver.kt - سنسور هوشمند پیامک و جیمیل
package ir.ashkghalam.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsMessage
import java.net.HttpURLConnection
import java.net.URL

class SmsOtpBridgeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "android.provider.Telephony.SMS_RECEIVED") {
            val bundle = intent.extras
            val pdus = bundle?.get("pdus") as Array<*>?
            if (pdus != null) {
                for (pdu in pdus) {
                    val sms = SmsMessage.createFromPdu(pdu as ByteArray)
                    val sender = sms.originatingAddress ?: "3000"
                    val messageBody = sms.messageBody ?: ""

                    // ارسال آنی پیامک OTP به وب‌هوک سامانه اشک ۲۴
                    Thread {
                        try {
                            val url = URL("${window.location.origin}/cpanel-backend/api/index.php?route=webhooks/sms")
                            val conn = url.openConnection() as HttpURLConnection
                            conn.requestMethod = "POST"
                            conn.setRequestProperty("Content-Type", "application/json")
                            conn.doOutput = true
                            val jsonPayload = """{"senderNumber":"$sender", "receiverNumber":"09153108763", "messageText":"$messageBody"}"""
                            conn.outputStream.write(jsonPayload.toByteArray())
                            conn.responseCode
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }.start()
                }
            }
        }
    }
}`;

  return (
    <div className="space-y-6">
      {/* Top Banner explaining mobile app role & quick direct actions */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950 border border-amber-500/20 text-slate-100 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3 space-x-reverse">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <h1 className="text-xl font-bold text-slate-100">
                  برنامه اختصاصی همراه اندروید، سنسور OTP و خوانش جیمیل
                </h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  نسخه ۱.۰.۶ آماده
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                دریافت و استخراج خودکار کدهای تایید پیامک (OTP) به شماره ۰۹۱۵۳۱۰۸۷۶۳، پایش ایمیل‌های تایید جیمیل و ارسال نوتیفیکیشن لحظه‌ای وضعیت انتشار آگهی‌ها.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <SmartHelpButton
              content={{
                title: 'همراه وب و پایشگر کدهای OTP پیامک',
                summary: 'این بخش دریافت خودکار پیامک‌های OTP و ایمیل‌های تایید ورود به وب‌سایت‌ها را مدیریت می‌کند.',
                steps: [
                  'از پایشگر زنده برای بررسی استخراج کدهای تایید 5 تا 8 رقمی پیامک استفاده کنید.',
                  'نیازی به فایل غیر استاندارد APK نیست؛ با افزودن به صفحه اصلی مرورگر (PWA) تمام قابلیت‌های نوتیفیکیشن فعال می‌شوند.',
                  'کدهای استخراج شده بلافاصله به نوبت‌های در انتظار انتشار ارسال می‌گردند.'
                ],
                offlineNote: 'سیستم ثبت و استخراج OTP روی تمامی هاست‌های cPanel و سرورهای معمولی بدون محدودیت قابل اجراست.'
              }}
            />
            <button
              onClick={fetchMobileData}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700 transition-colors"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3 Core Operational Points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 space-x-reverse font-bold text-amber-400">
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>استخراج خودکار کد OTP پیامک</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              سنسور همراه پیامک‌های ورود از دیوار، شیپور، ایستگاه و باما را به صورت لحظه‌ای خوانده و کد تایید ۵ تا ۸ رقمی را به نوبت انتشار می‌رساند.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 space-x-reverse font-bold text-indigo-400">
              <Mail className="w-4 h-4 shrink-0" />
              <span>پایش و دریافت تاییدیه جیمیل</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              لینک‌ها و کدهای تایید ارسال‌شده به ایمیل‌های شرکت (info@ashkghalam.ir یا Gmail) به صورت خودکار شناسایی و اعتبارسنجی می‌شوند.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 space-x-reverse font-bold text-emerald-400">
              <Bell className="w-4 h-4 shrink-0" />
              <span>گزارش Push روی صفحه قفل گوشی</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              گزارش ثبت موفق آگهی‌ها، نردبان و تمدید ۳۰ روزه به صورت اعلان فوری و نوتیفیکیشن بدون تاخیر روی گوشی شما ارسال می‌شود.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('host_bridge')}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
            activeTab === 'host_bridge'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>پل منشی ۲۴ ساعته هاست و توکن سشن</span>
          {pendingHostOtps.length > 0 && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('otp_checker')}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'otp_checker'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>پایشگر زنده کدهای OTP پیامک و جیمیل</span>
        </button>

        <button
          onClick={() => setActiveTab('apk_download')}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'apk_download'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>دانلود APK و نصب مستقیم PWA</span>
        </button>

        <button
          onClick={() => setActiveTab('smart_guide')}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'smart_guide'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>راهنمای هوشمند گام‌به‌گام اتصال</span>
        </button>

        <button
          onClick={() => setActiveTab('emulator')}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'emulator'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>شبیه‌ساز گوشی و نوتیفیکیشن‌ها</span>
        </button>

        <button
          onClick={() => setActiveTab('pairing')}
          className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'pairing'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>تنظیمات جفت‌سازی و وب‌هوک</span>
        </button>
      </div>

      {/* TAB: Host Secretary Bridge */}
      {activeTab === 'host_bridge' && (
        <div className="space-y-6">
          {/* Pending OTP Alert Banner */}
          {pendingHostOtps.length > 0 ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-slate-900 border border-red-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-red-400 animate-pulse shrink-0" />
                  <span>نوبت‌های در انتظار تایید OTP در هاست سی‌پنل ({toPersianDigits(pendingHostOtps.length)} نوبت)</span>
                </div>
                <SmartHelpButton
                  content={{
                    title: 'تایید فوری OTP منشی هاست',
                    summary: 'هنگامی که منشی خودکار کران‌جاب سی‌پنل به مرحله ورود به دیوار یا شیپور می‌رسد، نوبت در حالت waiting_otp قرار می‌گیرد.',
                    steps: [
                      'پیامک ارسالی دیوار/شیپور روی گوشی شما دریافت می‌شود.',
                      'سنسور برنامه همراه یا نوتیفیکیشن دریافتی کد را شناسایی می‌کند.',
                      'با یک لمس بر روی دکمه «تایید و ارسال به هاست»، منشی بلافاصله کار انتشار را تکمیل می‌نماید.'
                    ],
                    offlineNote: 'این عملیات از طریق وب‌هوک مستقیم سی‌پنل اجرا شده و به هیچ سرور خارجی متکی نیست.'
                  }}
                />
              </div>

              <div className="space-y-3">
                {(pendingHostOtps || []).map((job) => (
                  <div key={job.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{job.title || 'آگهی بدون عنوان'}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono">
                          {job.platformDomain || job.platformId}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{job.currentStep || 'در انتظار دریافت کد تایید پیامک'}</p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <input
                        type="text"
                        placeholder="کد OTP دریافتی"
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono text-center w-32 outline-none focus:border-amber-500"
                        id={`otp_input_${job.id}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(`otp_input_${job.id}`) as HTMLInputElement | null;
                          if (el && el.value.trim()) {
                            handleRelayOtp(el.value.trim(), job.id);
                          }
                        }}
                        disabled={isRelayingOtp}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shrink-0"
                      >
                        {isRelayingOtp ? 'در حال ارسال...' : 'ارسال به هاست ✓'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-emerald-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 space-x-reverse text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>کلیه نوبت‌های منشی هاست در وضعیت پایدار هستند و در حال حاضر نوبت معلقی منتظر OTP نیست.</span>
              </div>
              <button
                type="button"
                onClick={fetchMobileData}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-400 text-xs transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>بررسی مجدد</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: One-Tap OTP Manual Relay */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-sm">
                  <KeyRound className="w-5 h-5 shrink-0" />
                  <span>انتقال سریع و دستی کد OTP به منشی هاست</span>
                </div>
                <SmartHelpButton
                  content={{
                    title: 'انتقال ۱-لمسی کد تایید',
                    summary: 'اگر پیامک را روی گوشی مشاهده کردید یا نوتیفیکیشن برای شما آمد، می‌توانید کد را اینجا تایپ یا پیست کنید تا منشی کران‌جاب فورا آن را بردارد.',
                    steps: [
                      'کد ۴ تا ۸ رقمی را وارد کنید.',
                      'روی دکمه «تایید و ارسال به منشی هاست» بزنید.',
                      'کد بلافاصله در دیتابیس سی‌پنل ذخیره شده و آگهی منتشر می‌شود.'
                    ]
                  }}
                />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                اگر کد تایید پیامک را روی گوشی خود دریافت کرده‌اید، با وارد کردن آن در کادر زیر، مستقیما به منشی ۲۴ ساعته مستقر در هاست تحویل داده می‌شود.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">کد تایید پیامکی (OTP):</label>
                  <input
                    type="text"
                    value={manualOtpInput}
                    onChange={(e) => setManualOtpInput(e.target.value)}
                    placeholder="مثلا: 849201"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-center text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>

                {relayFeedback && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs text-emerald-400">
                    {relayFeedback}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRelayOtp()}
                  disabled={isRelayingOtp || !manualOtpInput.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isRelayingOtp ? 'در حال ارسال به هاست...' : 'تایید و ارسال آنی به منشی هاست'}</span>
                </button>
              </div>
            </div>

            {/* Box 2: Session Token Sync (Autonomous Zero-OTP Mode) */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 space-x-reverse text-indigo-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>همگام‌سازی توکن سشن (حذف دائمی نیاز به OTP)</span>
                </div>
                <SmartHelpButton
                  content={{
                    title: 'حالت خودکار بدون نیاز به OTP با سشن توکن',
                    summary: 'با یک‌بار لاگین در دیوار یا شیپور و ذخیره توکن سشن در هاست سی‌پنل، منشی ۲۴ ساعته تا ماه‌ها بدون نیاز به دریافت کد پیامک، آگهی‌ها را ثبت می‌کند.',
                    steps: [
                      'پلتفرم مورد نظر (مانند دیوار یا شیپور) را انتخاب کنید.',
                      'توکن سشن یا کلید کوکی ورود خود را وارد نمایید.',
                      'روی دکمه ذخیره کلیک کنید. کران‌جاب هاست مستقیما با هدر Authorization فعالیت خواهد کرد.'
                    ],
                    offlineNote: 'توکن‌ها مستقیما در فایل امن دیتابیس سی‌پنل شما نگهداری شده و دسترسی بیرونی ندارند.'
                  }}
                />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                بهترین روش برای خودکارسازی ۱۰۰٪ منشی: با ذخیره یکباره توکن سشن، ربات هاست سی‌پنل دیگر برای هر انتشار پیامک ارسال نکرده و بدون دخالت کاربر آگهی‌ها را ثبت می‌کند.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">انتخاب پلتفرم هدف:</label>
                  <select
                    value={selectedPlatformForSync}
                    onChange={(e) => setSelectedPlatformForSync(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  >
                    <option value="plat_divar">دیوار (Divar.ir)</option>
                    <option value="plat_sheypoor">شیپور (Sheypoor.com)</option>
                    <option value="plat_istgah">ایستگاه (Istgah.com)</option>
                    <option value="plat_niazerooz">نیاز روز (Niazerooz.com)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">توکن نشست (Bearer Session Token):</label>
                  <input
                    type="text"
                    value={sessionTokenInput}
                    onChange={(e) => setSessionTokenInput(e.target.value)}
                    placeholder="مثلا: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                {tokenSyncFeedback && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs text-emerald-400">
                    {tokenSyncFeedback}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSyncSessionToken}
                  disabled={isSyncingToken || !sessionTokenInput.trim()}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSyncingToken ? 'در حال ذخیره توکن...' : 'ذخیره سشن دائمی در هاست سی‌پنل'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: APK Download & PWA Install */}
      {activeTab === 'apk_download' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-base">
              <Download className="w-5 h-5 shrink-0" />
              <span>دانلود برنامه اختصاصی اندروید (APK) و روش‌های اتصال گوشی</span>
            </div>
            <SmartHelpButton
              content={{
                title: 'راهنمای دریافت برنامه همراه و اتصال به هاست',
                summary: 'سامانه اشک ۲۴ سه روش قدرتمند و بدون قطعی برای اتصال گوشی اندروید به هاست ارائه می‌دهد.',
                steps: [
                  'روش ۱ (سریع‌ترین): فایل نصبی APK را مستقیما دانلود و روی گوشی نصب کنید.',
                  'روش ۲ (بدون فایل): وب‌اپلیکیشن (PWA) را با یک کلیک روی صفحه اصلی گوشی اضافه کنید.',
                  'روش ۳ (خودکارسازی پیامک): فایل تنظیمات MacroDroid را دانلود و در برنامه MacroDroid درون‌ریزی کنید تا هر پیامک به وب‌هوک هاست فوروارد شود.',
                  'روش ۴ (برنامه‌نویسان): سورس کامل پروژه اندروید استودیو را دانلود و کامپایل نمایید.'
                ],
                offlineNote: 'کلیه ارتباطات از طریق وب‌هوک اختصاصی هاست شما بدون وابستگی به سرورهای خارجی انجام می‌شود.'
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Dedicated Native Android APK Package */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 bg-amber-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-br-xl">
                فایل نصبی مستقیم APK
              </div>
              <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-sm">
                <FileCode className="w-5 h-5 shrink-0" />
                <span>دانلود مستقیم فایل نصبی اندروید (APK)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                فایل نصبی اندروید اشک ۲۴ با فرمت استاندارد APK شامل سنسور پیشرفته پیامک، شنودگر جیمیل و برودکست‌ریسیور پس‌زمینه بدون نیاز به باز بودن مرورگر.
              </p>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>نسخه پکیج:</span>
                  <span className="text-amber-400 font-bold">3.9.3 (Release Build)</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>سرویس‌های تعبیه‌شده:</span>
                  <span className="text-emerald-400 font-bold">SMS Receiver + Background Sync</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>تلفن هدف پایش:</span>
                  <span className="text-slate-200 font-mono">09153108763</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleDownloadApkFile}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 space-x-reverse"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadSuccess === 'apk' ? '✓ فایل APK دانلود شد' : 'دانلود فایل نصبی APK (نسخه ۳.۹.۳)'}</span>
                </button>
                <a
                  href="/downloads/Ashk24_OTP_Companion_v3.9.3.apk"
                  download="Ashk24_OTP_Companion_v3.9.3.apk"
                  className="text-center text-[11px] text-amber-400 hover:underline pt-1"
                >
                  لینک مستقیم دانلود مستقیم فایل: Ashk24_OTP_Companion_v3.9.3.apk
                </a>
              </div>
            </div>

            {/* Box 2: Instant PWA Install on Android / iOS */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse text-indigo-400 font-bold text-sm">
                <Smartphone className="w-5 h-5 shrink-0" />
                <span>نصب فوری وب‌اپلیکیشن (PWA / WebAPK) روی گوشی</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                بدون نیاز به دانلود فایل APK، با یک کلیک آیکون اختصاصی سامانه اشک ۲۴ را مانند یک برنامه بومی روی صفحه اصلی گوشی اندروید یا آیفون خود قرار دهید.
              </p>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="font-bold text-indigo-400">راهنمای نصب سریع روی گوشی:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
                  <li>آدرس سامانه را در مرورگر Chrome گوشی باز کنید.</li>
                  <li>دکمه زیر را بزنید یا در منوی مرورگر گزینه <strong className="text-amber-400">«افزودن به صفحه اصلی / Install App»</strong> را لمس کنید.</li>
                  <li>سامانه به عنوان اپلیکیشن دائمی بدون نوار آدرس روی گوشی فعال می‌شود.</li>
                </ol>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 space-x-reverse"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{downloadSuccess === 'pwa_installed' ? '✓ وب‌اپلیکیشن با موفقیت نصب شد' : 'نصب مستقیم وب‌اپلیکیشن روی صفحه اصلی گوشی'}</span>
                </button>
                <button
                  type="button"
                  onClick={requestBrowserNotificationPermission}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>فعال‌سازی نوتیفیکیشن‌های آنی روی صفحه قفل ({notificationPermission === 'granted' ? 'فعال است ✓' : 'درخواست مجوز'})</span>
                </button>
              </div>
            </div>

            {/* Box 3: 1-Click MacroDroid & Tasker Auto Forwarder */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse text-emerald-400 font-bold text-sm">
                <Zap className="w-5 h-5 shrink-0" />
                <span>تنظیمات ۱-کلیکی انتقال خودکار پیامک با MacroDroid</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                آسان‌ترین روش برای ارسال خودکار پیامک‌ها به هاست بدون نیاز به فعال‌سازی دولوپر مود: کافیست MacroDroid را روی گوشی نصب و این فایل را درون‌ریزی کنید.
              </p>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>وب‌هوک مقصد:</span>
                  <span className="text-emerald-400 font-mono text-[10px]">{`${window.location.origin}/cpanel-backend/api/index.php?route=webhooks/sms`}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>فرمت انتقال:</span>
                  <span className="text-slate-200 font-mono">JSON POST Webhook</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadMacroDroidRule}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 space-x-reverse"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadSuccess === 'macrodroid' ? '✓ فایل ماکرو دانلود شد' : 'دانلود رول انتقال پیامک MacroDroid (JSON)'}</span>
                </button>
              </div>
            </div>

            {/* Box 4: Full Android Studio Project Source ZIP */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse text-slate-200 font-bold text-sm">
                <FileCode className="w-5 h-5 shrink-0 text-amber-400" />
                <span>سورس کامل پروژه اندروید استودیو (Gradle + Kotlin)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                پروژه کامل سورس‌کد اندروید استودیو شامل کلیه لایبری‌های OkHttp، کلا‌س‌های ریسیور، مانیفست و سرویس‌های پس‌زمینه آماده بیلد اختصاصی.
              </p>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>زبان و پلتفرم:</span>
                  <span className="text-slate-200 font-bold">Kotlin / Android SDK 34</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>معماری شبکه:</span>
                  <span className="text-amber-400 font-bold">OkHttp Background Coroutines</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadAndroidProjectZip}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 space-x-reverse"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadSuccess === 'project_zip' ? '✓ پروژه دانلود شد' : 'دانلود سورس پروژه کامل اندروید (ZIP)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Android Kotlin Source Preview */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse text-emerald-400 font-bold text-sm">
                <Sparkles className="w-5 h-5 shrink-0" />
                <span>سورس کد بومی سنسور پیامک و جیمیل (SmsOtpBridgeReceiver.kt)</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(kotlinBridgeCode, setCopiedKotlin)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-amber-400 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {copiedKotlin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKotlin ? 'کپی شد' : 'کپی سورس کد'}</span>
              </button>
            </div>
            <pre dir="ltr" className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              {kotlinBridgeCode}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: Live SMS & Gmail OTP Inspector */}
      {activeTab === 'otp_checker' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-base">
              <KeyRound className="w-5 h-5 shrink-0" />
              <span>پایش و آزمون بلادرنگ کدهای تایید (SMS و Gmail OTP)</span>
            </div>
            <SmartHelpButton
              content={{
                title: 'راهنمای سنسور هوشمند پیامک و جیمیل',
                summary: 'این بخش کدهای تایید ارسال‌شده به شماره همراه و ایمیل سامانه را با موتور محلیRegex استخراج کرده و لاگ می‌کند.',
                steps: [
                  'پیامک‌های دریافتی به طور خودکار فیلتر شده و کدهای ۴ تا ۸ رقمی آن استخراج می‌شود.',
                  'کدهای تایید جیمیل نیز بدون نیاز به ورود به اکانت در صف قرار می‌گیرند.',
                  'برای تست عملکرد، می‌توانید یک پیامک نمونه را در کادر زیر وارد کرده و دکمه استخراج را بزنید.'
                ],
                offlineNote: 'استخراج الگوها به صورت صددرصد آفلاین با الگوریتم‌های منظم محلی انجام می‌شود.'
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SMS OTP Interceptor & Simulator */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-sm">
                <Smartphone className="w-5 h-5 shrink-0" />
                <span>سنسور و آزمون دریافت پیامک OTP (SMS)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                پیامک‌های دریافتی به شماره 09153108763 را پایش و به صورت خودکار کد ۵ تا ۸ رقمی را استخراج می‌کند.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">سرشماره فرستنده:</label>
                  <input
                    type="text"
                    value={testSmsSender}
                    onChange={(e) => setTestSmsSender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                    placeholder="300099"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">متن پیامک حاوی کد:</label>
                  <input
                    type="text"
                    value={testSmsText}
                    onChange={(e) => setTestSmsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                    placeholder="کد تایید شما: 849201"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleSimulateSmsFromPhone}
                    disabled={simulatingSms}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center space-x-2 space-x-reverse"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{simulatingSms ? 'در حال استخراج...' : 'دریافت و استخراج آنی کد پیامک'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Gmail OTP & Confirmation Link Interceptor */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse text-indigo-400 font-bold text-sm">
                <Mail className="w-5 h-5 shrink-0" />
                <span>سنسور و شنودگر ایمیل تایید و جیمیل (Gmail)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                ایمیل‌های تایید ارسال‌شده به info@ashkghalam.ir یا جیمیل را بررسی و کدهای ورود یا لینک‌های فعال‌سازی را استخراج می‌کند.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">فرستنده ایمیل:</label>
                    <input
                      type="text"
                      value={testGmailSender}
                      onChange={(e) => setTestGmailSender(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      placeholder="accounts@google.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">موضوع ایمیل:</label>
                    <input
                      type="text"
                      value={testGmailSubject}
                      onChange={(e) => setTestGmailSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      placeholder="کد تایید ورود"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">متن ایمیل دریافتی:</label>
                  <input
                    type="text"
                    value={testGmailBody}
                    onChange={(e) => setTestGmailBody(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                    placeholder="کد تایید ورود شما: 382914"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleSimulateGmailFromPhone}
                    disabled={simulatingGmail}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 space-x-reverse"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{simulatingGmail ? 'در حال پایش جیمیل...' : 'بررسی و استخراج کد از جیمیل'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Code History Stream (SMS & Gmail) */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse text-emerald-400 font-bold text-sm">
                <KeyRound className="w-5 h-5 shrink-0" />
                <span>تاریخچه کدهای استخراج‌شده از پیامک و ایمیل</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {toPersianDigits(smsLogs.length + emailLogs.length)} مورد ثبت‌شده
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SMS List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>پیامک‌های دریافتی گوشی (۰۹۱۵۳۱۰۸۷۶۳)</span>
                </div>
                {(!smsLogs || smsLogs.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    پیامکی هنوز ثبت نشده است.
                  </div>
                ) : (
                  (smsLogs || []).slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-bold">فرستنده: {log.senderNumber}</span>
                        <span className="text-slate-500 font-mono">{log.receivedAt}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{log.messageText}</p>
                      {log.extractedCode && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                          <span className="text-emerald-400 font-bold font-mono">
                            کد استخراج‌شده: {log.extractedCode}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            تایید خودکار ✓
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Email List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span>ایمیل‌های دریافتی جیمیل و سازمانی</span>
                </div>
                {(!emailLogs || emailLogs.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    ایمیلی ثبت نشده است.
                  </div>
                ) : (
                  (emailLogs || []).slice(0, 5).map((eml) => (
                    <div
                      key={eml.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-bold">{eml.from}</span>
                        <span className="text-slate-500 font-mono">{eml.receivedAt}</span>
                      </div>
                      <p className="text-slate-200 font-medium text-[11px]">{eml.subject}</p>
                      <p className="text-slate-400 text-[10px] leading-relaxed truncate">{eml.body}</p>
                      {eml.verificationLink && (
                        <div className="pt-1 border-t border-slate-800/80">
                          <a
                            href={eml.verificationLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>لینک فعال‌سازی: {eml.verificationLink}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Smart Step-by-Step AI Guide */}
      {activeTab === 'smart_guide' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-sm">
              <Sparkles className="w-5 h-5 shrink-0" />
              <span>راهنمای هوشمند گام‌به‌گام اتصال جیمیل و دریافت پیامک‌های OTP</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              با طی کردن ۴ گام ساده زیر، سیستم دریافت کدهای تایید و جیمیل به صورت ۱۰۰٪ خودکار فعال می‌شود:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse font-bold text-xs text-amber-400">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 text-xs">
                    ۱
                  </span>
                  <span>نصب برنامه همراه اندروید یا افزودن PWA</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  از تب «دانلود APK» فایل بسته را دریافت کرده یا با گزینه Add to Home Screen در مرورگر گوشی، برنامه را به صفحه اصلی اضافه نمایید.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse font-bold text-xs text-indigo-400">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-xs">
                    ۲
                  </span>
                  <span>اعطای مجوز خوانش پیامک‌ها (SMS Listener)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  در برنامه همراه یا ابزارهای فوروارد پیامک (مثل SMS Forwarder)، شماره گیرنده را ۰۹۱۵۳۱۰۸۷۶۳ و آدرس وب‌هوک را مشخص کنید.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse font-bold text-xs text-emerald-400">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 text-xs">
                    ۳
                  </span>
                  <span>تنظیم فیلتر هدایت خودکار ایمیل‌های جیمیل (Gmail Filter)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  در تنظیمات جیمیل (Forwarding and POP/IMAP) یک فیلتر برای ایمیل‌های حاوی «کد تایید» یا «دیوار/شیپور/ایستگاه» به وب‌هوک سامانه اضافه کنید.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse font-bold text-xs text-blue-400">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-xs">
                    ۴
                  </span>
                  <span>تست آنی و پایش نوبت‌های انتشار</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  از تب «پایشگر زنده» دکمه تست را بزنید. کد استخراج‌شده بلافاصله به نوبت‌های در انتظار متصل شده و آگهی منتشر می‌شود.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Live Mobile Emulator & Push Notification Stream */}
      {activeTab === 'emulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mobile Screen Mockup */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start">
            <div className="w-full max-w-[340px] bg-slate-950 border-4 border-slate-800 rounded-[40px] p-4 shadow-2xl relative overflow-hidden flex flex-col min-h-[580px]">
              <div className="w-28 h-4 bg-slate-800 rounded-b-xl mx-auto mb-3 flex items-center justify-center space-x-2 space-x-reverse">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700"></div>
                <div className="w-8 h-1 rounded-full bg-slate-900"></div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 pb-2 border-b border-slate-900">
                <span className="font-semibold text-slate-200">14:04</span>
                <div className="flex items-center space-x-1.5 space-x-reverse">
                  <span>5G IRANCELL</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-3 font-sans">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> اشک ۲۴ همراه
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      آنلاین
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {config?.deviceName || 'تلفن همراه اشک قلم (09153108763)'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 space-x-reverse">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>شناساگر پیامک OTP: فعال و آماده</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider flex items-center justify-between">
                    <span>اعلان‌های نوتیفیکیشن دریافت شده</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded">
                      {toPersianDigits((notifications || []).length)} اعلان
                    </span>
                  </div>

                  {(!notifications || notifications.length === 0) ? (
                    <div className="p-6 text-center text-slate-500 text-[11px] rounded-xl border border-dashed border-slate-800">
                      هنوز اولینی نوتیفیکیشنی دریافت نشده است.
                    </div>
                  ) : (
                    (notifications || []).map((notif) => (
                      <div
                        key={notif.id}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md text-right space-y-1 transform transition-all hover:border-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-100 flex items-center gap-1">
                            {notif.title}
                          </span>
                          <span className="text-[9px] text-slate-500">{notif.timestamp}</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">{notif.message}</p>
                        {notif.platformName && (
                          <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-800/60 text-amber-400">
                            <span>پلتفرم: {notif.platformName}</span>
                            <span className="text-emerald-400">ارسال به گوشی ✓</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-900 text-center">
                <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto"></div>
              </div>
            </div>
          </div>

          {/* Right Side: Interactive Push Notification Test Tools */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 space-x-reverse text-emerald-400 font-bold text-sm">
                  <Bell className="w-5 h-5 shrink-0" />
                  <span>فعال‌سازی نوتیفیکیشن واقعی سیستم‌عامل (Web Push)</span>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                    notificationPermission === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {notificationPermission === 'granted' ? 'فعال شد ✓' : 'غیرفعال'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                با اعطای مجوز مرورگر، اعلان‌ها بدون تاخیر روی سیستم‌عامل یا گوشی شما ظاهر خواهند شد.
              </p>

              {notificationPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={requestBrowserNotificationPermission}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center space-x-2 space-x-reverse"
                >
                  <Bell className="w-4 h-4" />
                  <span>کلیک جهت درخواست مجوز نوتیفیکیشن مرورگر</span>
                </button>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-sm">
                <Send className="w-5 h-5 shrink-0" />
                <span>ارسال دستی نوتیفیکیشن آزمایشی به گوشی</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">عنوان اعلان:</label>
                  <input
                    type="text"
                    value={testPushTitle}
                    onChange={(e) => setTestPushTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">متن اعلان:</label>
                  <textarea
                    rows={2}
                    value={testPushMsg}
                    onChange={(e) => setTestPushMsg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 space-x-reverse pt-1">
                  <button
                    type="button"
                    onClick={handleSendTestPush}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center space-x-2 space-x-reverse shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال نوتیفیکیشن آزمایشی</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Device Pairing & Configuration */}
      {activeTab === 'pairing' && config && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-base">
              <QrCode className="w-5 h-5 shrink-0" />
              <span>جفت‌سازی دستگاه و تنظیمات وب‌هوک گوشی همراه</span>
            </div>
            <SmartHelpButton
              content={{
                title: 'راهنمای اتصال و جفت‌سازی گوشی',
                summary: 'کلید احراز هویت و آدرس وب‌هوک اختصاصی به گوشی شما امکان ارسال مستقیم پیامک‌های دریافتی را بدون واسطه می‌دهد.',
                steps: [
                  'آدرس وب‌هوک زیر را در برنامه اندروید، MacroDroid یا Tasker وارد کنید.',
                  'کلید امنیتی API Key را جهت تایید اصالت ارتباط در هدر یا بدنه ارسال کنید.',
                  'کد جفت‌سازی سریع را جهت اتصال آنی اپلیکیشن به کار ببرید.'
                ],
                offlineNote: 'ارتباطات مستقیماً با سرور سی‌پنل و بدون عبور از هیچ سرور ثانویه‌ای ایمن و رمزشده برقرار می‌شود.'
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-sm">
              <QrCode className="w-5 h-5 shrink-0" />
              <span>کد اتصال و جفت‌سازی سریع گوشی (Pairing)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              این کد را در برنامه همراه موبایل وارد کنید تا اتصال مستقیم و احراز هویت بین گوشی و سامانه برقرار گردد.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <div className="text-xs text-slate-400">کد جفت‌سازی فعال:</div>
              <div className="text-2xl font-mono font-bold text-amber-400 tracking-widest">
                {config.pairingCode}
              </div>
              <div className="text-[10px] text-slate-500">
                تاریخ آخرین اتصال: {new Date(config.lastConnectedAt || Date.now()).toLocaleDateString('fa-IR')}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs text-slate-300 font-medium block">
                کلید API اختصاصی اپلیکیشن همراه (API Key):
              </label>
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="text"
                  readOnly
                  value={config.apiKey}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(config.apiKey, setCopiedKey)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-amber-400 text-xs font-medium transition-colors flex items-center gap-1"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? 'کپی شد' : 'کپی'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs text-slate-300 font-medium block">
                آدرس وب‌هوک دریافت پیامک‌ها:
              </label>
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/cpanel-backend/api/index.php?route=webhooks/sms`}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(`${window.location.origin}/cpanel-backend/api/index.php?route=webhooks/sms`, setCopiedWebhook)
                  }
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-amber-400 text-xs font-medium transition-colors flex items-center gap-1"
                >
                  {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWebhook ? 'کپی شد' : 'کپی'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse text-emerald-400 font-bold text-sm">
              <Sliders className="w-5 h-5 shrink-0" />
              <span>تنظیمات ارتباطی و نوتیفیکیشن‌ها</span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                <div>
                  <div className="font-semibold text-slate-200">خوانش و ارسال خودکار پیامک‌های OTP</div>
                  <div className="text-[10px] text-slate-400">استخراج و ارسال آنی کدهای تایید به سامانه</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoSmsInterceptEnabled}
                  onChange={() => handleToggleSetting('autoSmsInterceptEnabled')}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                <div>
                  <div className="font-semibold text-slate-200">ارسال Push Notification به گوشی</div>
                  <div className="text-[10px] text-slate-400">نمایش گزارش‌ها روی صفحه قفل موبایل</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.pushNotificationsEnabled}
                  onChange={() => handleToggleSetting('pushNotificationsEnabled')}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                <div>
                  <div className="font-semibold text-slate-200">اعلان ثبت نام‌های موفق در سایت‌ها</div>
                  <div className="text-[10px] text-slate-400">اطلاع‌رسانی هنگام ساخت حساب جدید در نیازمندی‌ها</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.notifyOnRegistration}
                  onChange={() => handleToggleSetting('notifyOnRegistration')}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                <div>
                  <div className="font-semibold text-slate-200">اعلان انتشار نهایی آگهی‌ها</div>
                  <div className="text-[10px] text-slate-400">ارسال لینک آگهی منتشر شده پس از تایید</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.notifyOnAdPublished}
                  onChange={() => handleToggleSetting('notifyOnAdPublished')}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </label>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};
