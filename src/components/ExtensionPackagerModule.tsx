import React, { useState } from 'react';
import {
  Package,
  Download,
  Copy,
  Check,
  Globe,
  FileCode,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Layers,
  Cpu,
  MonitorCheck,
  Zap,
  MousePointer,
  ShieldCheck,
  Compass,
  ArrowLeft,
  Eye,
  Key,
  FolderDown,
  Terminal,
  Play,
  Share2,
  ListFilter,
  Navigation,
  CheckSquare
} from 'lucide-react';
import { generateExtensionFiles, buildExtensionZip } from '../utils/extensionBuilder';
import { APP_VERSION } from '../config/version';
import { CompanyProfile, Campaign } from '../types/ashk24';

interface Props {
  company: CompanyProfile | null;
  campaigns: Campaign[];
  onTriggerDirectPublish?: (targetDomain: string, title: string) => void;
}

interface TargetPlatformOption {
  id: string;
  name: string;
  domain: string;
  homeUrl: string;
  postUrl: string;
  directButtonText: string;
  category: string;
  requiresOtp: boolean;
  detectedFields: string[];
}

export function ExtensionPackagerModule({ company, campaigns, onTriggerDirectPublish }: Props) {
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [showMainHelp, setShowMainHelp] = useState<boolean>(false);
  const [showDirectHelp, setShowDirectHelp] = useState<boolean>(false);
  const [showFilesHelp, setShowFilesHelp] = useState<boolean>(false);

  // Supported Platforms List with exact real root and entry URLs
  const platforms: TargetPlatformOption[] = [
    {
      id: 'niazpardaz',
      name: 'نیازپرداز (niazpardaz.com)',
      domain: 'niazpardaz.com',
      homeUrl: 'https://www.niazpardaz.com/',
      postUrl: 'https://www.niazpardaz.com/',
      directButtonText: 'ورود به سایت و کلیک هوشمند دکمه «درج آگهی رایگان»',
      category: 'خدمات و بسته‌بندی صنعتی',
      requiresOtp: false,
      detectedFields: ['شناسایی دکمه درج آگهی', 'عنوان آگهی', 'شرح کامل', 'تلفن تماس', 'آدرس/شهر', 'کلمات کلیدی', 'کپچا عددی'],
    },
    {
      id: 'payamsara',
      name: 'پیام‌سرا (payamsara.com)',
      domain: 'payamsara.com',
      homeUrl: 'https://www.payamsara.com/',
      postUrl: 'https://www.payamsara.com/',
      directButtonText: 'ورود به صفحه اصلی و تشخیص خودکار دکمه «درج آگهی»',
      category: 'تبلیغات صنعتی و نیازمندی‌ها',
      requiresOtp: false,
      detectedFields: ['شناسایی دکمه درج آگهی', 'عنوان', 'متن شرح', 'شماره تماس', 'گروه آگهی', 'تایید نهایی'],
    },
    {
      id: 'istgah',
      name: 'ایستگاه (istgah.com)',
      domain: 'istgah.com',
      homeUrl: 'https://www.istgah.com/',
      postUrl: 'https://www.istgah.com/sendad/',
      directButtonText: 'صفحه فرم ارسال آگهی (sendad)',
      category: 'صنعتی و بسته‌بندی',
      requiresOtp: false,
      detectedFields: ['عنوان آگهی', 'شرح و متن', 'شماره تماس', 'ایمیل', 'استان/شهر', 'کد امنیتی کپچا', 'دکمه ثبت'],
    },
    {
      id: 'divar',
      name: 'دیوار (divar.ir)',
      domain: 'divar.ir',
      homeUrl: 'https://divar.ir/',
      postUrl: 'https://divar.ir/new',
      directButtonText: 'صفحه ثبت آگهی جدید دیوار (/new)',
      category: 'خدمات و تولیدی',
      requiresOtp: true,
      detectedFields: ['دسته‌بندی', 'شهر/محدوده', 'عکس‌ها', 'عنوان آگهی', 'توضیحات کامل', 'شماره موبایل', 'دکمه تایید'],
    },
    {
      id: 'sheypoor',
      name: 'شیپور (sheypoor.com)',
      domain: 'sheypoor.com',
      homeUrl: 'https://www.sheypoor.com/',
      postUrl: 'https://www.sheypoor.com/post-listing',
      directButtonText: 'صفحه ثبت آگهی رایگان شیپور (/post-listing)',
      category: 'کسب‌وکار و صنعت',
      requiresOtp: true,
      detectedFields: ['گروه شغلی', 'عکس‌های محصول', 'عنوان', 'متن آگهی', 'قیمت/تعرفه', 'موبایل و شهر'],
    },
    {
      id: 'rahnama',
      name: 'راهنما همشهری (rahnama.com)',
      domain: 'rahnama.com',
      homeUrl: 'https://www.rahnama.com/',
      postUrl: 'https://www.rahnama.com/',
      directButtonText: 'صفحه اصلی و تشخیص دکمه ثبت آگهی',
      category: 'خدمات و بسته‌بندی',
      requiresOtp: false,
      detectedFields: ['عنوان', 'متن آگهی', 'تلفن و موبایل', 'استان تهران', 'ثبت نهایی'],
    },
    {
      id: 'niazerooz',
      name: 'نیاز روز (niazerooz.com)',
      domain: 'niazerooz.com',
      homeUrl: 'https://www.niazerooz.com/',
      postUrl: 'https://www.niazerooz.com/',
      directButtonText: 'ورود به صفحه اصلی و تشخیص خودکار دکمه «ثبت آگهی»',
      category: 'دایرکتوری مشاغل و تبلیغات',
      requiresOtp: false,
      detectedFields: ['عنوان آگهی', 'متن آگهی', 'شماره تماس', 'شهر', 'دکمه ثبت'],
    },
    {
      id: 'agahi24',
      name: 'آگهی ۲۴ (agahi24.com)',
      domain: 'agahi24.com',
      homeUrl: 'https://agahi24.com/',
      postUrl: 'https://agahi24.com/',
      directButtonText: 'ورود به درگاه آگهی ۲۴ و هدایت خودکار فرم',
      category: 'نیازمندی‌های رایگان اینترنتی',
      requiresOtp: false,
      detectedFields: ['عنوان', 'شرح کامل', 'موبایل', 'استان/شهر', 'کپچا'],
    },
    {
      id: 'custom',
      name: 'سایت سفارشی / پورتال دلخواه شما',
      domain: 'any-classifieds-site.ir',
      homeUrl: 'https://any-classifieds-site.ir',
      postUrl: 'https://any-classifieds-site.ir',
      directButtonText: 'پیمایش هوشمند دکمه‌ها (Smart Nav)',
      category: 'تولیدی و بازرگانی',
      requiresOtp: false,
      detectedFields: ['شناسایی هوشمند انواع فیلدهای ورودی (Smart Heuristics)', 'شناسایی خودکار دکمه‌های درج آگهی'],
    },
  ];

  const [selectedPlatform, setSelectedPlatform] = useState<TargetPlatformOption>(platforms[0]);
  const [customDomain, setCustomDomain] = useState<string>('https://');

  // Direct Launch Form Data
  const [adTitle, setAdTitle] = useState<string>(
    'تولید و چاپ اختصاصی انواع کارتن و جعبه بسته‌بندی صادراتی اشک قلم'
  );
  const [adPhone, setAdPhone] = useState<string>(company?.phoneNumber || '09153108763');
  const [adCity, setAdCity] = useState<string>('تهران');
  const [adCategory, setAdCategory] = useState<string>('صنعتی و بسته‌بندی');
  const [adDescription, setAdDescription] = useState<string>(
    'تولید و چاپ اختصاصی کارتن ۳ و ۵ لایه، جعبه لمینتی دایکاتی با بهترین کیفیت و تحویل فوری در سراسر کشور.'
  );

  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [launchedSuccess, setLaunchedSuccess] = useState<boolean>(false);

  const files = generateExtensionFiles({
    defaultPhone: company?.phoneNumber || '09153108763',
  });

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      const zipBlob = await buildExtensionZip({
        defaultPhone: company?.phoneNumber || '09153108763',
      });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ashk24-universal-extension-v${APP_VERSION}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      alert('خطا در ساخت پکیج ZIP افزونه: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCode = () => {
    if (files[activeFileIndex]) {
      navigator.clipboard.writeText(files[activeFileIndex].content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyAdData = () => {
    const payload = JSON.stringify(
      {
        title: adTitle,
        phoneNumber: adPhone,
        city: adCity,
        category: adCategory,
        description: adDescription,
        province: 'تهران',
        domain: selectedPlatform.domain,
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleDirectLaunchPortal = (mode: 'direct_post' | 'homepage') => {
    const targetUrl =
      selectedPlatform.id === 'custom'
        ? customDomain
        : mode === 'homepage'
        ? selectedPlatform.homeUrl
        : selectedPlatform.postUrl;

    // Save to local storage for extension to pick up
    try {
      localStorage.setItem(
        'ashk24_active_job',
        JSON.stringify({
          title: adTitle,
          phoneNumber: adPhone,
          city: adCity,
          category: adCategory,
          description: adDescription,
          province: 'تهران',
          targetDomain: selectedPlatform.domain,
          targetUrl,
          status: 'ready',
          timestamp: Date.now(),
        })
      );
    } catch (e) {}

    // Open actual real portal in new tab
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    setLaunchedSuccess(true);
    setTimeout(() => setLaunchedSuccess(false), 4000);

    if (onTriggerDirectPublish) {
      onTriggerDirectPublish(selectedPlatform.domain, adTitle);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Package className="w-6 h-6" />
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                مرکز استقرار افزونه مرورگر و همراهی زنده انتشار (Universal Chrome Co-Pilot)
              </h2>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 font-mono">
                نسخه {APP_VERSION} (Manifest V3)
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              افزونه مرورگر اشک ۲۴ به عنوان دستیار زنده در **تمامی وب‌سایت‌های نیازمندی و پورتال‌های تبلیغاتی ایران** عمل نموده و با شناسایی خودکار دکمه‌های «درج آگهی / ثبت نام» و آنالیز فیلدهای فرم، فرایند ثبت آگهی را تا زمان انتشار همراهی می‌نماید.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMainHelp(!showMainHelp)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 text-xs transition cursor-pointer"
              title="راهنمای هوشمند این بخش"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>راهنما (?)</span>
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>در حال فشرده‌سازی پکیج ZIP...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-slate-950" />
                  <span>دانلود پکیج انجام شد!</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>دانلود پکیج ZIP آماده نصب</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Smart Help Modal */}
        {showMainHelp && (
          <div className="mt-5 p-4 rounded-xl bg-slate-950/90 border border-amber-500/30 text-xs text-slate-300 space-y-2 leading-relaxed animate-in fade-in duration-200">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
              <HelpCircle className="w-4 h-4" />
              مراحل نصب و تضمین پایداری بدون کرش و فریز (Zero-Lag Anti-Freeze Engine):
            </div>
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 text-emerald-300 text-[11px] mb-2">
              🛡️ <strong>اصلاح و پایداری قطعی (نسخه {APP_VERSION}):</strong> به منظور رفع کامل هرگونه هنگ یا کرش مرورگر، اسکوپ افزونه کاملاً به دامنه‌های مشخص آگهی ایران محدود شده، فرآیند رصد با دی‌بانس هوشمند ۱۰۰۰ میلی‌ثانیه‌ای ایزوله شده و تداخل آن با صفحات دیگر کاربر به صفر رسیده است.
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pr-2">
              <li>پکیج ZIP فوق را با کلیک روی دکمه دانلود دریافت و از حالت فشرده استخراج فرمایید.</li>
              <li>در مرورگر کروم به آدرس <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">chrome://extensions/</code> بروید.</li>
              <li>گزینه **Developer mode** در بالا سمت راست را فعال کنید.</li>
              <li>روی دکمه **Load unpacked** کلیک کرده و پوشه استخراج شده افزونه را انتخاب نمایید (یا در صورت داشتن نسخه قبلی، دکمه Refresh کنار افزونه را بزنید).</li>
              <li>اکنون وارد هر درگاه آگهی (نیازپرداز، ایستگاه، دیوار، شیپور، راهنما و...) شوید؛ افزونه بدون هیچ‌گونه افت سرعت یا کرش مرورگر فعال خواهد بود.</li>
            </ol>
          </div>
        )}
      </div>

      {/* Direct Launch & Extension Code Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Direct Real Launch Hub */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>پرتاب و بازگشایی واقعی درگاه‌های انتشار</span>
              </div>
              <button
                onClick={() => setShowDirectHelp(!showDirectHelp)}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-amber-300 text-xs cursor-pointer"
                title="راهنما"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {showDirectHelp && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                با انتخاب هر درگاه، سیستم به صورت خودکار به صفحه اصلی و دکمه درج آگهی آن متصل شده و افزونه اشک ۲۴ در تب باز شده عملیات شناسایی و ثبت فرم را آغاز می‌کند.
              </div>
            )}

            {/* Platform Selection Chips */}
            <div>
              <label className="block text-slate-400 text-xs mb-2">انتخاب درگاه مقصد جهت بازگشایی و ثبت آگهی:</label>
              <div className="grid grid-cols-2 gap-2">
                {(platforms || []).map((plat) => (
                  <button
                    key={plat.id}
                    onClick={() => setSelectedPlatform(plat)}
                    className={`p-2 rounded-xl text-xs text-right transition border flex items-center justify-between cursor-pointer ${
                      selectedPlatform.id === plat.id
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{plat.name}</span>
                    {selectedPlatform.id === plat.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Target Info Card */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">نحوه هدایت درگاه:</span>
                <span className="text-amber-400 font-mono text-[11px]">{selectedPlatform.directButtonText}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">آدرس واقعی:</span>
                <span className="text-emerald-400 font-mono text-[11px]" dir="ltr">{selectedPlatform.homeUrl}</span>
              </div>
            </div>

            {selectedPlatform.id === 'custom' && (
              <div>
                <label className="block text-slate-400 text-xs mb-1">آدرس سایت یا صفحه ثبت آگهی دلخواه:</label>
                <input
                  type="url"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-lg p-2.5 text-slate-200 text-xs outline-none font-mono"
                  placeholder="https://example.com"
                />
              </div>
            )}

            {/* Form Inputs for Launch */}
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">عنوان آگهی جهت ارسال به درگاه:</label>
                <input
                  type="text"
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-lg p-2 text-slate-200 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">شماره تماس رسمی:</label>
                  <input
                    type="tel"
                    value={adPhone}
                    onChange={(e) => setAdPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-lg p-2 text-slate-200 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">شهر / محدوده:</label>
                  <input
                    type="text"
                    value={adCity}
                    onChange={(e) => setAdCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-lg p-2 text-slate-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">شرح و متن آگهی:</label>
                <textarea
                  rows={3}
                  value={adDescription}
                  onChange={(e) => setAdDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-lg p-2 text-slate-200 text-xs outline-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => handleDirectLaunchPortal('direct_post')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>بازگشایی واقعی {selectedPlatform.name} و پر کردن فیلدها</span>
                </button>

                <button
                  onClick={handleCopyAdData}
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {copiedPayload ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">بسته داده‌های آگهی کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>کپی بسته اطلاعات آگهی (JSON Payload)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Launch Notification */}
            {launchedSuccess && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 space-y-1 animate-in fade-in duration-200">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>درگاه مقصد با موفقیت باز شد!</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  اطلاعات آگهی در حافظه آماده گردید و افزونه در تب باز شده عملیات هدایت و درج را تکمیل خواهد نمود.
                </p>
              </div>
            )}

            {/* Detected Fields Preview for Target Site */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                <MonitorCheck className="w-4 h-4 text-amber-400" />
                <span>فیلدها و مراحل شناسایی‌شده در {selectedPlatform.name}:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(selectedPlatform.detectedFields || []).map((field, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[11px]"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Extension File Explorer & Source Code */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>کدهای منبع افزونه چندمنظوره کروم (Manifest V3)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilesHelp(!showFilesHelp)}
                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-amber-300 text-xs cursor-pointer"
                  title="راهنما"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی محتوای فایل</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {showFilesHelp && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                تمام فایل‌های لازم برای ساخت افزونه بدون نیاز به تغییر دستی به صورت مستقیم در پکیج ZIP قرار داده شده و مانیفست آن روی <code className="text-amber-400">&lt;all_urls&gt;</code> تنظیم گردیده تا در کلیه سایت‌ها فعال باشد.
              </div>
            )}

            {/* File Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {(files || []).map((file, idx) => (
                <button
                  key={file.path}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
                    activeFileIndex === idx
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <FileCode className="w-3 h-3" />
                  <span>{file.path}</span>
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400">
              {files[activeFileIndex]?.description}
            </div>

            {/* Code Viewer Container */}
            <div className="relative">
              <pre
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-xs font-mono overflow-x-auto max-h-[360px] leading-relaxed select-all"
                dir="ltr"
              >
                <code>{files[activeFileIndex]?.content}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
