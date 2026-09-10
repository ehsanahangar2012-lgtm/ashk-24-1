import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  ShieldCheck,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Tag,
  Share2,
  HardDrive,
} from 'lucide-react';
import { CompanyProfile, BrandTone, BusinessSector } from '../types/ashk24.js';
import { ImageUploader } from './ImageUploader.js';
import { SmartHelpButton } from './SmartHelpModal.js';
import { toPersianDigits } from '../utils/persianUtils.js';

interface CompanyProfileViewProps {
  company: CompanyProfile | null;
  onSave: (updated: Partial<CompanyProfile>) => Promise<void> | void;
}

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({ company, onSave }) => {
  const [name, setName] = useState(company?.name || '');
  const [brandName, setBrandName] = useState(company?.brandName || '');
  const [phoneNumber, setPhoneNumber] = useState(company?.phoneNumber || '');
  const [email, setEmail] = useState(company?.email || '');
  const [website, setWebsite] = useState(company?.website || '');
  const [address, setAddress] = useState(company?.address || '');
  const [sector, setSector] = useState<BusinessSector>(company?.sector || 'industrial');
  const [defaultTone, setDefaultTone] = useState<BrandTone>(company?.defaultTone || 'persuasive');
  const [targetAudience, setTargetAudience] = useState(company?.targetAudience || '');
  const [contactPerson, setContactPerson] = useState(company?.contactPerson || '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl || '');
  const [taxId, setTaxId] = useState(company?.taxId || '');
  const [registrationNumber, setRegistrationNumber] = useState(company?.registrationNumber || '');
  const [telegramChannel, setTelegramChannel] = useState(company?.telegramChannel || '');
  const [instagramHandle, setInstagramHandle] = useState(company?.instagramHandle || '');
  const [aboutUsSummary, setAboutUsSummary] = useState(company?.aboutUsSummary || '');
  const [productImages, setProductImages] = useState<string[]>(company?.productImages || []);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setBrandName(company.brandName || '');
      setPhoneNumber(company.phoneNumber || '');
      setEmail(company.email || '');
      setWebsite(company.website || '');
      setAddress(company.address || '');
      setSector(company.sector || 'industrial');
      setDefaultTone(company.defaultTone || 'persuasive');
      setTargetAudience(company.targetAudience || '');
      setContactPerson(company.contactPerson || '');
      setLogoUrl(company.logoUrl || '');
      setTaxId(company.taxId || '');
      setRegistrationNumber(company.registrationNumber || '');
      setTelegramChannel(company.telegramChannel || '');
      setInstagramHandle(company.instagramHandle || '');
      setAboutUsSummary(company.aboutUsSummary || '');
      setProductImages(company.productImages || []);
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave({
        name,
        brandName,
        phoneNumber,
        email,
        website,
        address,
        sector,
        defaultTone,
        targetAudience,
        contactPerson,
        logoUrl,
        taxId,
        registrationNumber,
        telegramChannel,
        instagramHandle,
        aboutUsSummary,
        productImages,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>پروفایل سازمانی و هوش کسب‌وکار (Business Intelligence)</span>
            </h2>
            <SmartHelpButton
              content={{
                title: 'هوش کسب‌وکار و اطلاعات پایه شرکت',
                summary: 'تمامی اطلاعات مندرج در این بخش به عنوان منبع حقیقت (Single Source of Truth) برای ثبت خودکار نام، تلفن، تصاویر و اطلاعات تماس در تمامی پلتفرم‌های انتشار آگهی استفاده می‌شود.',
                steps: [
                  'شماره موبایل و تلفن ثابت رسمی کسب‌وکار را با دقت وارد نمایید (جهت دریافت کدهای تایید و درج در آگهی‌ها).',
                  'تصاویر کاتالوگ و لوگوی رسمی شرکت را در هاست ذخیره کنید.',
                  'لحن سازمانی و جامعه هدف را جهت تولید خودکار متون مناسب تعیین نمایید.'
                ],
                offlineNote: 'اطلاعات در دیتابیس cPanel و همچنین حافظه آفلاین به صورت پایدار ذخیره می‌گردد.'
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            مشخصات رسمی شرکت، شماره‌های تماس، لوگو، تصاویر سازمانی و شناسنامه تجاری جهت درج اتوماتیک در فرم‌های وب
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center space-x-1.5 space-x-reverse text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
            <span>اطلاعات شرکت با موفقیت در دیتابیس ذخیره شد</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Identity */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 space-x-reverse text-amber-400 text-xs font-bold border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4" />
            <span>هویت حقوقی و برند تجاری</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">نام رسمی شرکت / واحد تولیدی:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مجتمع صنایع چاپ و کارتن‌سازی اشک قلم"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">نام برند یا تابلوی تجاری:</label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="مثال: کارتن اشک قلم"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">نام شخص رابط / مسئول آگهی:</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="مثال: مهندس احسان آهنگر"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">حوزه فعالیت و صنعت:</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as BusinessSector)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="industrial">صنعتی، تولیدی و ماشین‌آلات</option>
                <option value="packaging">صنایع بسته‌بندی، کارتن و چاپ</option>
                <option value="digital_goods">خدمات نرم‌افزاری و دیجیتال</option>
                <option value="services">خدمات بازرگانی و مشاوره‌ای</option>
                <option value="retail">فروشگاهی و توزیع کالا</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">لحن نگارش متون آگهی:</label>
              <select
                value={defaultTone}
                onChange={(e) => setDefaultTone(e.target.value as BrandTone)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="persuasive">ترغیب‌کننده و بازاریابی قوی</option>
                <option value="formal">رسمی و اداری</option>
                <option value="friendly">صمیمی و دوستانه</option>
                <option value="technical">فنی و مهندسی</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Info */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 space-x-reverse text-amber-400 text-xs font-bold border-b border-slate-800 pb-3">
            <Phone className="w-4 h-4" />
            <span>راه‌های ارتباطی و آدرس‌ها (جهت درج خودکار در آگهی‌ها)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">شماره موبایل دریافت OTP:</label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0912..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">ایمیل سازمانی:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@ashkghalam.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">آدرس وب‌سایت:</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://ashkghalam.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">نشانی دفتر مرکزی / کارخانه:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="تهران، شهرک صنعتی..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">کانال یا ربات تلگرام:</label>
              <input
                type="text"
                value={telegramChannel}
                onChange={(e) => setTelegramChannel(e.target.value)}
                placeholder="@ashkghalam"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">صفحه اینستاگرام:</label>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="@ashkghalam_box"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Summary & Media Assets */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 space-x-reverse text-amber-400 text-xs font-bold border-b border-slate-800 pb-3">
            <ImageIcon className="w-4 h-4" />
            <span>مخزن تصاویر سازمانی و درباره ما</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">معرفی اجمالی شرکت (برای بخش «درباره ما» در وبلاگ‌ها و پرتال‌ها):</label>
            <textarea
              rows={3}
              value={aboutUsSummary}
              onChange={(e) => setAboutUsSummary(e.target.value)}
              placeholder="شرح توانمندی‌ها، ظرفیت تولید روزانه، استانداردها و افتخارات..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <ImageUploader
                label="لوگوی رسمی شرکت (PNG با پس‌زمینه شفاف):"
                category="logo"
                currentUrls={logoUrl ? [logoUrl] : []}
                onUploadSuccess={(urls) => {
                  if (urls[0]) setLogoUrl(urls[0]);
                }}
                onRemoveUrl={() => setLogoUrl('')}
                compact={true}
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <ImageUploader
                label="تصاویر شاخص کاتالوگ و محصولات شرکت:"
                category="product"
                multiple={true}
                currentUrls={productImages}
                onUploadSuccess={(urls) => {
                  setProductImages((prev) => [...prev, ...urls]);
                }}
                onRemoveUrl={(urlToRemove) => {
                  setProductImages((prev) => prev.filter((u) => u !== urlToRemove));
                }}
                compact={true}
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2 space-x-reverse disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'در حال ذخیره‌سازی در دیتابیس...' : 'ذخیره مشخصات سازمانی'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
