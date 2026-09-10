import React, { useState } from 'react';
import {
  PenTool,
  Sparkles,
  Search,
  Copy,
  Check,
  Cpu,
  BarChart2,
  FileText,
  Save,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { BrandTone, BusinessSector, ContentGenerationResult, SeoAnalysisResult } from '../types/ashk24.js';
import { toPersianDigits } from '../utils/persianUtils.js';
import { clientStorage } from '../services/clientStorageService.js';
import { SmartHelpButton } from './SmartHelpModal.js';

interface ContentSeoModuleProps {
  onSaveToCampaigns: (content: ContentGenerationResult) => void;
}

export const ContentSeoModule: React.FC<ContentSeoModuleProps> = ({ onSaveToCampaigns }) => {
  const [productName, setProductName] = useState('سامانه هوشمند اتوماسیون بازاریابی اشک ۲۴');
  const [description, setDescription] = useState(
    'پلتفرم خودمختار بازاریابی و مدیریت آگهی بدون دخالت انسان، مجهز به دستیار تولید محتوا، کشف رسانه، استخراج OTP پیامک و سیستم آفلاین پشتیبان'
  );
  const [priceToman, setPriceToman] = useState<number>(18500000);
  const [tone, setTone] = useState<BrandTone>('persuasive');
  const [sector, setSector] = useState<BusinessSector>('digital_goods');
  const [keywords, setKeywords] = useState<string>('اتوماسیون بازاریابی, هوش مصنوعی سازمانی, دیوار و شیپور, ثبت آگهی خودکار');
  const [targetPlatform, setTargetPlatform] = useState<string>('دیوار و وبلاگ‌ها');
  const [forceOffline, setForceOffline] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<ContentGenerationResult | null>(null);
  const [seoResult, setSeoResult] = useState<SeoAnalysisResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const handleGenerate = async () => {
    setLoading(true);
    setCopied(false);
    setSaved(false);

    try {
      const keywordList = keywords.split(',').map((k) => k.trim()).filter(Boolean);
      
      const data = await clientStorage.generateContent({
        productName,
        description,
        priceToman: Number(priceToman),
        tone,
        sector,
        keywords: keywordList,
        targetPlatform,
        forceOfflineFallback: forceOffline,
      });

      setGeneratedResult(data);

      // Trigger SEO analysis (local fallback)
      let seoData: SeoAnalysisResult;
      try {
        const seoRes = await fetch('/cpanel-backend/api/index.php?route=ai/analyze-seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: data.bodyText,
            keywords: keywordList,
          }),
        });
        if (seoRes.ok) {
          seoData = await seoRes.json();
        } else {
          throw new Error('Fallback to local SEO');
        }
      } catch (e) {
        // Local SEO calculation
        const words = data.bodyText.trim().split(/\s+/).length;
        const paragraphs = data.bodyText.split(/\n\s*\n/).length;
        const chars = data.bodyText.length;
        const density = keywordList.map((kw) => {
          const count = (data.bodyText.match(new RegExp(kw, 'gi')) || []).length;
          return {
            keyword: kw,
            count,
            percentage: Math.round((count / Math.max(1, words)) * 1000) / 10,
          };
        });

        seoData = {
          keywordDensity: density,
          readabilityScore: 92,
          seoScore: data.seoScore || 95,
          strengths: ['استفاده بهینه از کلمات کلیدی فارسی', 'داشتن تیتر جذّاب و بهینه‌سازی شده', 'دارای ساختار استاندارد خوانایی'],
          improvements: ['افزودن متون طولانی‌تر برای سئوی برتر موتورهای جستجو'],
          persianTextMetrics: {
            wordCount: words,
            paragraphCount: paragraphs,
            characterCount: chars,
          },
        };
      }
      setSeoResult(seoData);
    } catch (e) {
      console.error('Failed to generate content:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedResult) {
      navigator.clipboard.writeText(`${generatedResult.title}\n\n${generatedResult.bodyText}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    if (generatedResult) {
      onSaveToCampaigns(generatedResult);
      setSaved(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
            <PenTool className="w-5 h-5 text-amber-400" />
            <span>عامل هوشمند تولید محتوا و سئو (Content & SEO Engine)</span>
            <SmartHelpButton
              content={{
                title: 'دستیار هوشمند تولید محتوا و سئو',
                summary: 'این ابزار با بهره‌گیری از مدل‌های هوش مصنوعی و موتور پردازش محلی، متن‌های کاملاً بهینه‌سازی شده با سئوی عالی برای آگهی‌های دیوار، ایستگاه، سایت‌های خبری و وبلاگ‌ها آماده می‌کند.',
                steps: [
                  'نام محصول و توضیحات اجمالی را به زبان فارسی وارد کنید.',
                  'لحن نگارش (جذاب، متقاعدکننده، رسمی) و کلمات کلیدی دلخواه خود را تعیین نمایید.',
                  'دکمه تولید محتوا را کلیک کنید تا هوش مصنوعی متن جذاب، هشتگ‌ها و نمره تحلیل سئو را ارائه نماید.',
                  'متن نهایی را با یک کلیک کپی کرده یا مستقیماً به کمپین‌های فعال بفرستید.'
                ],
                offlineNote: 'در حالت موتور آفلاین، سیستم بر پایه الگوهای بهینه‌سازی محلی فارسی نگارش متون تبلیغاتی را کاملاً مستقل هدایت می‌کند.'
              }}
            />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            نگارش متون تبلیغاتی سئوشده، هشتگ‌های پربازدید و تحلیل چگالی کلمات بر اساس پرسونای مخاطب
          </p>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse text-xs bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <span className="text-slate-400 mr-2">تست موتور آفلاین:</span>
          <button
            onClick={() => setForceOffline(!forceOffline)}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              forceOffline
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            {forceOffline ? 'موتور آفلاین فعال است' : 'استفاده از هوش مصنوعی'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Controls */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">نام محصول یا خدمت:</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">توضیحات و خصوصیات کلیدی:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 outline-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">قیمت پیشنهادی (تومان):</label>
              <input
                type="number"
                value={priceToman}
                onChange={(e) => setPriceToman(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">پلتفرم هدف:</label>
              <input
                type="text"
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">لحن برند (Brand Tone):</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as BrandTone)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 outline-none"
              >
                <option value="persuasive">اقناعی و ترغیبی</option>
                <option value="formal">رسمی و اداری</option>
                <option value="friendly">صمیمی و دوستانه</option>
                <option value="urgent">فوری و تخفیف‌دار</option>
                <option value="luxurious">لوکس و پرمیوم</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">حوزه صنعت (Sector):</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as BusinessSector)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 outline-none"
              >
                <option value="digital_goods">کالای دیجیتال و خدمات IT</option>
                <option value="real_estate">املاک و مسکن</option>
                <option value="automotive">خودرو و وسایل نقلیه</option>
                <option value="services">خدمات تخصصی کسب‌وکار</option>
                <option value="industrial">صنعت و ابزارآلات</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">کلمات کلیدی سئو (با کاما جدا کنید):</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-amber-500 outline-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
          >
            {loading ? (
              <span>در حال تولید متن و آنالیز سئو...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>تولید خودکار متن آگهی و سئو</span>
              </>
            )}
          </button>
        </div>

        {/* Generated Output Preview */}
        <div className="lg:col-span-7 space-y-4">
          {!generatedResult ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">محتوایی تولید نشده است</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                اطلاعات را در فرم سمت راست وارد کرده و روی دکمه «تولید خودکار متن آگهی» کلیک کنید.
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              {/* Header Badges */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                      generatedResult.isFallback
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    موتور: {generatedResult.generatedBy}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    امتیاز سئو: %{toPersianDigits(generatedResult.seoScore)}
                  </span>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors flex items-center space-x-1 space-x-reverse"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'کپی شد' : 'کپی'}</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1 space-x-reverse"
                  >
                    {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saved ? 'ذخیره شد' : 'استفاده در کمپین'}</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">عنوان آگهی (Title):</span>
                <h3 className="text-sm font-bold text-slate-100 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {generatedResult.title}
                </h3>
              </div>

              {/* Body */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">متن آگهی سئوشده:</span>
                <pre className="text-xs text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                  {generatedResult.bodyText}
                </pre>
              </div>

              {/* Hashtags & Bullet points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-amber-400 flex items-center space-x-1 space-x-reverse">
                    <Tag className="w-3.5 h-3.5" />
                    <span>هشتگ‌های کلیدی:</span>
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(generatedResult.suggestedHashtags || []).map((h, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-blue-400 flex items-center space-x-1 space-x-reverse">
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>آمار متنی:</span>
                  </span>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <div>تعداد کلمات: {toPersianDigits(seoResult?.persianTextMetrics?.wordCount || 0)}</div>
                    <div>تعداد پاراگراف: {toPersianDigits(seoResult?.persianTextMetrics?.paragraphCount || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
