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
  Plus,
  Trash2,
  Check,
  Layers,
  HelpCircle,
  Briefcase,
  Users,
  Building,
} from 'lucide-react';
import { CompanyProfile, BrandTone, BusinessSector } from '../types/ashk24.js';
import { ImageUploader } from './ImageUploader.js';
import { SmartHelpButton } from './SmartHelpModal.js';
import { toPersianDigits, getJalaliCurrentDate } from '../utils/persianUtils.js';

interface CompanyProfileViewProps {
  company: CompanyProfile | null;
  companies?: CompanyProfile[];
  onSave: (updated: Partial<CompanyProfile>) => Promise<void> | void;
  onSelectCompany?: (id: string) => Promise<void> | void;
  onCreateCompany?: (newCompany: Omit<CompanyProfile, 'id' | 'updatedAt'>) => Promise<void> | void;
  onDeleteCompany?: (id: string) => Promise<void> | void;
}

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({
  company,
  companies = [],
  onSave,
  onSelectCompany,
  onCreateCompany,
  onDeleteCompany,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(company?.id || '');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form Fields
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
  const [clientType, setClientType] = useState<'owned' | 'client_account'>(company?.clientType || 'owned');
  const [keywords, setKeywords] = useState<string[]>(company?.keywords || []);
  const [newKeyword, setNewKeyword] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Company Modal Form Fields
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyBrand, setNewCompanyBrand] = useState('');
  const [newCompanyPhone, setNewCompanyPhone] = useState('');
  const [newCompanySector, setNewCompanySector] = useState<BusinessSector>('industrial');
  const [newCompanyType, setNewCompanyType] = useState<'owned' | 'client_account'>('client_account');
  const [isCreating, setIsCreating] = useState(false);

  // Sync form when selected company changes
  useEffect(() => {
    const activeTarget = companies.find((c) => c.id === selectedCompanyId) || company;
    if (activeTarget) {
      setSelectedCompanyId(activeTarget.id);
      setName(activeTarget.name || '');
      setBrandName(activeTarget.brandName || '');
      setPhoneNumber(activeTarget.phoneNumber || '');
      setEmail(activeTarget.email || '');
      setWebsite(activeTarget.website || '');
      setAddress(activeTarget.address || '');
      setSector(activeTarget.sector || 'industrial');
      setDefaultTone(activeTarget.defaultTone || 'persuasive');
      setTargetAudience(activeTarget.targetAudience || '');
      setContactPerson(activeTarget.contactPerson || '');
      setLogoUrl(activeTarget.logoUrl || '');
      setTaxId(activeTarget.taxId || '');
      setRegistrationNumber(activeTarget.registrationNumber || '');
      setTelegramChannel(activeTarget.telegramChannel || '');
      setInstagramHandle(activeTarget.instagramHandle || '');
      setAboutUsSummary(activeTarget.aboutUsSummary || '');
      setProductImages(activeTarget.productImages || []);
      setClientType(activeTarget.clientType || 'owned');
      setKeywords(activeTarget.keywords || []);
    }
  }, [selectedCompanyId, company, companies]);

  const handleSwitchCompany = async (cmpId: string) => {
    setSelectedCompanyId(cmpId);
    if (onSelectCompany) {
      await onSelectCompany(cmpId);
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave({
        id: selectedCompanyId,
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
        clientType,
        keywords,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newCompanyPhone.trim()) return;
    setIsCreating(true);
    try {
      if (onCreateCompany) {
        await onCreateCompany({
          name: newCompanyName.trim(),
          brandName: newCompanyBrand.trim() || newCompanyName.trim(),
          phoneNumber: newCompanyPhone.trim(),
          email: '',
          website: '',
          address: '',
          sector: newCompanySector,
          defaultTone: 'persuasive',
          keywords: [newCompanyName.trim(), newCompanyBrand.trim()].filter(Boolean),
          targetAudience: 'مشتریان و متقاضیان این حوزه',
          logoUrl: '',
          contactPerson: '',
          taxId: '',
          registrationNumber: '',
          telegramChannel: '',
          instagramHandle: '',
          catalogPdfUrl: '',
          productImages: [],
          aboutUsSummary: `معرفی خدمات و محصولات ${newCompanyName.trim()}`,
          clientType: newCompanyType,
          isActive: false,
          isDefault: false,
        });
        setShowCreateModal(false);
        setNewCompanyName('');
        setNewCompanyBrand('');
        setNewCompanyPhone('');
      }
    } catch (err) {
      console.error('Error creating company:', err);
    } finally {
      setIsCreating(false);
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
              <span>مدیریت شرکت‌ها و مشتریان تبلیغاتی (Multi-Client Hub)</span>
            </h2>
            <SmartHelpButton
              content={{
                title: 'سامانه مدیریت چندمشتری و شرکت‌های هدف',
                summary: 'این بخش به شما امکان می‌دهد برای شرکت‌ها، سازمان‌ها، برندهای تابعه و مشتریان تبلیغاتی گوناگون بدون تداخل اطلاعات، پروفایل مستقل و کمپین اختصاصی بسازید.',
                steps: [
                  'برای هر مشتری یا شرکت جدید، دکمه «افزودن شرکت/مشتری جدید» را بزنید.',
                  'شماره تماس اختصاصی، برند، لوگو، کاتالوگ و حوزه صنعت آن شرکت را تعریف کنید.',
                  'در بخش «مدیریت کمپین‌ها»، هنگام ایجاد آگهی یا کمپین جدید، شرکت هدف را انتخاب کنید تا متون و کلمات کلیدی خودکار طبق هویت همان شرکت تولید شوند.',
                  'سامانه به صورت آفلاین و روی هاست سی‌پنل به تفکیک هر مشتری، آگهی‌ها و گزارش‌های مربوطه را ثبت و منتشر می‌نماید.'
                ],
                offlineNote: 'تمام پروفایل‌ها در دیتابیس سی‌پنل و کش لوکال ذخیره شده و بدون اینترنت بین‌الملل عمل می‌کنند.'
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            تعریف، ویرایش و سوییچ بین پروفایل‌های شرکتی، هلدینگ‌ها و مشتریان تبلیغاتی جهت تولید و انتشار اختصاصی آگهی‌ها
          </p>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 space-x-reverse px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن شرکت / مشتری جدید</span>
          </button>

          {saveSuccess && (
            <div className="flex items-center space-x-1.5 space-x-reverse text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>ذخیره شد</span>
            </div>
          )}
        </div>
      </div>

      {/* Companies Tab / Switcher Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-slate-300">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>لیست شرکت‌ها و مشتریان فعال سامانه ({toPersianDigits(companies.length || 1)} مورد):</span>
          </div>
          <span className="text-[11px] text-slate-400">
            تاریخ امروز: {getJalaliCurrentDate()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(companies.length > 0 ? companies : company ? [company] : []).map((cmp) => {
            const isSelected = cmp.id === selectedCompanyId;
            const isActive = cmp.isActive || cmp.id === company?.id;
            return (
              <div
                key={cmp.id}
                onClick={() => handleSwitchCompany(cmp.id)}
                className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-100 truncate">
                      {cmp.brandName || cmp.name}
                    </h3>
                    {isActive && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                        پیش‌فرض فعال
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">
                    {cmp.name}
                  </p>
                  <div className="mt-2 flex items-center space-x-2 space-x-reverse text-[10px] text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {cmp.clientType === 'client_account' ? 'مشتری تبلیغاتی' : 'شرکت اصلی'}
                    </span>
                    <span className="font-mono text-amber-300/80">{cmp.phoneNumber}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                    {isSelected ? '✓ در حال ویرایش' : 'انتخاب جهت ویرایش'}
                  </span>
                  {onDeleteCompany && companies.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`آیا از حذف شرکت «${cmp.brandName || cmp.name}» اطمینان دارید؟`)) {
                          onDeleteCompany(cmp.id);
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10"
                      title="حذف شرکت"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Identity */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 space-x-reverse text-amber-400 text-xs font-bold">
              <Building2 className="w-4 h-4" />
              <span>هویت حقوقی و برند تجاری: {name || brandName}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="text-xs text-slate-400">نوع حساب:</span>
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value as 'owned' | 'client_account')}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:border-amber-500"
              >
                <option value="owned">شرکت اصلی / برند خودمان</option>
                <option value="client_account">مشتری تبلیغاتی / شرکت طرف قرارداد</option>
              </select>
            </div>
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
              <label className="text-xs font-semibold text-slate-300">حوزه فعالیت و صنف کاری:</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as BusinessSector)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="industrial">صنعتی، کارخانجات و تولیدات</option>
                <option value="industrial_machinery">ماشین‌آلات و تجهیزات صنعتی</option>
                <option value="b2b">خدمات بازرگانی و تجارت B2B</option>
                <option value="digital_goods">کالای دیجیتال و الکترونیک</option>
                <option value="services">خدمات تخصصی و کسب‌وکار</option>
                <option value="real_estate">املاک و مستغلات</option>
                <option value="automotive">خودرو و لوازم یدکی</option>
                <option value="home_appliances">لوازم خانگی و دکوراسیون</option>
                <option value="food_beverage">مواد غذایی و نوشیدنی</option>
                <option value="construction">ساختمانی و مصالح</option>
                <option value="fashion">پوشاک و نساجی</option>
                <option value="healthcare">پزشکی و سلامت</option>
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
                <option value="luxurious">لوکس و پرمیوم</option>
                <option value="urgent">فوری و پرمخاطب</option>
              </select>
            </div>
          </div>

          {/* Keywords vault for this specific company */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5 space-x-reverse">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>کلمات کلیدی و برچسب‌های تخصصی این شرکت (جهت سئو و تولید متن آگهی):</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
                placeholder="کلمه کلیدی جدید را وارد کرده و Enter بزنید..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                افزودن
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs"
                >
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-amber-400 hover:text-rose-400 mr-1"
                  >
                    ×
                  </button>
                </span>
              ))}
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
              <label className="text-xs font-semibold text-slate-300">شماره موبایل جهت ثبت‌نام و دریافت OTP:</label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0915..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">ایمیل سازمانی:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@company.ir"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">آدرس وب‌سایت رسمی:</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="http://www.company.ir"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">نشانی دفتر مرکزی / کارخانه / فروشگاه:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="شهر، خیابان، پلاک..."
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
                placeholder="@channel_name"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">صفحه اینستاگرام:</label>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="@instagram_page"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Summary & Media Assets */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 space-x-reverse text-amber-400 text-xs font-bold border-b border-slate-800 pb-3">
            <ImageIcon className="w-4 h-4" />
            <span>مخزن تصاویر سازمانی و معرفی شرکت</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">معرفی اجمالی شرکت (برای بخش درباره ما در وبلاگ‌ها و پرتال‌ها):</label>
            <textarea
              rows={3}
              value={aboutUsSummary}
              onChange={(e) => setAboutUsSummary(e.target.value)}
              placeholder="شرح توانمندی‌ها، محصولات اصلی، استانداردها و راه‌های ارتباطی..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <ImageUploader
                label="لوگوی رسمی این شرکت (PNG با پس‌زمینه شفاف):"
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
                label="تصاویر شاخص کاتالوگ و محصولات این شرکت:"
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
            <span>{isSaving ? 'در حال ذخیره‌سازی در دیتابیس...' : 'ذخیره مشخصات شرکت'}</span>
          </button>
        </div>
      </form>

      {/* Modal for Creating New Company */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-slate-100" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-2 space-x-reverse">
                <Plus className="w-4 h-4" />
                <span>افزودن شرکت یا مشتری تبلیغاتی جدید</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">نام رسمی شرکت / مشتری:</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="مثال: شرکت صنایع بسته‌بندی آریان"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">نام برند یا تابلوی تجاری:</label>
                <input
                  type="text"
                  value={newCompanyBrand}
                  onChange={(e) => setNewCompanyBrand(e.target.value)}
                  placeholder="مثال: آریان پک"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">شماره موبایل جهت ثبت‌نام و دریافت OTP:</label>
                <input
                  type="text"
                  required
                  value={newCompanyPhone}
                  onChange={(e) => setNewCompanyPhone(e.target.value)}
                  placeholder="0915..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">حوزه فعالیت:</label>
                  <select
                    value={newCompanySector}
                    onChange={(e) => setNewCompanySector(e.target.value as BusinessSector)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                  >
                    <option value="industrial">صنعتی و کارخانجات</option>
                    <option value="industrial_machinery">ماشین‌آلات صنعتی</option>
                    <option value="b2b">خدمات B2B و بازرگانی</option>
                    <option value="digital_goods">کالای دیجیتال</option>
                    <option value="services">خدمات تخصصی</option>
                    <option value="real_estate">املاک و مسکن</option>
                    <option value="food_beverage">مواد غذایی</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">نوع حساب:</label>
                  <select
                    value={newCompanyType}
                    onChange={(e) => setNewCompanyType(e.target.value as 'owned' | 'client_account')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                  >
                    <option value="client_account">مشتری تبلیغاتی</option>
                    <option value="owned">شرکت اصلی</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isCreating ? 'در حال ایجاد...' : 'ایجاد و ثبت شرکت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
