import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Smartphone,
  Server,
  Megaphone,
  Radio,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Check,
  Copy,
  Clock,
  Send,
  Sparkles,
} from 'lucide-react';
import { toPersianDigits } from '../utils/persianUtils.js';

interface StepByStepGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'company' | 'platforms' | 'campaigns' | 'jobs' | 'mobile_companion') => void;
}

interface WorkflowStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: any;
  targetTab: 'company' | 'platforms' | 'campaigns' | 'jobs' | 'mobile_companion';
  tabButtonText: string;
  keyActions: string[];
  tips: string[];
  pitfalls: string[];
}

export const StepByStepGuideModal: React.FC<StepByStepGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const steps: WorkflowStep[] = [
    {
      stepNumber: 1,
      title: 'تنظیم اطلاعات پایه کسب‌وکار',
      subtitle: 'ثبت نام، لوگو، شماره‌های تماس و آدرس جهت درج خودکار در آگهی‌ها',
      icon: Server,
      targetTab: 'company',
      tabButtonText: 'رفتن به بخش ۱. اطلاعات کسب‌وکار',
      keyActions: [
        'نام رسمی شرکت یا کارگاه (مانند کارتن‌سازی و جعبه‌سازی اشک ۲۴) را وارد کنید.',
        'شماره موبایل فعال دارای واتساپ و شماره ثابت کارگاه را ثبت فرمایید.',
        'لوگوی برند یا سربرگ کارگاه را آپلود کنید تا در کنار تمام خروجی‌ها قرار گیرد.',
      ],
      tips: [
        'اطلاعات این بخش فقط یک‌بار ثبت می‌شود و به طور هوشمند روی تمام آگهی‌های دیوار، شیپور و ایستگاه قرار می‌گیرد.',
      ],
      pitfalls: [
        'شماره تلفن اشتباه باعث از دست رفتن تماس مشتریان و عدم دریافت پیامک‌های استعلام می‌شود.',
      ],
    },
    {
      stepNumber: 2,
      title: 'نصب و فعال‌سازی پل ارتباطی همراه (Mobile Companion)',
      subtitle: 'تضمین دریافت خودکار کدهای OTP دیوار/شیپور با آی‌پی بومی ایران بدون دخالت کاربر',
      icon: Smartphone,
      targetTab: 'mobile_companion',
      tabButtonText: 'رفتن به بخش ۵. همراه اندروید & پل OTP',
      keyActions: [
        'نرم‌افزار اندرویدی پل ارتباطی اشک ۲۴ (فایل APK یا نسخه PWA) را روی گوشی خود نصب نمایید.',
        'مجوز دریافت پیامک را تایید فرمایید تا فقط پیامک‌های حاوی کلمات «دیوار» و «شیپور» رصد شوند.',
        'آدرس وب‌هوک هاست سی‌پنل شما به صورت خودکار در برنامه ست شده و پیامک‌ها در کمتر از ۱ ثانیه به سامانه رله می‌شوند.',
      ],
      tips: [
        'این پل کاملاً فیلتر شده است؛ پیامک‌های بانکی و شخصی به هیچ عنوان خوانده یا منتقل نمی‌شوند.',
        'به دلیل استفاده از اینترنت همراه موبایل، آی‌پی صددرصد متعلق به ایران بوده و از مسدودی جلوگیری می‌شود.',
      ],
      pitfalls: [
        'خاموش بودن باتری اپلیکیشن در پس‌زمینه (Battery Optimization)؛ حتماً دسترسی پس‌زمینه را در گوشی فعال کنید.',
      ],
    },
    {
      stepNumber: 3,
      title: 'انتخاب و کشف پلتفرم‌های انتشار آگهی',
      subtitle: 'بررسی وضعیت نشست (Session) و انتخاب سایت‌های هدف در سراسر وب ایران',
      icon: HelpCircle,
      targetTab: 'platforms',
      tabButtonText: 'رفتن به بخش ۲. کشف رسانه',
      keyActions: [
        'لیست سایت‌های معتبر ایران (دیوار، شیپور، ایستگاه، نیاز روز، پیام‌سرا، صنعت‌ما و...) را مشاهده کنید.',
        'پلتفرم‌های نیازمند ورود با موبایل (OTP) و پلتفرم‌های بدون نیاز به OTP به تفکیک مشخص شده‌اند.',
        'با یک کلیک وضعیت لاگین و اتصال به این پلتفرم‌ها را فعال و آماده انتشار نگه دارید.',
      ],
      tips: [
        'سایت‌های B2B و نیازمندی‌های عمومی مانند ایستگاه و پیام‌سرا ماندگاری بلندمدت در نتایج گوگل دارند.',
      ],
      pitfalls: [
        'سعی نکنید همزمان در یک ساعت بیش از ۵ آگهی تکراری با یک شماره در دیوار ثبت کنید.',
      ],
    },
    {
      stepNumber: 4,
      title: 'تولید هوشمند محتوا و ساخت کمپین آگهی',
      subtitle: 'استفاده از موتور درون‌برنامه‌ای، انتخاب هوشمند عکس‌های هاست و تعیین تیتر',
      icon: Megaphone,
      targetTab: 'campaigns',
      tabButtonText: 'رفتن به بخش ۳. مدیریت آگهی‌ها (کمپین)',
      keyActions: [
        'نام محصول یا خدمات خود را بنویسید (مثلاً: کارتن پنج لایه صادراتی).',
        'دکمه «نگارش هوشمند با موتور آفلاین» را بزنید تا متن کامل، بالت‌پوینت و هشتگ‌ها به صورت محلی تولید شوند.',
        'تصاویر مربوطه را از هاست سی‌پنل خود انتخاب کرده یا به صورت کشیدن و رها کردن اضافه نمایید.',
      ],
      tips: [
        'موتور محلی اشک ۲۴ بدون نیاز به اینترنت خارجی یا فیلترشکن، متون سئوشده و استاندارد تولید می‌کند.',
        'قید قیمت توافقی و کلمات کلیدی استاندارد شانس تایید سریع آگهی توسط ربات‌های دیوار را بالا می‌برد.',
      ],
      pitfalls: [
        'استفاده از کلمات بازاریابی مبالغه‌آمیز ممنوعه (مانند تضمین ۱۰۰٪ بدون مجوز) که سبب رد آگهی در دیوار می‌شود.',
      ],
    },
    {
      stepNumber: 5,
      title: 'انتشار نهایی و پایش صف وظایف (Jobs)',
      subtitle: 'ارسال آگهی‌ها به ربات‌های انتشار، دریافت کد OTP و گزارش لحظه‌ای ثبت',
      icon: Radio,
      targetTab: 'jobs',
      tabButtonText: 'رفتن به بخش ۴. صف انتشار (Jobs)',
      keyActions: [
        'دکمه «انتشار آنی و خودکار در همه سایت‌ها» را بزنید.',
        'اگر سایتی نیاز به کد تایید داشت، پل همراه اندروید به صورت خودکار کد را رله کرده و وارد می‌کند.',
        'لینک آگهی‌های تایید شده را در جدول پایش و لاگ‌های سیستم مشاهده و ذخیره فرمایید.',
      ],
      tips: [
        'حتی اگر اینترنت شما قطع شود، کران‌جاب‌های هاست cPanel وظایف را در پس‌زمینه ادامه می‌دهند.',
      ],
      pitfalls: [
        'بستن ناگهانی مجوزهای دسترسی گوشی قبل از دریافت کد تایید نهایی.',
      ],
    },
  ];

  const currentStep = steps[currentStepIndex];

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 text-right">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3 shrink-0">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>راهنمای گام‌به‌گام سامانه: از نصب تا انتشار قطعی</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  ۵ مرحله تا موفقیت
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                مسیر استاندارد اتوماسیون انتشار آگهی‌ها در سایت‌های ایرانی با تضمین دریافت خودکار OTP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
          >
            بستن ✕
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 shrink-0">
          {steps.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <button
                key={s.stepNumber}
                onClick={() => setCurrentStepIndex(idx)}
                className={`p-2 sm:p-2.5 rounded-2xl text-right transition-all border flex flex-col justify-between space-y-1 ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md'
                    : isCompleted
                    ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>گام {toPersianDigits(s.stepNumber)}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                  )}
                </div>
                <div className="text-[10px] truncate hidden sm:block font-medium">
                  {s.title.split(' ')[0]} {s.title.split(' ')[1] || ''}
                </div>
              </button>
            );
          })}
        </div>

        {/* Step Detailed View Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Step Main Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 space-x-reverse">
                <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  {toPersianDigits(currentStep.stepNumber)}
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {currentStep.title}
                </h3>
              </div>

              <button
                onClick={() => {
                  onNavigateTab(currentStep.targetTab);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>{currentStep.tabButtonText}</span>
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pr-9">
              {currentStep.subtitle}
            </p>
          </div>

          {/* Key Actions */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>اقدامات الزامی در این مرحله:</span>
            </span>
            <ul className="space-y-2 text-xs text-slate-300 pr-2">
              {currentStep.keyActions.map((action, i) => (
                <li key={i} className="flex items-start space-x-2 space-x-reverse leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips & Pitfalls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 space-x-reverse text-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>نکته کلیدی برای موفقیت:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                {currentStep.tips.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 space-x-reverse text-rose-200">
                <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>اشتباه رایج که باید پرهیز شود:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                {currentStep.pitfalls.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Navigation Controls */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>مرحله قبلی</span>
            </button>

            <button
              onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStepIndex === steps.length - 1}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <span>مرحله بعدی</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              onNavigateTab(currentStep.targetTab);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <span>ورود و اجرای مرحله {toPersianDigits(currentStep.stepNumber)}</span>
            <ArrowLeft className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      </div>
    </div>
  );
};
