import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Play,
  Calendar,
  Clock,
  Trash2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  RefreshCw,
  RotateCw,
  ImageIcon,
  Sparkles,
  Zap,
  HelpCircle,
  CheckCircle2,
  Send,
  Layers,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Filter,
  FolderOpen,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Campaign, MediaPlatform, BrandTone, BusinessSector, CompanyProfile } from '../types/ashk24.js';
import { toPersianDigits, toTomanFormat, getCurrentJalaliDate } from '../utils/persianUtils.js';
import { ImageUploader } from './ImageUploader.js';
import { ImageUploadVaultModal } from './ImageUploadVaultModal.js';
import { ImageAnalysisModal } from './ImageAnalysisModal.js';
import { clientStorage } from '../services/clientStorageService.js';
import { SmartHelpButton } from './SmartHelpModal.js';

interface CampaignManagerModuleProps {
  campaigns: Campaign[];
  platforms: MediaPlatform[];
  onCreateCampaign: (newCamp: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Campaign | undefined> | void;
  onDeleteCampaign: (id: string) => void;
  onTriggerJob: (campaignId: string, platformId: string) => void;
  onRefreshAll?: () => void;
}

export const CampaignManagerModule: React.FC<CampaignManagerModuleProps> = ({
  campaigns,
  platforms,
  onCreateCampaign,
  onDeleteCampaign,
  onTriggerJob,
  onRefreshAll,
}) => {
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [analyzingImage, setAnalyzingImage] = useState<{ url: string; text: string; name: string } | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [quickPublishLoading, setQuickPublishLoading] = useState<boolean>(false);
  const [quickPublishSuccess, setQuickPublishSuccess] = useState<string | null>(null);
  const [publishingCampaignId, setPublishingCampaignId] = useState<string | null>(null);
  const [wipeLoading, setWipeLoading] = useState<boolean>(false);

  // Fast-track Preset Templates
  const presetTemplates = [
    {
      id: 'carton_packaging',
      title: 'تولید انواع کارتن ۳ لایه و ۵ لایه لمینتی و دایکاتی صادراتی',
      productName: 'کارتن و جعبه بسته‌بندی صادراتی',
      productDescription: 'مجتمع تخصصی کارتن‌سازی و چاپ افست: طراحی و تولید انواع کارتن ۳ لایه، ۵ لایه، لمینتی، جعبه مقوایی و هاردباکس با بالاترین کیفیت چاپ و تیراژ بالا، ارسال به سراسر کشور و کشورهای همسایه.',
      priceToman: 0,
      sector: 'industrial' as BusinessSector,
    },
    {
      id: 'luxury_box',
      title: 'تولید جعبه‌های سخت (هاردباکس) لوکس و بسته‌بندی نفیس',
      productName: 'جعبه هاردباکس و بسته‌بندی لوکس',
      productDescription: 'تولید اختصاصی جعبه‌های لوکس مگنتی و هاردباکس صادراتی مناسب خشکبار، زعفران، عطر و ادکلن، هدایای تبلیغاتی با پوشش یووی موضعی و طلاکوب.',
      priceToman: 0,
      sector: 'industrial' as BusinessSector,
    },
    {
      id: 'software_system',
      title: 'سامانه هوشمند و اتوماسیون انتشار آگهی اشک ۲۴',
      productName: 'نرم‌افزار اشک ۲۴',
      productDescription: 'سامانه خودکار تولید محتوا، استنتاج معنایی فرم‌ها، دریافت هوشمند OTP و انتشار آگهی‌های شرکتی در کلیه پرتال‌های تجاری ایران.',
      priceToman: 18500000,
      sector: 'digital_goods' as BusinessSector,
    },
  ];

  const [title, setTitle] = useState<string>(presetTemplates[0].title);
  const [productName, setProductName] = useState<string>(presetTemplates[0].productName);
  const [productDescription, setProductDescription] = useState<string>(presetTemplates[0].productDescription);
  const [priceToman, setPriceToman] = useState<number>(0);
  const [sector, setSector] = useState<BusinessSector>('industrial');
  const [tone, setTone] = useState<BrandTone>('persuasive');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState<string>(getCurrentJalaliDate());
  const [scheduleTime, setScheduleTime] = useState<string>('10:30');
  const [isRenewalScheduled, setIsRenewalScheduled] = useState<boolean>(true);
  const [renewalIntervalDays, setRenewalIntervalDays] = useState<number>(30);
  const [campaignImages, setCampaignImages] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  const handleGenerateAiAdContent = async () => {
    if (!productName.trim()) {
      alert('لطفاً ابتدا نام محصول یا خدمات را درج کنید.');
      return;
    }
    setIsGeneratingAi(true);
    try {
      const generated = await clientStorage.generateContent({
        productName,
        description: productDescription || `تولید و عرضه تخصصی ${productName} با تضمین کیفیت`,
        priceToman,
        tone,
        sector,
        keywords: [productName, 'خرید عمده', 'تولید کننده', 'صادراتی', 'ارسال سراسری'],
        targetPlatform: 'دیوار، ایستگاه، نیازپرداز و پورتال‌های وب',
      });
      if (generated.title) setTitle(generated.title);
      if (generated.bodyText) setProductDescription(generated.bodyText);
    } catch (err: any) {
      console.error('Error in AI generation:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyPreset = (preset: typeof presetTemplates[0]) => {
    setTitle(preset.title);
    setProductName(preset.productName);
    setProductDescription(preset.productDescription);
    setPriceToman(preset.priceToman);
    setSector(preset.sector);
  };

  const handleTogglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== id));
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const handleSelectAllPlatforms = () => {
    if (selectedPlatforms.length === (platforms || []).length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms((platforms || []).map((p) => p.id));
    }
  };

  const handleSelectPhase1Platforms = () => {
    const phase1Ids = (platforms || [])
      .filter((p) => p.authTier === 'tier1_easy_email' || !p.requiresOtp)
      .map((p) => p.id);
    setSelectedPlatforms(phase1Ids);
  };

  // 1-Click Fast Express Ad Launcher
  const handleExecute1ClickFastPublish = async () => {
    setQuickPublishLoading(true);
    setQuickPublishSuccess(null);
    try {
      // 1. Create or ensure campaign
      const campData = {
        title: title || 'انتشار سریع و یکپارچه در کلیه سایت‌ها',
        companyId: 'cmp_default_01',
        selectedPlatformIds: selectedPlatforms.length > 0 ? selectedPlatforms : (platforms || []).map(p => p.id),
        productName: productName || 'خدمات و محصولات کارتن‌سازی اشک قلم',
        productDescription: productDescription || 'تولید انواع کارتن و جعبه بسته‌بندی صادراتی با بالاترین کیفیت چاپ و تحویل سریع',
        priceToman,
        sector,
        tone,
        targetKeywords: ['کارتن سازی', 'جعبه سازی', 'اشک قلم', 'بسته بندی', 'چاپ افست'],
        jalaliScheduleDate: getCurrentJalaliDate(),
        jalaliScheduleTime: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        status: 'scheduled' as const,
        autoRetryCount: 3,
        isRenewalScheduled,
        renewalIntervalDays,
        lastRenewalDate: '',
        nextRenewalDate: '۱۴۰۵/۰۶/۲۵',
        renewalCount: 0,
      };

      const createdCamp = await onCreateCampaign(campData);
      
      if (!createdCamp) {
         throw new Error("کمپین ایجاد نشد");
      }

      // 2. Trigger jobs sequentially
      const targetPlatforms = campData.selectedPlatformIds;
      for (const pid of targetPlatforms) {
        await onTriggerJob(createdCamp.id, pid);
      }

      setQuickPublishSuccess(`✅ دستور انتشار سریع به ${toPersianDigits(targetPlatforms.length)} رسانه منتخب با موفقیت ارسال شد و در صف اجرای خودکار قرار گرفت.`);
      setTimeout(() => setQuickPublishSuccess(null), 7000);
    } catch (e: any) {
      alert('خطا در انتشار سریع: ' + e.message);
    } finally {
      setQuickPublishLoading(false);
    }
  };

  const handleWipeAllData = async () => {
    if (!window.confirm('⚠️ اخطار مهم:\nآیا اطمینان دارید که می‌خواهید تمام داده‌ها خام شوند و کلیه کمپین‌ها، تصاویر و نوبت‌های پیش‌فرض پاکسازی گردند؟\nاین عملیات غیرقابل بازگشت است.')) {
      return;
    }
    setWipeLoading(true);
    try {
      const res = await clientStorage.wipeAllDataToRawState();
      alert(res.message || 'کلیه داده‌ها با موفقیت خام و پاکسازی شدند.');
      if (onRefreshAll) {
        onRefreshAll();
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      alert('خطا در خام‌سازی داده‌ها: ' + (e?.message || 'خطای سرور'));
    } finally {
      setWipeLoading(false);
    }
  };

  const handleSubmitNewCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !productName) return;

    onCreateCampaign({
      title,
      companyId: 'cmp_default_01',
      selectedPlatformIds: selectedPlatforms,
      productName,
      productDescription,
      priceToman,
      sector,
      tone,
      targetKeywords: ['اشک قلم', 'کارتن سازی', 'بسته بندی', 'جعبه مقوایی'],
      jalaliScheduleDate: scheduleDate,
      jalaliScheduleTime: scheduleTime,
      status: 'scheduled',
      autoRetryCount: 3,
      isRenewalScheduled,
      renewalIntervalDays,
      lastRenewalDate: '',
      nextRenewalDate: '۱۴۰۵/۰۶/۲۵',
      renewalCount: 0,
      images: campaignImages,
      productImages: campaignImages,
    });

    setShowCreateModal(false);
    setCampaignImages([]);
  };

  const handleInstantPublishCampaign = async (camp: Campaign) => {
    setPublishingCampaignId(camp.id);
    try {
      const targetPlatformIds = (camp.selectedPlatformIds && camp.selectedPlatformIds.length > 0)
        ? camp.selectedPlatformIds
        : platforms.slice(0, 5).map((p) => p.id);

      for (const pid of targetPlatformIds) {
        await onTriggerJob(camp.id, pid);
      }

      setQuickPublishSuccess(`🚀 انتشار فوری کمپین «${camp.title}» به ${toPersianDigits(targetPlatformIds.length)} رسانه با موفقیت ارسال شد و در صف اجرای خودکار قرار گرفت.`);
      setTimeout(() => setQuickPublishSuccess(null), 7000);
    } catch (e: any) {
      alert('خطا در انتشار فوری کمپین: ' + (e?.message || 'خطای نامشخص'));
    } finally {
      setPublishingCampaignId(null);
    }
  };

  const handleCreateAndInstantPublish = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!title || !productName) {
      alert('لطفاً عنوان کمپین و نام محصول را وارد فرمایید.');
      return;
    }

    const targetPlatforms = selectedPlatforms.length > 0 ? selectedPlatforms : platforms.slice(0, 5).map((p) => p.id);
    const newCampData = {
      title,
      companyId: 'cmp_default_01',
      selectedPlatformIds: targetPlatforms,
      productName,
      productDescription,
      priceToman,
      sector,
      tone,
      targetKeywords: ['اشک قلم', 'کارتن سازی', 'بسته بندی', 'جعبه مقوایی'],
      jalaliScheduleDate: getCurrentJalaliDate(),
      jalaliScheduleTime: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      status: 'scheduled' as const,
      autoRetryCount: 3,
      isRenewalScheduled,
      renewalIntervalDays,
      lastRenewalDate: '',
      nextRenewalDate: '۱۴۰۵/۰۶/۲۵',
      renewalCount: 0,
      images: campaignImages,
      productImages: campaignImages,
    };

    setShowCreateModal(false);
    setCampaignImages([]);
    const created = await onCreateCampaign(newCampData);

    if (created) {
      for (const pid of targetPlatforms) {
        await onTriggerJob(created.id, pid);
      }
      setQuickPublishSuccess(`🚀 کمپین «${title}» ایجاد شد و انتشار فوری آن به ${toPersianDigits(targetPlatforms.length)} رسانه آغاز گردید.`);
      setTimeout(() => setQuickPublishSuccess(null), 7000);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Smart Help Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
              <Megaphone className="w-5 h-5 text-amber-400" />
              <span>مدیریت و انتشار یکپارچه آگهی‌ها (Campaign Orchestrator)</span>
            </h2>
            <SmartHelpButton
              content={{
                title: 'ارکستراسیون و انتشار آگهی‌ها',
                summary: 'این بخش ثبت و ارسال آگهی‌ها به چندین سایت نیازمندی‌ها و وبلاگ سئو را با یک کلیک انجام می‌دهد.',
                steps: [
                  'عنوان محصول و متن آگهی را درج کرده یا از الگوهای پیش‌فرض انتخاب کنید.',
                  'تصاویر آگهی را آپلود کرده یا از مخزن هاست انتخاب و تحلیل AI فرمایید.',
                  'سایت‌های نیازمندی‌های وب هدف را تیک بزنید.',
                  'بر روی دکمه «ارسال و انتشار نهایی» کلیک کنید تا نوبت اجرا در موتور هدلس ایجاد شود.'
                ],
                offlineNote: 'سازگار با کلیه هاست‌های cPanel و سرورهای بدون Node.js.'
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            مسیر ساده‌سازی‌شده ثبت‌نام، انتخاب رسانه‌های هدف، زمان‌بندی جلالی و ارسال آنی آگهی به تمامی سایت‌ها
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Open Image Vault Button */}
          <button
            onClick={() => setShowVaultModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold text-xs transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            <FolderOpen className="w-4 h-4 ml-1" />
            <span>مخزن تصاویر هاست</span>
          </button>

          {/* Reset Raw Data Button */}
          <button
            onClick={handleWipeAllData}
            disabled={wipeLoading}
            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-xs transition-all flex items-center space-x-1.5 space-x-reverse disabled:opacity-50"
            title="حذف کلیه آیتم‌های پیش‌فرض و خام‌سازی دیتابیس"
          >
            <Trash2 className="w-3.5 h-3.5 ml-1 text-red-400" />
            <span>{wipeLoading ? 'در حال خام‌سازی...' : 'خام‌سازی داده‌ها'}</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف کمپین جدید</span>
          </button>
        </div>
      </div>

      {/* 🚀 1-CLICK FAST-TRACK AD PUBLISHER WIZARD */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>مسیر سریع و ۱-کلیک انتشار آگهی در کلیه پلتفرم‌ها</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  ساده و بدون معطلی
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                قالب موضوعی را انتخاب کرده و با یک کلیک آگهی را در همه سایت‌ها (دیوار، شیپور، نیازپرداز، پیام‌سرا، ایستگاه و...) ثبت کنید.
              </p>
            </div>
          </div>

          <button
            onClick={handleExecute1ClickFastPublish}
            disabled={quickPublishLoading}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 space-x-reverse disabled:opacity-50 cursor-pointer"
          >
            {quickPublishLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Send className="w-4 h-4 text-slate-950" />
            )}
            <span>{quickPublishLoading ? 'در حال ارسال آنی به سایت‌ها...' : '🚀 انتشار آنی و خودکار در همه سایت‌ها'}</span>
          </button>
        </div>

        {/* Quick Presets Selection & AI Generator Button */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 block">انتخاب سریع قالب محتوا یا تولید با هوش مصنوعی:</span>
            <button
              type="button"
              onClick={handleGenerateAiAdContent}
              disabled={isGeneratingAi}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-bold transition-all flex items-center space-x-1.5 space-x-reverse"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isGeneratingAi ? 'در حال نگارش هوشمند...' : 'نگارش خودکار آگهی با AI'}</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(presetTemplates || []).map((p) => {
              const isSelected = title === p.title;
              return (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p)}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-1.5 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs line-clamp-1">{p.productName}</div>
                  <div className="text-[11px] opacity-80 line-clamp-2 leading-relaxed">{p.title}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fast Platform Selection Badges */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
            <span className="font-semibold">سایت‌های هدف برای انتشار ({toPersianDigits(selectedPlatforms.length)} سایت انتخاب شده):</span>
            <div className="flex items-center space-x-2 space-x-reverse">
              <button
                type="button"
                onClick={handleSelectPhase1Platforms}
                className="text-emerald-300 hover:text-emerald-200 text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-all flex items-center space-x-1 space-x-reverse"
                title="سایت‌های فاز ۱ نیازی به OTP نداشته و با نام کاربری و رمز ثبت می‌شوند"
              >
                <span>📧 فقط سایت‌های ایمیل‌محور (فاز ۱)</span>
              </button>
              <button
                type="button"
                onClick={handleSelectAllPlatforms}
                className="text-amber-400 hover:text-amber-300 text-[11px] font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700"
              >
                {selectedPlatforms.length === (platforms || []).length ? 'لغو انتخاب همه' : 'انتخاب همه سایت‌ها'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(platforms || []).map((p) => {
              const isSelected = selectedPlatforms.includes(p.id);
              const isEmailTier = p.authTier === 'tier1_easy_email' || !p.requiresOtp;
              const hasSession = p.sessionStatus === 'authenticated';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTogglePlatform(p.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-1.5 space-x-reverse transition-all ${
                    isSelected
                      ? isEmailTier
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 font-bold shadow-sm'
                        : 'bg-slate-950 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-slate-950/50 border-slate-800 text-slate-500 line-through opacity-60'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isEmailTier ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span>{p.persianName}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {isEmailTier ? '[ایمیل]' : '[OTP گوشی]'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {quickPublishSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2 space-x-reverse">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{quickPublishSuccess}</span>
          </div>
        )}
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(campaigns || []).map((camp) => (
          <div
            key={camp.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{camp.title}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">محصول: {camp.productName}</div>
                </div>

                <button
                  onClick={() => onDeleteCampaign(camp.id)}
                  title="حذف کمپین"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span>قیمت پیشنهادی:</span>
                  <span className="font-bold text-amber-400">{camp.priceToman ? toTomanFormat(camp.priceToman) : 'توافقی / استعلام قیمت'}</span>
                </div>
                <div className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                  {camp.productDescription}
                </div>

                {/* Attached Campaign Images Preview with AI Vision Analysis */}
                {((camp.images && camp.images.length > 0) || (camp.productImages && camp.productImages.length > 0)) && (
                  <div className="pt-2 border-t border-slate-900 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">تصاویر آگهی در هاست:</span>
                    <div className="flex flex-wrap gap-2">
                      {(camp.images || camp.productImages || []).map((imgUrl, imgIdx) => (
                        <div
                          key={imgIdx}
                          className="group relative w-14 h-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0"
                        >
                          <img
                            src={imgUrl}
                            alt="عکس آگهی"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800';
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setAnalyzingImage({ url: imgUrl, text: camp.productDescription, name: camp.productName })}
                              title="تحلیل هوشمند تصویر با AI"
                              className="p-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule and Platform badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 ml-1" />
                  <span>
                    {camp.jalaliScheduleDate} - {camp.jalaliScheduleTime}
                  </span>
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]">
                  تکرار خودکار: {toPersianDigits(camp.autoRetryCount || 3)} بار
                </span>
              </div>

              {/* Smart Renewal Scheduler Info */}
              {camp.isRenewalScheduled && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>🔄 تمدید خودکار {toPersianDigits(camp.renewalIntervalDays || 30)} روزه آگهی فعال است</span>
                    <span>تعداد تمدید تا کنون: {toPersianDigits(camp.renewalCount || 0)} بار</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>نوبت بعدی تمدید / نردبان:</span>
                    <span className="font-mono text-amber-300">{camp.nextRenewalDate || '۱۴۰۵/۰۶/۲۵'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (camp.selectedPlatformIds && camp.selectedPlatformIds.length > 0) {
                          for (const pid of camp.selectedPlatformIds) {
                            onTriggerJob(camp.id, pid);
                          }
                        }
                      } catch (e) {
                        console.error('Error triggering renewal:', e);
                      }
                    }}
                    className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] transition-all flex items-center justify-center space-x-1 space-x-reverse"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>اجرای فوری تمدید ۳۰ روزه و نردبان (همین حالا)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Platform Quick Action Triggers */}
            <div className="border-t border-slate-800/80 pt-3 space-y-2.5">
              {/* Prominent Instant Publish All Platforms Button */}
              <button
                type="button"
                onClick={() => handleInstantPublishCampaign(camp)}
                disabled={publishingCampaignId === camp.id}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
              >
                {publishingCampaignId === camp.id ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>در حال صف‌بندی و انتشار فوری...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                    <span>🚀 انتشار فوری این کمپین (ارسال همزمان به کلیه رسانه‌ها)</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-400 font-semibold block">
                یا ارسال فوری تکی به پلتفرم منتخب:
              </span>
              <div className="flex flex-col gap-1.5">
                {(camp.selectedPlatformIds || []).map((pid) => {
                  const plat = platforms.find((p) => p.id === pid);
                  const hasCookie = plat?.sessionStatus === 'authenticated';
                  return (
                    <button
                      key={pid}
                      onClick={() => onTriggerJob(camp.id, pid)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs font-semibold transition-all flex items-center justify-between text-right"
                    >
                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                        <span className="text-slate-200">{plat?.persianName || pid}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${hasCookie ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                        {hasCookie ? '🟢 نشست فعال (بدون نیاز به OTP)' : '🟡 ارسال کد OTP'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">تعریف کمپین جدید بازاریابی</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                بستن ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewCampaign} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">عنوان کمپین:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">نام محصول / خدمت:</label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">قیمت (تومان):</label>
                  <input
                    type="number"
                    value={priceToman}
                    onChange={(e) => setPriceToman(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">توضیحات کامل آگهی:</label>
                  <button
                    type="button"
                    onClick={handleGenerateAiAdContent}
                    disabled={isGeneratingAi}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-bold transition-all flex items-center space-x-1 space-x-reverse"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{isGeneratingAi ? 'در حال نگارش...' : 'نگارش خودکار با AI'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* Upload Campaign Ad Images */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <ImageUploader
                  label="بارگذاری یا انتخاب تصاویر آگهی در هاست:"
                  category="ad_image"
                  multiple={true}
                  currentUrls={campaignImages}
                  adText={productDescription}
                  productName={productName}
                  keywords={['کارتن سازی', 'بسته بندی', 'اشک قلم']}
                  onUploadSuccess={(urls) => {
                    setCampaignImages((prev) => [...prev, ...urls]);
                  }}
                  onRemoveUrl={(urlToRemove) => {
                    setCampaignImages((prev) => prev.filter((u) => u !== urlToRemove));
                  }}
                  compact={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">تاریخ شمسی انتشار:</label>
                  <input
                    type="text"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">ساعت انتشار:</label>
                  <input
                    type="text"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">انتخاب پلتفرم‌های انتشار:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(platforms || []).map((p) => {
                    const isSelected = selectedPlatforms.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleTogglePlatform(p.id)}
                        className={`p-2 rounded-xl border text-xs text-right transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {p.persianName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Intelligent Renewal & Bumping Scheduler Option */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">برنامه‌ریزی تمدید خودکار آگهی‌ها (۳۰ روزه)</span>
                  <span className="text-[10px] text-slate-400">نردبان یا تمدید خودکار آگهی‌ها در دیوار/شیپور جهت جلوگیری از انقضا</span>
                </div>
                <input
                  type="checkbox"
                  checked={isRenewalScheduled}
                  onChange={(e) => setIsRenewalScheduled(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreateAndInstantPublish}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 space-x-reverse"
                >
                  <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span>🚀 ایجاد و انتشار فوری (همین حالا)</span>
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
                >
                  <span>📅 ذخیره در تقویم زمان‌بندی</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Section Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 space-x-reverse text-amber-400 font-bold text-sm">
                <HelpCircle className="w-5 h-5" />
                <span>راهنمای هوشمند مدیریت و انتشار آگهی</span>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                بستن ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>۱. انتشار ۱-کلیک سریع:</strong> با فشردن دکمه «انتشار آنی»، سامانه به طور خودکار متن و تصاویر ذخیره شده در هاست را به صف ارسال برای تمامی پلتفرم‌های تایید شده اضافه می‌کند.
              </p>
              <p>
                <strong>۲. مدیریت ورود و نشست‌ها:</strong> چنانچه نشست کوکی پلتفرمی در بخش Session Vault ذخیره شده باشد، انتشار بدون درخواست مجدد پیامک انجام می‌شود. در غیر این صورت پیامک کد OTP از شما استعلام خواهد شد.
              </p>
              <p>
                <strong>۳. تمدید ۳۰ روزه:</strong> با فعال‌سازی این گزینه، در تاریخ‌های معین آگهی به صورت خودکار تمدید یا نردبان می‌شود تا همواره در صدر نتایج جستجوی مشتریان قرار گیرد.
              </p>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      {/* Media Vault Modal */}
      {showVaultModal && (
        <ImageUploadVaultModal
          isOpen={showVaultModal}
          onClose={() => setShowVaultModal(false)}
          onSelectUrl={(url) => {
            setCampaignImages((prev) => [...prev, url]);
            setShowVaultModal(false);
          }}
        />
      )}

      {/* AI Image & Text Analysis Modal */}
      {analyzingImage && (
        <ImageAnalysisModal
          isOpen={!!analyzingImage}
          onClose={() => setAnalyzingImage(null)}
          imageUrl={analyzingImage.url}
          adText={analyzingImage.text}
          productName={analyzingImage.name}
          keywords={['کارتن سازی', 'بسته بندی', 'اشک قلم']}
        />
      )}
    </div>
  );
};
