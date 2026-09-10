import React, { useState } from 'react';
import {
  Building2,
  Save,
  X,
  ShieldCheck,
  Image as ImageIcon,
  Link as LinkIcon,
  HardDrive,
  FolderOpen,
  Globe,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { CompanyProfile, BrandTone, BusinessSector, InternalSiteConfig } from '../types/ashk24.js';
import { ImageUploader } from './ImageUploader.js';
import { ImageUploadVaultModal } from './ImageUploadVaultModal.js';
import { clientStorage } from '../services/clientStorageService.js';

interface CompanyProfileModalProps {
  company: CompanyProfile | null;
  onClose: () => void;
  onSave: (updated: Partial<CompanyProfile>) => void;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  company,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(company?.name || '');
  const [brandName, setBrandName] = useState(company?.brandName || '');
  const [phoneNumber, setPhoneNumber] = useState(company?.phoneNumber || '');
  const [email, setEmail] = useState(company?.email || '');
  const [website, setWebsite] = useState(company?.website || '');
  const [address, setAddress] = useState(company?.address || '');
  const [sector, setSector] = useState<BusinessSector>(company?.sector || 'digital_goods');
  const [defaultTone, setDefaultTone] = useState<BrandTone>(company?.defaultTone || 'persuasive');
  const [targetAudience, setTargetAudience] = useState(company?.targetAudience || '');

  // Asset Vault fields
  const sanitizeUrl = (u?: string) => {
    if (!u || typeof u !== 'string' || u.startsWith('data:') || u.length > 2048) return '';
    return u.trim();
  };

  const [contactPerson, setContactPerson] = useState(company?.contactPerson || '');
  const [logoUrl, setLogoUrl] = useState(() => sanitizeUrl(company?.logoUrl));
  const [taxId, setTaxId] = useState(company?.taxId || '');
  const [registrationNumber, setRegistrationNumber] = useState(company?.registrationNumber || '');
  const [telegramChannel, setTelegramChannel] = useState(company?.telegramChannel || '');
  const [instagramHandle, setInstagramHandle] = useState(company?.instagramHandle || '');
  const [catalogPdfUrl, setCatalogPdfUrl] = useState(() => sanitizeUrl(company?.catalogPdfUrl));
  const [aboutUsSummary, setAboutUsSummary] = useState(company?.aboutUsSummary || '');
  const [productImagesList, setProductImagesList] = useState<string[]>(() =>
    (company?.productImages || []).map(sanitizeUrl).filter(Boolean)
  );

  // Internal Site Config
  const [internalEnabled, setInternalEnabled] = useState<boolean>(
    company?.internalSite?.enabled ?? true
  );
  const [internalType, setInternalType] = useState<'wordpress_rest' | 'cpanel_php_bridge' | 'custom_webhook'>(
    company?.internalSite?.type || 'wordpress_rest'
  );
  const [internalUrl, setInternalUrl] = useState<string>(
    company?.internalSite?.url || company?.website || 'https://ashkghalam.com'
  );
  const [internalUsername, setInternalUsername] = useState<string>(
    company?.internalSite?.username || 'admin'
  );
  const [internalAppPassword, setInternalAppPassword] = useState<string>(
    company?.internalSite?.appPassword || ''
  );
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);

  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [selectingFor, setSelectingFor] = useState<'logo' | 'productImage' | null>(null);

  const getInternalConfig = (): InternalSiteConfig => ({
    enabled: internalEnabled,
    type: internalType,
    url: internalUrl,
    username: internalUsername,
    appPassword: internalAppPassword,
    connectionStatus: 'connected',
    lastPublishDate: company?.internalSite?.lastPublishDate,
    lastPublishPostId: company?.internalSite?.lastPublishPostId,
    lastPublishUrl: company?.internalSite?.lastPublishUrl,
  });

  const handleTestInternalConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await clientStorage.testInternalSiteConnection();
      setConnectionTestResult(res.message);
    } catch (e: any) {
      setConnectionTestResult(`خطا در اتصال: ${e.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // Auto-saves logo & gallery changes immediately to persist the user's upload or select actions on the host
  const triggerAutoSave = (updatedLogoUrl: string, updatedProductImages: string[]) => {
    onSave({
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
      logoUrl: sanitizeUrl(updatedLogoUrl),
      taxId,
      registrationNumber,
      telegramChannel,
      instagramHandle,
      catalogPdfUrl: sanitizeUrl(catalogPdfUrl),
      aboutUsSummary,
      productImages: updatedProductImages.map(sanitizeUrl).filter(Boolean),
      internalSite: getInternalConfig(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
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
      logoUrl: sanitizeUrl(logoUrl),
      taxId,
      registrationNumber,
      telegramChannel,
      instagramHandle,
      catalogPdfUrl: sanitizeUrl(catalogPdfUrl),
      aboutUsSummary,
      productImages: productImagesList.map(sanitizeUrl).filter(Boolean),
      internalSite: getInternalConfig(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">
                گاوصندوق دارایی‌ها و اطلاعات شرکت (Company Asset Vault)
              </h3>
              <p className="text-[11px] text-slate-400">
                این اطلاعات به صورت کامل و خودکار در فرم‌های ثبت‌نام، آگهی‌ها، مقالات و وب‌سایت داخلی درج می‌شود.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Main Info */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-amber-400 text-xs">مشخصات شناسه شرکت:</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">نام رسمی حقوقی شرکت:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">نام برند تجاری:</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">شماره تماس (دریافت OTP):</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">مسئول ارتباطات:</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">ایمیل سازمانی:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="font-semibold text-slate-300">نشانی فیزیکی کارخانه / دفتر:</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Internal Site Direct Publishing Configuration */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Globe className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-amber-400 text-xs">اتصال به وب‌سایت داخلی شرکت (Internal Website CMS):</h4>
              </div>
              <label className="flex items-center space-x-1.5 space-x-reverse cursor-pointer">
                <input
                  type="checkbox"
                  checked={internalEnabled}
                  onChange={(e) => setInternalEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-slate-300 text-[11px] font-semibold">فعال برای انتشار خودکار</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">نوع درگاه وب‌سایت داخلی:</label>
                <select
                  value={internalType}
                  onChange={(e: any) => setInternalType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500"
                >
                  <option value="wordpress_rest">وردپرس (WordPress REST API)</option>
                  <option value="cpanel_php_bridge">پل ارتباطی اختصاصی PHP در cPanel</option>
                  <option value="custom_webhook">وب‌هوک وب‌سایت سفارشی</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">آدرس وب‌سایت / فایل پل:</label>
                <input
                  type="text"
                  value={internalUrl}
                  onChange={(e) => setInternalUrl(e.target.value)}
                  placeholder="https://ashkghalam.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">نام کاربری وردپرس / کاربر:</label>
                <input
                  type="text"
                  value={internalUsername}
                  onChange={(e) => setInternalUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">رمز عبور برنامه (Application Password) / کلید:</label>
                <input
                  type="password"
                  value={internalAppPassword}
                  onChange={(e) => setInternalAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleTestInternalConnection}
                disabled={testingConnection}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-[11px] flex items-center space-x-1.5 space-x-reverse"
              >
                <RotateCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'در حال بررسی اتصال...' : 'تست اتصال زنده'}</span>
              </button>

              {connectionTestResult && (
                <span className="text-[11px] text-emerald-400 font-medium">
                  {connectionTestResult}
                </span>
              )}
            </div>
          </div>

          {/* Social and Catalog Links */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-amber-400 text-xs">رسانه‌های دیجیتال و وب‌سایت:</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">آدرس وب‌سایت:</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">کانال تلگرام:</label>
                <input
                  type="text"
                  value={telegramChannel}
                  onChange={(e) => setTelegramChannel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">صفحه اینستاگرام:</label>
                <input
                  type="text"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">لینک کاتالوگ PDF یا رزومه:</label>
                <input
                  type="text"
                  value={catalogPdfUrl}
                  onChange={(e) => setCatalogPdfUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>
            </div>
          </div>

          {/* Media & Images Vault */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-400 text-xs flex items-center space-x-1.5 space-x-reverse">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>مخزن تصاویر، لوگو و گالری محصولات روی هاست:</span>
              </h4>

              <button
                type="button"
                onClick={() => {
                  setSelectingFor(null);
                  setShowVaultModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-amber-300 font-semibold text-[11px] flex items-center space-x-1.5 space-x-reverse transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>کل گاوصندوق فایل‌های هاست</span>
              </button>
            </div>

            {/* Company Logo Uploader */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">لوگوی رسمی شرکت (آپدیت و ذخیره در هاست):</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectingFor('logo');
                    setShowVaultModal(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 text-[10px] font-semibold transition-all"
                >
                  انتخاب لوگو از مخزن هاست
                </button>
              </div>
              <ImageUploader
                label=""
                category="logo"
                multiple={false}
                currentUrls={logoUrl ? [logoUrl] : []}
                onUploadSuccess={(urls) => {
                  if (urls.length > 0) {
                    setLogoUrl(urls[0]);
                    triggerAutoSave(urls[0], productImagesList);
                  }
                }}
                onRemoveUrl={() => {
                  setLogoUrl('');
                  triggerAutoSave('', productImagesList);
                }}
              />
            </div>

            {/* Product & Ad Images Uploader */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">تصاویر محصولات و بنرهای تبلیغاتی (آپلود چندتایی روی هاست):</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectingFor('productImage');
                    setShowVaultModal(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 text-[10px] font-semibold transition-all"
                >
                  انتخاب تصاویر از مخزن هاست
                </button>
              </div>
              <ImageUploader
                label=""
                category="ad_image"
                multiple={true}
                currentUrls={productImagesList}
                onUploadSuccess={(urls) => {
                  const nextList = [...productImagesList, ...urls];
                  setProductImagesList(nextList);
                  triggerAutoSave(logoUrl, nextList);
                }}
                onRemoveUrl={(urlToRemove) => {
                  const nextList = productImagesList.filter((u) => u !== urlToRemove);
                  setProductImagesList(nextList);
                  triggerAutoSave(logoUrl, nextList);
                }}
              />
            </div>
          </div>

          {/* Description & Persona */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">خلاصه معرفی شرکت (برای متون وبلاگ و آگهی‌ها):</label>
            <textarea
              rows={2}
              value={aboutUsSummary}
              onChange={(e) => setAboutUsSummary(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-1.5 space-x-reverse"
          >
            <Save className="w-4 h-4 ml-1" />
            <span>ذخیره کلیه دارایی‌ها و پروفایل گاوصندوق</span>
          </button>
        </form>
      </div>

      <ImageUploadVaultModal
        isOpen={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        onSelectUrl={(selectedUrl) => {
          if (selectingFor === 'logo') {
            setLogoUrl(selectedUrl);
            triggerAutoSave(selectedUrl, productImagesList);
          } else {
            if (!productImagesList.includes(selectedUrl)) {
              const nextList = [...productImagesList, selectedUrl];
              setProductImagesList(nextList);
              triggerAutoSave(logoUrl, nextList);
            }
          }
        }}
      />
    </div>
  );
};
