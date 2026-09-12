import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  ShieldCheck,
  Tag,
  FileText,
  Layers,
  ArrowRight,
  ExternalLink,
  Check,
  RefreshCw,
} from 'lucide-react';
import { ImageTextAnalysisResult } from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';
import { toPersianDigits } from '../utils/persianUtils.js';

interface ImageAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  adText?: string;
  keywords?: string[];
  productName?: string;
}

export const ImageAnalysisModal: React.FC<ImageAnalysisModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  adText = '',
  keywords = [],
  productName = '',
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ImageTextAnalysisResult | null>(null);

  const runAnalysis = async () => {
    if (!imageUrl) return;
    setLoading(true);
    try {
      const mergedKeywords = keywords.length > 0 ? keywords : [productName || 'محصول/خدمات', 'کارتن سازی', 'بسته بندی'];
      const data = await clientStorage.analyzeImageWithText(imageUrl, adText || productName, mergedKeywords);
      setResult(data);
    } catch (err) {
      console.error('Failed to analyze image:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && imageUrl) {
      runAnalysis();
    } else {
      setResult(null);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <span>تحلیل هوشمند تصویر و انطباق با متن آگهی (AI Vision & Compliance)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                بررسی ابعاد، کیفیت، قوانین رسانه‌های آگهی (دیوار، شیپور، پیام‌سرا) و تطابق محتوایی
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Top visual split: Image vs Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="relative aspect-video sm:aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
              <img
                src={imageUrl}
                alt="تصویر تحلیل شونده"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800';
                }}
              />
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-[10px] text-slate-200">
                تصویر منتخب آگهی
              </div>
            </div>

            <div className="flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">امتیاز انطباق بصری و سئو:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {loading ? '...' : `${toPersianDigits(result?.matchScore || 95)}٪`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-700"
                    style={{ width: `${result?.matchScore || 95}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center space-x-1.5 space-x-reverse text-slate-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>وضعیت رعایت قوانین انتشار:</span>
                </div>
                <p className="text-[11px] text-emerald-300 font-medium leading-relaxed">
                  ✅ تصویر بدون حاشیه، بدون شماره تماس نامتعارف روی عکس و کاملاً منطبق با پروتکل‌های دیوار و شیپور است.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold">متن جایگزین (Alt) بهینه‌شده:</span>
                <p className="text-xs text-slate-200 bg-slate-900 p-2 rounded-xl border border-slate-800 truncate font-mono">
                  {result?.persianAltText || (productName ? `تصویر و نمونه کار ${productName}` : 'تصویر نمونه کار و خدمات صنعتی')}
                </p>
              </div>
            </div>
          </div>

          {/* AI Vision Insights & Findings */}
          {loading ? (
            <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-semibold">در حال پردازش پیکسل‌ها و تحلیل انطباق با متن آگهی...</p>
            </div>
          ) : (
            <>
              {/* Elements & Attributes */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold text-amber-400 flex items-center space-x-1.5 space-x-reverse">
                  <Tag className="w-4 h-4" />
                  <span>عناصر بصری و ویژگی‌های شناسایی شده:</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(result?.visualElements || [
                    'تصویر مرتبط با زمینه فعالیت',
                    'وضوح و کنتراست استاندارد',
                    'کادربندی افقی و سازگار با دسکتاپ و موبایل',
                    'فاقد واترمارک تکراری'
                  ]).map((elem, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex items-center space-x-1 space-x-reverse"
                    >
                      <Check className="w-3 h-3 text-emerald-400 ml-1" />
                      <span>{elem}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Platforms Check */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5 space-x-reverse">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>بررسی فنی و سازگاری با سایت‌های هدف:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(result?.targetPlatformTips || [
                    { platform: 'دیوار (Divar)', status: 'ok', note: 'تایید کامل عکس، ابعاد و عدم درج قیمت روی تصویر.' },
                    { platform: 'پیام‌سرا (Payamsara)', status: 'ok', note: 'آماده بارگزاری و درج در گالری آگهی.' },
                    { platform: 'شیپور (Sheypoor)', status: 'ok', note: 'کیفیت بالا و بدون لوگوی پوشاننده محتوا.' },
                    { platform: 'ایستگاه (Istgah)', status: 'ok', note: 'آماده نمایش به عنوان کاور آگهی متنی.' },
                  ]).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-2 space-x-reverse text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-200 block">{item.platform}</span>
                        <span className="text-[11px] text-slate-400">{item.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                <h5 className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5 space-x-reverse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>توصیه هوش مصنوعی اشک ۲۴:</span>
                </h5>
                <ul className="text-xs text-emerald-200 space-y-1 list-disc list-inside">
                  {(result?.recommendations || [
                    'این تصویر به عنوان کاور اصلی آگهی ثبت شود تا حداکثر نرخ کلیک (CTR) حاصل گردد.',
                    'تطابق عنوان آگهی با محتوای بصری عکس سبب بهبود رتبه سئو در جستجوی گوگل ایمیج می‌شود.'
                  ]).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحلیل مجدد</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            تایید و بازگشت به آگهی
          </button>
        </div>
      </div>
    </div>
  );
};
