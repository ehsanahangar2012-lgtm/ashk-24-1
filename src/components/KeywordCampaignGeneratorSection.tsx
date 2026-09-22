import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Send,
  Plus,
  X,
  CheckCircle2,
  Copy,
  Hash,
  Cpu,
  Globe,
  Tag,
  FileText,
  Sliders,
  Check,
  TrendingUp,
  Building2,
  Phone,
  MapPin,
  ArrowRight,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Campaign, MediaPlatform, BrandTone, BusinessSector, CompanyProfile } from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';
import { toPersianDigits, getCurrentJalaliDate } from '../utils/persianUtils.js';

interface KeywordCampaignGeneratorSectionProps {
  platforms: MediaPlatform[];
  onCreateCampaign: (newCamp: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Campaign | undefined> | void;
  onTriggerJob: (campaignId: string, platformId: string) => void;
  onCampaignCreated?: (camp: Campaign) => void;
}

export const KeywordCampaignGeneratorSection: React.FC<KeywordCampaignGeneratorSectionProps> = ({
  platforms,
  onCreateCampaign,
  onTriggerJob,
  onCampaignCreated,
}) => {
  // Discovered / Default Keywords bank extracted from received domain data
  const defaultDiscoveredKeywords = [
    'کارتن ۳ لایه و ۵ لایه',
    'کارتن لمینتی صادراتی',
    'جعبه دایکاتی مقوایی',
    'هاردباکس لوکس مگنتی',
    'بسته‌بندی صنعتی مشهد',
    'چاپ افست و کارتن‌سازی',
    'کارتن میوه و صیفی‌جات',
    'جعبه پیتزا و فست‌فود',
    'تولید کننده مستقیم کارتن',
    'ارسال سراسری و صادرات'
  ];

  const [activeKeywords, setActiveKeywords] = useState<string[]>([
    'کارتن ۳ لایه و ۵ لایه',
    'کارتن لمینتی صادراتی',
    'جعبه دایکاتی مقوایی',
    'تولید کننده مستقیم کارتن'
  ]);
  const [newKeywordInput, setNewKeywordInput] = useState<string>('');
  const [sector, setSector] = useState<BusinessSector>('industrial');
  const [tone, setTone] = useState<BrandTone>('persuasive');
  const [priceToman, setPriceToman] = useState<number>(0);

  // Generated Outputs
  const [generatedTopics, setGeneratedTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [contentVariations, setContentVariations] = useState<Array<{
    id: string;
    name: string;
    topic: string;
    content: string;
    seoScore: number;
    characterCount: number;
  }>>([]);
  const [activeVariationId, setActiveVariationId] = useState<string>('persuasive_commercial');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [seoScore, setSeoScore] = useState<number>(98);
  const [aiProvider, setAiProvider] = useState<string>('Gemini 3.6 Flash');
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [executingLaunch, setExecutingLaunch] = useState<boolean>(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyProfile | null>(null);

  // Selected Target Platforms for the generated campaign
  const [targetPlatformIds, setTargetPlatformIds] = useState<string[]>([]);

  useEffect(() => {
    // Load company profile data from storage/API
    clientStorage.getCompanyProfile().then((prof) => {
      if (prof) setCompanyInfo(prof);
    });
    // Default select all discovered platforms
    if (platforms && platforms.length > 0) {
      setTargetPlatformIds(platforms.map((p) => p.id));
    }
  }, [platforms]);

  // Handle adding custom keyword
  const handleAddKeyword = () => {
    const trimmed = newKeywordInput.trim().replace(/^#/, '');
    if (trimmed && !activeKeywords.includes(trimmed)) {
      setActiveKeywords([...activeKeywords, trimmed]);
      setNewKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setActiveKeywords(activeKeywords.filter((k) => k !== kw));
  };

  const handleToggleDiscoveredKeyword = (kw: string) => {
    if (activeKeywords.includes(kw)) {
      setActiveKeywords(activeKeywords.filter((k) => k !== kw));
    } else {
      setActiveKeywords([...activeKeywords, kw]);
    }
  };

  // Generate topics and related content based on active keywords & received data
  const handleGenerateFromKeywords = async () => {
    if (activeKeywords.length === 0) {
      alert('لطفاً حداقل یک کلمه کلیدی انتخاب یا وارد فرمایید.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await clientStorage.generateCampaignContentWithGemini({
        keywords: activeKeywords,
        tone,
        sector,
        companyProfile: companyInfo || undefined,
        priceToman,
        audience: 'کارخانجات، صنایع غذایی، دارویی، صادراتی و تولیدکنندگان'
      });

      if (res && res.topics && res.topics.length > 0) {
        setGeneratedTopics(res.topics);
        setSelectedTopic(res.topics[0]);
        setAiProvider(res.provider.includes('gemini') ? (res.provider.includes('3.6') ? 'Gemini 3.6 Flash' : 'Gemini AI') : 'موتور هوشمند محلی');
        setSeoScore(res.seoScore || 98);
        setAiReasoning(res.reasoning || '');
        setGeneratedHashtags(res.suggestedHashtags || []);
        setContentVariations(res.contentVariations || []);

        if (res.contentVariations && res.contentVariations.length > 0) {
          const first = res.contentVariations[0];
          setActiveVariationId(first.id);
          setGeneratedContent(first.content);
        }
      }
    } catch (err: any) {
      console.error('Error generating with Gemini:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Run initial generation if empty
  useEffect(() => {
    if (generatedTopics.length === 0) {
      handleGenerateFromKeywords();
    }
  }, []);

  const handleSelectVariation = (varItem: typeof contentVariations[0]) => {
    setActiveVariationId(varItem.id);
    setSelectedTopic(varItem.topic);
    setGeneratedContent(varItem.content);
    if (varItem.seoScore) setSeoScore(varItem.seoScore);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Action: Save as Campaign
  const handleSaveAsCampaign = async () => {
    if (!selectedTopic || !generatedContent) {
      alert('لطفاً ابتدا با دکمه تولید، موضوع و متن را آماده فرمایید.');
      return;
    }

    const newCampData = {
      title: selectedTopic,
      companyId: 'cmp_default_01',
      selectedPlatformIds: targetPlatformIds.length > 0 ? targetPlatformIds : platforms.map((p) => p.id),
      productName: activeKeywords[0] || 'کارتن و بسته‌بندی اشک قلم',
      productDescription: generatedContent,
      priceToman,
      sector,
      tone,
      targetKeywords: activeKeywords,
      jalaliScheduleDate: getCurrentJalaliDate(),
      jalaliScheduleTime: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      status: 'scheduled' as const,
      autoRetryCount: 3,
      isRenewalScheduled: true,
      renewalIntervalDays: 30,
      lastRenewalDate: '',
      nextRenewalDate: '۱۴۰۵/۰۷/۰۱',
      renewalCount: 0,
    };

    const created = await onCreateCampaign(newCampData);
    if (created && onCampaignCreated) {
      onCampaignCreated(created);
    }
    setSuccessNotice(`کمپین جدید «${selectedTopic}» با کلمات کلیدی منتخب با موفقیت ایجاد شد.`);
    setTimeout(() => setSuccessNotice(null), 6000);
  };

  // Action: Save as Campaign and instantly trigger publication across all discovered platforms
  const handleSaveAndInstantLaunch = async () => {
    if (!selectedTopic || !generatedContent) {
      alert('لطفاً ابتدا با دکمه تولید، موضوع و متن را آماده فرمایید.');
      return;
    }

    setExecutingLaunch(true);
    try {
      const selectedPlats = targetPlatformIds.length > 0 ? targetPlatformIds : platforms.map((p) => p.id);
      const newCampData = {
        title: selectedTopic,
        companyId: 'cmp_default_01',
        selectedPlatformIds: selectedPlats,
        productName: activeKeywords[0] || 'کارتن و بسته‌بندی اشک قلم',
        productDescription: generatedContent,
        priceToman,
        sector,
        tone,
        targetKeywords: activeKeywords,
        jalaliScheduleDate: getCurrentJalaliDate(),
        jalaliScheduleTime: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        status: 'running' as const,
        autoRetryCount: 3,
        isRenewalScheduled: true,
        renewalIntervalDays: 30,
        lastRenewalDate: '',
        nextRenewalDate: '۱۴۰۵/۰۷/۰۱',
        renewalCount: 0,
      };

      const created = await onCreateCampaign(newCampData);
      if (created) {
        for (const pid of selectedPlats) {
          await onTriggerJob(created.id, pid);
        }
        if (onCampaignCreated) onCampaignCreated(created);
        setSuccessNotice(`کمپین ایجاد شد و نوبت‌های انتشار به تعداد ${toPersianDigits(selectedPlats.length)} رسانه به صف ارسال گردید.`);
        setTimeout(() => setSuccessNotice(null), 7000);
      }
    } catch (e: any) {
      alert('خطا در انتشار کمپین: ' + (e?.message || 'خطا'));
    } finally {
      setExecutingLaunch(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/95 border-2 border-amber-500/40 shadow-2xl space-y-6 relative overflow-hidden" dir="rtl">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                بخش تولید کمپین از داده‌های دریافتی بر اساس کلمات کلیدی
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                تولید خودکار موضوع و متن مرتبط
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              استخراج هوشمند کلمات کلیدی، ترکیب با داده‌های پلتفرم‌های کشف‌شده و تولید تیترهای جذاب سئو و متن متقاعدکننده آگهی
            </p>
          </div>
        </div>

        {/* Source Data Tags Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>پلتفرم‌های کشف‌شده متصل: </span>
            <strong className="text-emerald-400 font-mono">{toPersianDigits(platforms.length)} سایت</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>مرجع داده: اشک قلم مشهد</span>
          </span>
        </div>
      </div>

      {/* Grid: Left Keywords Control, Right Generated Content & Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Keywords Bank & Generator Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Keyword Input Form */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>کلمات کلیدی منتخب جهت تولید موضوع و متن:</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {toPersianDigits(activeKeywords.length)} کلمه فعال
              </span>
            </label>

            {/* Keyword Input Box */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="کلمه کلیدی جدید را وارد کرده و Enter بزنید..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن</span>
              </button>
            </div>

            {/* Active Keywords Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1 min-h-[40px]">
              {activeKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Hash className="w-3 h-3 text-amber-400/80" />
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="hover:text-rose-400 transition-colors ml-0.5"
                    title="حذف کلمه کلیدی"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Pick from Discovered Bank */}
            <div className="pt-2 border-t border-slate-900 space-y-1.5">
              <span className="text-[11px] text-slate-400 block font-semibold">
                کلمات کلیدی پرتکرار مستخرج از پایگاه رسانه‌ها و محصولات:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {defaultDiscoveredKeywords.map((dkw, i) => {
                  const isPicked = activeKeywords.includes(dkw);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleToggleDiscoveredKeyword(dkw)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] transition-all border ${
                        isPicked
                          ? 'bg-amber-500/25 border-amber-500 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {isPicked ? '✓ ' : '+ '}
                      {dkw}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Tone & Sector Config */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">لحن نگارش متن آگهی:</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as BrandTone)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="persuasive">تبلیغاتی و متقاعدکننده (توصیه اول)</option>
                <option value="formal">رسمی و شرکتی B2B</option>
                <option value="urgent">فروش فوری و تخفیف‌دار</option>
                <option value="friendly">صمیمانه و عمومی</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">قیمت پایه (تومان):</label>
              <input
                type="number"
                value={priceToman || ''}
                onChange={(e) => setPriceToman(Number(e.target.value) || 0)}
                placeholder="صفر = توافقی / استعلام"
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Trigger Generate Button */}
          <button
            type="button"
            onClick={handleGenerateFromKeywords}
            disabled={isGenerating}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center space-x-2 space-x-reverse cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Zap className="w-4 h-4 fill-current text-slate-950" />
            )}
            <span>
              {isGenerating ? 'در حال تولید هوشمند موضوع و متن...' : 'تولید موضوع و متن مرتبط بر اساس کلمات کلیدی'}
            </span>
          </button>
        </div>

        {/* Right Column (7 cols): Generated Topics & Related Content Live Preview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Topics Selector (موضوعات پیشنهادی) */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>موضوع و تیترهای پیشنهادی تولیدشده (انتخاب کنید):</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                  مدل: {aiProvider}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  قدرت سئو: {toPersianDigits(seoScore)}٪
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              {generatedTopics.map((top, idx) => {
                const isSelected = selectedTopic === top;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedTopic(top);
                      if (generatedContent) {
                        const lines = generatedContent.split('\n');
                        lines[0] = top;
                        setGeneratedContent(lines.join('\n'));
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 text-amber-200 font-bold shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-slate-700'}`}></span>
                      <span>{top}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0 font-bold">
                        موضوع فعال
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Variations selector if available */}
          {contentVariations.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>الگوهای متنی متنوع تولیدشده با هوش مصنوعی (انتخاب نگارش):</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {contentVariations.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVariation(v)}
                    className={`p-2 rounded-xl text-right text-[11px] border transition-all ${
                      activeVariationId === v.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold shadow-sm'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="truncate font-semibold">{v.name.split('(')[0]}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 flex items-center justify-between">
                      <span>سئو {toPersianDigits(v.seoScore || 95)}٪</span>
                      <span>{toPersianDigits(v.characterCount)} کاراکتر</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generated Content Box (متن آگهی مرتبط) */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>متن مرتبط تولیدشده (آماده انتشار):</span>
              </label>
              <button
                type="button"
                onClick={() => handleCopy(generatedContent, 'content')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-800 transition-colors"
              >
                {copiedField === 'content' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-amber-400" />
                    <span>کپی متن</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={8}
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 leading-relaxed font-sans focus:outline-none focus:border-amber-500 resize-y"
            />

            {/* Generated Hashtags */}
            {generatedHashtags.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1 items-center">
                <span className="text-[10px] text-slate-400 ml-1">هشتگ‌های سئو:</span>
                {generatedHashtags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-amber-400/90 font-mono border border-slate-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Target Platforms Checklist for this Campaign */}
            <div className="pt-2 border-t border-slate-900 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">
                  رسانه‌های مقصد جهت انتشار ({toPersianDigits(targetPlatformIds.length)} رسانه با Multi-Platform Adapter):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (targetPlatformIds.length === platforms.length) {
                      setTargetPlatformIds([]);
                    } else {
                      setTargetPlatformIds(platforms.map((p) => p.id));
                    }
                  }}
                  className="text-amber-400 hover:underline"
                >
                  {targetPlatformIds.length === platforms.length ? 'عدم انتخاب همه' : 'انتخاب همه پلتفرم‌ها'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {platforms.map((p) => {
                  const isChecked = targetPlatformIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setTargetPlatformIds(targetPlatformIds.filter((id) => id !== p.id));
                        } else {
                          setTargetPlatformIds([...targetPlatformIds, p.id]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500 line-through opacity-60'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isChecked ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                      <span>{p.persianName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons: Save Campaign & Instant Launch */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSaveAndInstantLaunch}
              disabled={executingLaunch || isGenerating}
              className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 space-x-reverse cursor-pointer disabled:opacity-50"
            >
              {executingLaunch ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Send className="w-4 h-4 text-slate-950" />
              )}
              <span>
                {executingLaunch
                  ? 'در حال ایجاد و دیسپچ به پلتفرم‌ها...'
                  : '🚀 ایجاد کمپین و انتشار خودکار در کلیه سایت‌های کشف‌شده'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSaveAsCampaign}
              disabled={executingLaunch || isGenerating}
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>ثبت کمپین (بدون انتشار فوری)</span>
            </button>
          </div>

          {/* Success Message Banner */}
          {successNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
