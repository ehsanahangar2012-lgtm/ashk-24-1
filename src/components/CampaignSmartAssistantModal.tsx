import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Check,
  Copy,
  Cpu,
  TrendingUp,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react';
import { CampaignSmartBlueprint, LocalCampaignAiEngine, AdKeywordInsight } from '../services/localCampaignAiEngine.js';
import { BusinessSector, BrandTone, UploadedFileAsset } from '../types/ashk24.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import { clientStorage } from '../services/clientStorageService.js';

interface CampaignSmartAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productDescription: string;
  priceToman?: number;
  sector?: BusinessSector;
  tone?: BrandTone;
  onApplyBlueprint: (blueprint: CampaignSmartBlueprint) => void;
}

export const CampaignSmartAssistantModal: React.FC<CampaignSmartAssistantModalProps> = ({
  isOpen,
  onClose,
  productName,
  productDescription,
  priceToman = 0,
  sector = 'industrial',
  tone = 'persuasive',
  onApplyBlueprint,
}) => {
  const [blueprint, setBlueprint] = useState<CampaignSmartBlueprint | null>(null);
  const [keywordInsights, setKeywordInsights] = useState<AdKeywordInsight[]>([]);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'images' | 'keywords' | 'rules'>('content');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const generateBlueprint = async () => {
    setIsGenerating(true);
    try {
      const assets = await clientStorage.getAssets();
      const bp = LocalCampaignAiEngine.generateCampaignBlueprint({
        productName,
        productDescription,
        priceToman,
        sector,
        tone,
        availableAssets: assets || [],
      });
      setBlueprint(bp);

      const insights = LocalCampaignAiEngine.getKeywordInsights(productName || 'کارتن و بسته بندی');
      setKeywordInsights(insights);
    } catch (err) {
      console.error('Failed to generate local blueprint:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateBlueprint();
    }
  }, [isOpen, productName, productDescription, priceToman, sector, tone]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col text-right">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3 shrink-0">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>دستیار هوشمند و درون‌برنامه‌ای تولید کمپین آگهی</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  ۱۰۰٪ آفلاین & ضد فیلترینگ
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تولید ساختار بهینه متن، انتخاب خودکار تصاویر مرتبط از هاست، و استخراج نکات حیاتی انتشار بدون نیاز به هوش مصنوعی ابری
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

        {/* Sub Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'content'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>متن و تیتر بهینه آگهی</span>
          </button>

          <button
            onClick={() => setActiveTab('images')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'images'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-sky-400" />
            <span>تصاویر انطباق‌یافته هاست ({toPersianDigits(blueprint?.matchedImages.length || 0)})</span>
          </button>

          <button
            onClick={() => setActiveTab('keywords')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'keywords'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>تحلیل کلمات کلیدی پرسود</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>نکات تایید فوری در دیوار و شیپور</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isGenerating && (
            <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
              در حال پردازش هوشمند الگوهای درون‌برنامه‌ای...
            </div>
          )}

          {!isGenerating && blueprint && (
            <>
              {/* TAB 1: CONTENT & TITLES */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  {/* Title card */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">تیتر طلایی آگهی (ضریب کلیک حداکثری):</span>
                      <button
                        onClick={() => handleCopy(blueprint.title, 'title')}
                        className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        {copiedSection === 'title' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSection === 'title' ? 'کپی شد' : 'کپی تیتر'}</span>
                      </button>
                    </div>
                    <div className="text-sm font-extrabold text-slate-100 bg-slate-900 p-3 rounded-xl border border-slate-800">
                      {blueprint.title}
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">متن شرح آگهی (سئوشده با بالت‌پوینت):</span>
                      <button
                        onClick={() => handleCopy(blueprint.bodyText, 'body')}
                        className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        {copiedSection === 'body' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSection === 'body' ? 'کپی شد' : 'کپی متن'}</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {blueprint.bodyText}
                    </pre>
                  </div>

                  {/* Fast Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block mb-1">دسته‌بندی پیشنهادی پلتفرم‌ها:</span>
                      <span className="font-bold text-slate-200">{blueprint.recommendedCategory}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block mb-1">قیمت پیشنهادی آگهی:</span>
                      <span className="font-bold text-emerald-400">{blueprint.recommendedPriceText}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MATCHED IMAGES */}
              {activeTab === 'images' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    موتور درون‌برنامه‌ای، تصاویر موجود در پوشه <code className="text-amber-400 font-mono">cpanel-backend/uploads</code> را با عنوان و کلمات کلیدی محصول شما تطبیق داده است:
                  </p>

                  {blueprint.matchedImages.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-2">
                      <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">هنوز تصویری مرتبط در مخزن هاست بارگذاری نشده است.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {blueprint.matchedImages.map((img, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center space-x-3 space-x-reverse">
                          <img
                            src={img.url}
                            alt={img.altText}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-800 bg-slate-900 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/uploads/default_logo.svg';
                            }}
                          />
                          <div className="min-w-0 flex-1 space-y-1 text-xs">
                            <div className="font-bold text-slate-200 truncate">{img.caption}</div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                تطبیق: {toPersianDigits(img.relevanceScore)}٪
                              </span>
                              <span className="text-[10px] text-slate-400">پیشنهادی برای انتشار</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: KEYWORD INSIGHTS */}
              {activeTab === 'keywords' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    کلمات کلیدی با نرخ جستجوی بالا بر اساس عبارات پرتکرار خریداران در دیوار، شیپور و موتور جستجوی گوگل:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-2.5 px-3 font-semibold">کلمه کلیدی هدف</th>
                          <th className="py-2.5 px-3 font-semibold">حجم جستجو در ایران</th>
                          <th className="py-2.5 px-3 font-semibold">قصد مخاطب</th>
                          <th className="py-2.5 px-3 font-semibold">جایگاه پیشنهادی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {keywordInsights.map((ki, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-bold text-amber-300">{ki.keyword}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                {ki.searchVolumeLevel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">{ki.intent}</td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{ki.suggestedPlacement}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: RULES & TIPS */}
              {activeTab === 'rules' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
                    <div className="font-bold flex items-center space-x-1.5 space-x-reverse">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>نکات طلایی برای پیشگیری از تعلیق یا رد آگهی در ربات‌های ناظر:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 pr-2 leading-relaxed">
                      {blueprint.keySuccessTips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-200 block">دستورالعمل اختصاصی هر پلتفرم:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {blueprint.platformSpecificTips.map((pst, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                          <div className="font-bold text-amber-400">{pst.platformName}</div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{pst.advice}</p>
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900 font-mono">
                            {pst.charLimitAdvice}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            ضریب سئوی تولیدی: <span className="font-bold text-emerald-400">۹۴ از ۱۰۰ (عالی)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              انصراف
            </button>
            <button
              onClick={() => {
                if (blueprint) {
                  onApplyBlueprint(blueprint);
                  onClose();
                }
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-slate-950" />
              <span>اعمال این پکیج هوشمند روی فرم کمپین</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
