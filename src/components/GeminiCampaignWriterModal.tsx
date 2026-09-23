import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  RotateCw,
  Copy,
  Check,
  Building2,
  Layers,
  HelpCircle,
  TrendingUp,
  Tag,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Campaign, CompanyProfile, BrandTone, BusinessSector } from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import { SmartHelpButton } from './SmartHelpModal.js';

interface GeminiCampaignWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
  company?: CompanyProfile | null;
  onApplyContent: (content: {
    title: string;
    bodyText: string;
    bulletPoints?: string[];
    hashtags?: string[];
    seoScore?: number;
  }) => void;
}

export const GeminiCampaignWriterModal: React.FC<GeminiCampaignWriterModalProps> = ({
  isOpen,
  onClose,
  campaign,
  company,
  onApplyContent,
}) => {
  const [productName, setProductName] = useState<string>(campaign?.productName || 'کارتن و بسته‌بندی صادراتی');
  const [description, setDescription] = useState<string>(campaign?.productDescription || '');
  const [sector, setSector] = useState<BusinessSector>(company?.businessSector || 'industrial');
  const [tone, setTone] = useState<BrandTone>(company?.brandTone || 'persuasive');
  const [priceToman, setPriceToman] = useState<number>(campaign?.priceToman || 0);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<{
    provider: string;
    topics: string[];
    suggestedTitle: string;
    suggestedBody: string;
    suggestedShortSnippet: string;
    bulletPoints: string[];
    suggestedHashtags: string[];
    seoScore: number;
    callToAction: string;
    reasoning: string;
  } | null>(null);

  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number>(0);
  const [selectedBodyText, setSelectedBodyText] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateWithGemini = async () => {
    if (!productName.trim()) {
      alert('لطفاً نام محصول یا خدمت را وارد کنید.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await clientStorage.generateGeminiCampaignCopy({
        companyId: company?.id,
        productName,
        description,
        sector,
        tone,
        priceToman,
        targetKeywords: company?.primaryKeywords,
        userPrompt,
      });

      setGeneratedResult(res);
      setSelectedTopicIndex(0);
      setSelectedBodyText(res.suggestedBody);
    } catch (e) {
      console.error('Gemini generation failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    const finalTitle = generatedResult?.topics[selectedTopicIndex] || generatedResult?.suggestedTitle || productName;
    const finalBody = selectedBodyText || generatedResult?.suggestedBody || description;

    onApplyContent({
      title: finalTitle,
      bodyText: finalBody,
      bulletPoints: generatedResult?.bulletPoints,
      hashtags: generatedResult?.suggestedHashtags,
      seoScore: generatedResult?.seoScore,
    });
    onClose();
  };

  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Sparkles className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <h3 className="text-base font-extrabold text-slate-100">
                  تولید خودکار تیتر و شرح آگهی با Gemini 3.8 Flash
                </h3>
                <SmartHelpButton
                  title="راهنمای هوش مصنوعی کپی‌رایتینگ جمنای"
                  description="این ماژول بر اساس نام برند، کلمات کلیدی، حوزه کسب‌وکار و لحن انتخابی مشتری، عناوین جذاب با نرخ کلیک بالا و متن‌های متقاعدکننده منطبق با الگوریتم‌های دیوار، نیازمندی‌ها و B2B تولید می‌کند."
                />
              </div>
              <p className="text-[11px] text-slate-400">
                نگارش محتوای بهینه سئو با ضریب نفوذ بالا بر اساس بیزنس انتخاب‌شده
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Company & Product Context Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">مشتری / شرکت هدف:</label>
            <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 flex items-center space-x-2 space-x-reverse">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>{company?.brandName || company?.name || 'شرکت اصلی'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">نام محصول / خدمت:</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="مثلاً: کارتن ۵ لایه دایکاتی صادراتی"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">لحن نگارش (Tone):</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as BrandTone)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
            >
              <option value="persuasive">متقاعدکننده و مشتری‌پسند (Persuasive)</option>
              <option value="formal">رسمی و صنعتی سازمانی (B2B)</option>
              <option value="urgent">فوری، تخفیفی و فروش سریع (Urgent)</option>
              <option value="friendly">صمیمی و خدماتی (Friendly)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">حوزه کسب‌وکار:</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as BusinessSector)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
            >
              <option value="industrial">تولیدی، صنعتی و بسته‌بندی</option>
              <option value="services">خدمات کسب‌وکار و فنی</option>
              <option value="digital_goods">نرم‌افزار و فناوری</option>
              <option value="retail">بازرگانی و فروشگاهی</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-300">توضیحات و مشخصات اولیه (اختیاری):</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ویژگی‌های خاص، ابعاد، حداقل تیراژ سفارش یا شرایط ارسال..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerateWithGemini}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
              <span>در حال تولید هوشمند عناوین و متن با جمنای...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>✨ تولید ۵ عنوان جذاب + متن کامل تبلیغاتی با هوش مصنوعی</span>
            </>
          )}
        </button>

        {/* Generated Output Preview */}
        {generatedResult && (
          <div className="space-y-4 pt-2">
            {/* Header with SEO badge & Provider */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300 font-medium">موتور فعال:</span>
                <span className="font-mono font-bold text-amber-400">{generatedResult.provider}</span>
              </div>
              <div className="flex items-center space-x-1.5 space-x-reverse font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>امتیاز سئو و جذابیت: ٪{toPersianDigits(generatedResult.seoScore)}</span>
              </div>
            </div>

            {/* 1. Suggested Topic / Title Selector */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-200">
                ۱. انتخاب تیتر بهینه از میان گزینه‌های پیشنهادی جمنای:
              </div>
              <div className="space-y-1.5">
                {generatedResult.topics.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedTopicIndex(idx)}
                    className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between text-xs ${
                      selectedTopicIndex === idx
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${selectedTopicIndex === idx ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                        {idx + 1}
                      </span>
                      <span>{t}</span>
                    </div>
                    {selectedTopicIndex === idx && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Full Ad Description Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-200">
                  ۲. متن کامل آگهی و مشخصات تولیدشده:
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(selectedBodyText, 'body')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center space-x-1 space-x-reverse"
                >
                  {copiedField === 'body' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'body' ? 'کپی شد' : 'کپی متن'}</span>
                </button>
              </div>
              <textarea
                rows={6}
                value={selectedBodyText}
                onChange={(e) => setSelectedBodyText(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:border-amber-500 leading-relaxed font-sans"
              />
            </div>

            {/* 3. Bullet points and hashtags */}
            {generatedResult.suggestedHashtags && generatedResult.suggestedHashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {generatedResult.suggestedHashtags.map((h, i) => (
                  <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-blue-400">
                    {h}
                  </span>
                ))}
              </div>
            )}

            {/* Apply Button */}
            <div className="flex items-center justify-end space-x-3 space-x-reverse pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 space-x-reverse"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>جایگذاری تیتر و متن در کمپین</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
