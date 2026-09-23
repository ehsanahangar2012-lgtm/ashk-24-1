import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  Image as ImageIcon,
  FileText,
  Shield,
  UploadCloud,
  CheckCircle2,
  Copy,
  ExternalLink,
  Settings,
  Sparkles,
  Layers,
  HelpCircle,
  Building2,
  Sliders,
  Smartphone,
  Tag,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { CompanyProfile, CompanyAsset, CompanySpecificConfig, MediaPlatform } from '../types/ashk24.js';
import { toPersianDigits, getCurrentJalaliDate } from '../utils/persianUtils.js';
import { clientStorage } from '../services/clientStorageService.js';
import { SmartHelpButton } from './SmartHelpModal.js';
import { ImageUploader } from './ImageUploader.js';
import { ImageAnalysisModal } from './ImageAnalysisModal.js';

interface CompanyAssetsAndConfigModuleProps {
  companies: CompanyProfile[];
  activeCompany: CompanyProfile | null;
  platforms: MediaPlatform[];
  onSelectCompany: (companyId: string) => void;
  onRefreshData: () => void;
}

export const CompanyAssetsAndConfigModule: React.FC<CompanyAssetsAndConfigModuleProps> = ({
  companies,
  activeCompany,
  platforms,
  onSelectCompany,
  onRefreshData,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(activeCompany?.id || companies[0]?.id || 'cmp_default_01');
  const [activeTab, setActiveTab] = useState<'assets' | 'config' | 'presets'>('assets');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [showAddAssetModal, setShowAddAssetModal] = useState<boolean>(false);
  const [analyzingImage, setAnalyzingImage] = useState<{ url: string; text: string; name: string } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Asset Form State
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<CompanyAsset['type']>('product_image');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [newAssetDesc, setNewAssetDesc] = useState('');
  const [newAssetTags, setNewAssetTags] = useState('');

  // Target Company
  const currentCompany = companies.find((c) => c.id === selectedCompanyId) || activeCompany || companies[0];

  // Isolated Config State for current company
  const [config, setConfig] = useState<CompanySpecificConfig>({
    companyId: currentCompany?.id || 'cmp_default_01',
    defaultPlatforms: currentCompany?.isolatedConfig?.defaultPlatforms || ['plat_payamsara', 'plat_agahi24', 'plat_niazpardaz'],
    autoRetryCount: currentCompany?.isolatedConfig?.autoRetryCount || 3,
    adFooterSignature: currentCompany?.isolatedConfig?.adFooterSignature || `📞 جهت سفارش و مشاوره: ${currentCompany?.phoneNumber || ''}\n🌐 ${currentCompany?.website || ''}`,
    watermarkUrl: currentCompany?.isolatedConfig?.watermarkUrl || currentCompany?.logoUrl || '',
    autoRenewalDays: currentCompany?.isolatedConfig?.autoRenewalDays || 30,
    smsNotificationPhone: currentCompany?.isolatedConfig?.smsNotificationPhone || currentCompany?.phoneNumber || '',
    priceStrategy: currentCompany?.isolatedConfig?.priceStrategy || 'exact',
    primaryColor: currentCompany?.isolatedConfig?.primaryColor || '#f59e0b',
    disclaimerText: currentCompany?.isolatedConfig?.disclaimerText || 'تمامی حقوق و مسئولیت آگهی متعلق به سفارش‌دهنده است.',
    maxDailyPosts: currentCompany?.isolatedConfig?.maxDailyPosts || 12,
    requireManualReview: currentCompany?.isolatedConfig?.requireManualReview || false,
  });

  // Sync state when selected company changes
  useEffect(() => {
    if (currentCompany) {
      setSelectedCompanyId(currentCompany.id);
      setConfig({
        companyId: currentCompany.id,
        defaultPlatforms: currentCompany.isolatedConfig?.defaultPlatforms || ['plat_payamsara', 'plat_agahi24', 'plat_niazpardaz'],
        autoRetryCount: currentCompany.isolatedConfig?.autoRetryCount ?? 3,
        adFooterSignature: currentCompany.isolatedConfig?.adFooterSignature || `📞 سفارش و استعلام: ${currentCompany.phoneNumber || ''}\n🌐 ${currentCompany.website || ''}`,
        watermarkUrl: currentCompany.isolatedConfig?.watermarkUrl || currentCompany.logoUrl || '',
        autoRenewalDays: currentCompany.isolatedConfig?.autoRenewalDays ?? 30,
        smsNotificationPhone: currentCompany.isolatedConfig?.smsNotificationPhone || currentCompany.phoneNumber || '',
        priceStrategy: currentCompany.isolatedConfig?.priceStrategy || 'exact',
        primaryColor: currentCompany.isolatedConfig?.primaryColor || '#f59e0b',
        disclaimerText: currentCompany.isolatedConfig?.disclaimerText || 'تمامی حقوق و مسئولیت آگهی متعلق به سفارش‌دهنده است.',
        maxDailyPosts: currentCompany.isolatedConfig?.maxDailyPosts ?? 12,
        requireManualReview: currentCompany.isolatedConfig?.requireManualReview ?? false,
      });
    }
  }, [selectedCompanyId, currentCompany]);

  // Assets list for the active company
  const companyAssets: CompanyAsset[] = (currentCompany?.assets && Array.isArray(currentCompany.assets))
    ? currentCompany.assets
    : [
        ...(currentCompany?.logoUrl ? [{
          id: `ast_logo_${currentCompany.id}`,
          companyId: currentCompany.id,
          name: `لوگوی رسمی ${currentCompany.brandName || currentCompany.name}`,
          type: 'logo' as const,
          url: currentCompany.logoUrl,
          fileSize: '45 KB',
          mimeType: 'image/svg+xml',
          description: 'نشان تجاری اصلی برند جهت درج در هدر آگهی و واترمارک',
          tags: ['لوگو', 'برندینگ'],
          createdAt: getCurrentJalaliDate(),
        }] : []),
        ...((currentCompany?.productImages || []).map((img, idx) => ({
          id: `ast_prod_${currentCompany?.id}_${idx}`,
          companyId: currentCompany?.id || '',
          name: `تصویر محصول شماره ${toPersianDigits(idx + 1)}`,
          type: 'product_image' as const,
          url: img,
          fileSize: '120 KB',
          mimeType: 'image/png',
          description: 'تصویر کاتالوگ محصول',
          tags: ['محصول', 'بسته‌بندی'],
          createdAt: getCurrentJalaliDate(),
        }))),
        ...(currentCompany?.catalogPdfUrl ? [{
          id: `ast_cat_${currentCompany.id}`,
          companyId: currentCompany.id,
          name: 'کاتالوگ و لیست قیمت جامع',
          type: 'catalog' as const,
          url: currentCompany.catalogPdfUrl,
          fileSize: '2.4 MB',
          mimeType: 'application/pdf',
          description: 'کاتالوگ معرفی خدمات و مشخصات فنی',
          tags: ['کاتالوگ', 'pdf'],
          createdAt: getCurrentJalaliDate(),
        }] : []),
      ];

  const filteredAssets = companyAssets.filter((a) => {
    if (assetTypeFilter === 'all') return true;
    return a.type === assetTypeFilter;
  });

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveIsolatedConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      await clientStorage.saveCompanyIsolatedConfig(currentCompany.id, config);
      setSaveSuccessMsg(`✅ پیکربندی اختصاصی شرکت «${currentCompany.brandName || currentCompany.name}» با موفقیت ذخیره شد.`);
      onRefreshData();
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('خطا در ذخیره پیکربندی: ' + (err?.message || 'خطای سرور'));
    }
  };

  const handleAddNewAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName || !newAssetUrl || !currentCompany) return;

    try {
      const tagsArray = newAssetTags
        .split(/[,،]/)
        .map((t) => t.trim())
        .filter(Boolean);

      await clientStorage.addCompanyAsset(currentCompany.id, {
        companyId: currentCompany.id,
        name: newAssetName,
        type: newAssetType,
        url: newAssetUrl,
        description: newAssetDesc,
        tags: tagsArray,
        fileSize: '180 KB',
        mimeType: newAssetType === 'catalog' ? 'application/pdf' : 'image/jpeg',
      });

      setShowAddAssetModal(false);
      setNewAssetName('');
      setNewAssetUrl('');
      setNewAssetDesc('');
      setNewAssetTags('');
      setSaveSuccessMsg('✅ دارایی جدید با موفقیت به بانک دارایی‌های این مشتری اضافه شد.');
      onRefreshData();
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('خطا در افزودن دارایی: ' + (err?.message || ''));
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!window.confirm('آیا از حذف این دارایی از بایگانی شرکت اطمینان دارید؟')) return;
    if (!currentCompany) return;
    try {
      await clientStorage.deleteCompanyAsset(currentCompany.id, assetId);
      onRefreshData();
    } catch (err: any) {
      alert('خطا در حذف دارایی');
    }
  };

  const handleToggleConfigPlatform = (pid: string) => {
    const exists = config.defaultPlatforms.includes(pid);
    if (exists) {
      setConfig({
        ...config,
        defaultPlatforms: config.defaultPlatforms.filter((p) => p !== pid),
      });
    } else {
      setConfig({
        ...config,
        defaultPlatforms: [...config.defaultPlatforms, pid],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Company Switcher */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 space-x-reverse">
            <FolderOpen className="w-6 h-6 text-amber-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-slate-100">
              مدیریت دارایی‌ها (Assets) و پیکربندی اختصاصی هر مشتری
            </h2>
            <SmartHelpButton
              title="راهنمای مدیریت دارایی‌ها و پیکربندی مجزا"
              description="این بخش به شما امکان می‌دهد برای هر شرکت یا مشتری تبلیغاتی، لوگوها، واترمارک‌ها، تصاویر کاتالوگ، لیست‌های قیمت و تنظیمات انتشار منحصربه‌فرد (مانند رسانه‌های هدف، شماره پیامک، پانویس و متن سلب مسئولیت) را به صورت ایزوله تعریف و مدیریت کنید."
            />
          </div>
          <p className="text-xs text-slate-400">
            سازمان‌دهی فایل‌های چندرسانه‌ای، بنرها، واترمارک‌ها و قواعد اختصاصی کمپین‌ها به ازای هر حساب تجاری
          </p>
        </div>

        {/* Company Quick Selector Dropdown */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300">مشتری منتخب:</span>
          <select
            value={selectedCompanyId}
            onChange={(e) => {
              const cid = e.target.value;
              setSelectedCompanyId(cid);
              onSelectCompany(cid);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-amber-300 outline-none focus:border-amber-500 shadow-inner"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brandName || c.name} ({c.clientType === 'client_account' ? 'مشتری تبلیغاتی' : 'شرکت اصلی'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2 space-x-reverse animate-fade-in shadow-md">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Section Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 space-x-reverse transition-all ${
              activeTab === 'assets'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>بانک دارایی‌ها و مدیا ({toPersianDigits(companyAssets.length)})</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 space-x-reverse transition-all ${
              activeTab === 'config'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>قوانین و پیکربندی اختصاصی کمپین</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 space-x-reverse transition-all ${
              activeTab === 'presets'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>قالب‌ها و سناریوهای آماده آگهی</span>
          </button>
        </div>

        {activeTab === 'assets' && (
          <button
            onClick={() => setShowAddAssetModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center space-x-1.5 space-x-reverse shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن دارایی جدید به هاست</span>
          </button>
        )}
      </div>

      {/* TAB 1: ASSETS VAULT */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          {/* Asset Type Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'همه دارایی‌ها' },
              { id: 'logo', label: 'لوگو و نشان تجاری' },
              { id: 'watermark', label: 'واترمارک و پترن' },
              { id: 'product_image', label: 'عکس محصولات و خدمات' },
              { id: 'catalog', label: 'کاتالوگ و لیست قیمت (PDF)' },
              { id: 'license_doc', label: 'مجوزها و اسناد رسمی' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAssetTypeFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  assetTypeFilter === f.id
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/30 font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => {
              const isImage = asset.type === 'logo' || asset.type === 'watermark' || asset.type === 'product_image';
              return (
                <div
                  key={asset.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-3">
                    {/* Media Preview Thumbnail */}
                    <div className="relative w-full h-40 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-full h-full object-contain p-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center space-y-2 text-slate-400">
                          <FileText className="w-12 h-12 text-amber-400" />
                          <span className="text-xs font-mono">{asset.mimeType || 'DOCUMENT'}</span>
                        </div>
                      )}

                      {/* Top Overlay Badge */}
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900/90 text-amber-300 font-bold border border-slate-700 backdrop-blur-sm">
                          {asset.type === 'logo' && 'لوگو'}
                          {asset.type === 'watermark' && 'واترمارک'}
                          {asset.type === 'product_image' && 'عکس محصول'}
                          {asset.type === 'catalog' && 'کاتالوگ'}
                          {asset.type === 'license_doc' && 'سند مجوز'}
                          {asset.type === 'video_clip' && 'ویدیو'}
                        </span>
                      </div>

                      {/* Hover Smart Actions */}
                      {isImage && (
                        <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 space-x-reverse">
                          <button
                            type="button"
                            onClick={() => setAnalyzingImage({ url: asset.url, text: asset.description || asset.name, name: asset.name })}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-1 space-x-reverse shadow-lg"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>تحلیل هوشمند تصویر با AI</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata Details */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{asset.name}</h4>
                      {asset.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {asset.description}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    {asset.tags && asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.map((t, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 space-x-reverse">
                      <button
                        onClick={() => handleCopyUrl(asset.url, asset.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-amber-400 text-[11px] flex items-center space-x-1 space-x-reverse transition-colors"
                        title="کپی لینک مستقیم فایل در هاست"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedId === asset.id ? 'کپی شد!' : 'کپی آدرس'}</span>
                      </button>

                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200"
                        title="مشاهده مستقیم در تب جدید"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-850 transition-colors"
                      title="حذف دارایی"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAssets.length === 0 && (
            <div className="p-8 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-center space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">هیچ دارایی در این دسته‌بندی برای مشتری انتخابی ثبت نشده است.</p>
              <button
                onClick={() => setShowAddAssetModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                بارگذاری اولین دارایی در هاست
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ISOLATED CONFIG */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveIsolatedConfig} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Platform Selection & Retries */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse border-b border-slate-800 pb-3">
                <Settings className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-100">رسانه‌های هدف پیش‌فرض این مشتری</h3>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                هنگامی که برای این مشتری کمپین جدید یا انتشار سریع انجام شود، این پلتفرم‌ها به طور خودکار هدف‌گذاری می‌شوند:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {platforms.map((p) => {
                  const isChecked = config.defaultPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleToggleConfigPlatform(p.id)}
                      className={`p-2.5 rounded-xl border text-right text-xs transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{p.persianName}</span>
                      <span className={`w-3 h-3 rounded-full border ${isChecked ? 'bg-amber-400 border-amber-300' : 'border-slate-600'}`}></span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">سقف ارسال روزانه آگهی:</label>
                  <input
                    type="number"
                    value={config.maxDailyPosts}
                    onChange={(e) => setConfig({ ...config, maxDailyPosts: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">تعداد تلاش خودکار در خطا:</label>
                  <input
                    type="number"
                    value={config.autoRetryCount}
                    onChange={(e) => setConfig({ ...config, autoRetryCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Branding, Watermark & SMS Phone */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse border-b border-slate-800 pb-3">
                <Shield className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-100">واترمارک، استراتژی قیمت و پیامک اختصاصی</h3>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">شماره موبایل جهت رله کد تایید پیامکی (OTP):</label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={config.smsNotificationPhone || ''}
                    onChange={(e) => setConfig({ ...config, smsNotificationPhone: e.target.value })}
                    placeholder="مثال: 09153108763"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500">کدهای OTP ارسال شده برای این شماره توسط اپلیکیشن رله پیامک دریافت و خودکار ثبت می‌گردند.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">استراتژی درج قیمت:</label>
                  <select
                    value={config.priceStrategy}
                    onChange={(e) => setConfig({ ...config, priceStrategy: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                  >
                    <option value="exact">قیمت قطعی به تومان</option>
                    <option value="negotiable">قیمت توافقی</option>
                    <option value="call_for_price">تماس بگیرید / استعلام</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">دوره تمدید خودکار (روز):</label>
                  <input
                    type="number"
                    value={config.autoRenewalDays}
                    onChange={(e) => setConfig({ ...config, autoRenewalDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">آدرس واترمارک اختصاصی روی تصاویر:</label>
                <input
                  type="text"
                  value={config.watermarkUrl || ''}
                  onChange={(e) => setConfig({ ...config, watermarkUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>
            </div>
          </div>

          {/* Box 3: Footer Signature & Disclaimer */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse border-b border-slate-800 pb-3">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-100">پانویس و امضای خودکار انتهای تمام آگهی‌های این مجموعه</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">متن امضا و اطلاعات تماس انتهای آگهی:</label>
                <textarea
                  rows={4}
                  value={config.adFooterSignature}
                  onChange={(e) => setConfig({ ...config, adFooterSignature: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">متن سلب مسئولیت / مجوزها / ضمانت کیفیت:</label>
                <textarea
                  rows={4}
                  value={config.disclaimerText || ''}
                  onChange={(e) => setConfig({ ...config, disclaimerText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2 space-x-reverse"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ذخیره دائمی پیکربندی این مشتری در دیتابیس</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PRESETS */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">
                قالب‌های آماده برای شرکت «{currentCompany?.brandName || currentCompany?.name}»
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              این سناریوها بر اساس حوزه کاری ({currentCompany?.sector || 'صنعتی'}) و مشخصات این برند از پیش بهینه‌سازی شده‌اند:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'معرفی خدمات اصلی و تولیدی',
                desc: `ارائه صفر تا صد خدمات ${currentCompany?.brandName || 'مجموعه'} با بالاترین کیفیت، قیمت رقابتی و تحویل فوری`,
                tone: 'حرفه‌ای و متقاعدکننده',
                platformsCount: config.defaultPlatforms.length,
              },
              {
                title: 'تخفیف ویژه و فروش عمده',
                desc: `فروش و عرضه مستقیم محصولات با شرایط استثنایی و تخفیف ویژه خرید عمده کارخانجات و سازمان‌ها`,
                tone: 'فوری و هیجانی',
                platformsCount: config.defaultPlatforms.length,
              },
              {
                title: 'قرارداد سالانه و همکاری سازمانی (B2B)',
                desc: `عقد قراردادهای تامین بلندمدت با تسهیلات پرداخت و تضمین کیفیت پایدار برای همکاران تجاری`,
                tone: 'رسمی و شرکتی',
                platformsCount: config.defaultPlatforms.length,
              },
            ].map((preset, pidx) => (
              <div key={pidx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-100">{preset.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{preset.desc}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>لحن: {preset.tone}</span>
                    <span className="text-amber-400 font-bold">{toPersianDigits(preset.platformsCount)} پلتفرم پیش‌فرض</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    alert(`قالب «${preset.title}» برای شرکت ${currentCompany?.brandName} آماده شد. لطفاً به بخش کمپین‌ها رفته و انتشار را آغاز فرمایید.`);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-amber-300 font-bold text-xs transition-all text-center"
                >
                  استفاده در کمپین جدید ←
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Asset Modal */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100">افزودن دارایی جدید به هاست برای {currentCompany?.brandName}</h3>
              <button
                onClick={() => setShowAddAssetModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewAsset} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">عنوان دارایی / فایل:</label>
                <input
                  type="text"
                  required
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="مثال: عکس جعبه مقوایی لمینتی ۵ لایه"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">نوع دارایی:</label>
                  <select
                    value={newAssetType}
                    onChange={(e) => setNewAssetType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                  >
                    <option value="product_image">عکس محصول / نمونه‌کار</option>
                    <option value="logo">لوگو و نشان تجاری</option>
                    <option value="watermark">واترمارک و الگو</option>
                    <option value="catalog">کاتالوگ / PDF / بروشور</option>
                    <option value="license_doc">اسناد رسمی و مجوزها</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">برچسب‌ها (با ویرگول):</label>
                  <input
                    type="text"
                    value={newAssetTags}
                    onChange={(e) => setNewAssetTags(e.target.value)}
                    placeholder="کارتن, جعبه, صادراتی"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Local File Uploader inside Modal */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <ImageUploader
                  label="بارگذاری مستقیم فایل در هاست cPanel:"
                  category="company_logo"
                  multiple={false}
                  currentUrls={newAssetUrl ? [newAssetUrl] : []}
                  onUploadSuccess={(urls) => {
                    if (urls.length > 0) setNewAssetUrl(urls[0]);
                  }}
                  onRemoveUrl={() => setNewAssetUrl('')}
                  compact={true}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">یا ورود آدرس مستقیم URL:</label>
                <input
                  type="text"
                  required
                  value={newAssetUrl}
                  onChange={(e) => setNewAssetUrl(e.target.value)}
                  placeholder="/uploads/sample.png یا https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500 font-mono text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">توضیحات تکمیلی:</label>
                <textarea
                  rows={2}
                  value={newAssetDesc}
                  onChange={(e) => setNewAssetDesc(e.target.value)}
                  placeholder="مشخصات فایل یا نکات مربوط به درج در آگهی"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
                >
                  ثبت دارایی در بایگانی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image AI Vision Analysis Modal */}
      {analyzingImage && (
        <ImageAnalysisModal
          isOpen={true}
          imageUrl={analyzingImage.url}
          adText={analyzingImage.text}
          productName={analyzingImage.name}
          keywords={currentCompany?.keywords || []}
          onClose={() => setAnalyzingImage(null)}
        />
      )}
    </div>
  );
};
