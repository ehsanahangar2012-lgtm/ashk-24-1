import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Upload,
  Search,
  Trash2,
  Copy,
  Check,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { UploadedFileAsset } from '../types/ashk24.js';
import { ImageUploader } from './ImageUploader.js';
import { clientStorage } from '../services/clientStorageService.js';

interface ImageUploadVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUrl?: (url: string) => void;
}

export const ImageUploadVaultModal: React.FC<ImageUploadVaultModalProps> = ({
  isOpen,
  onClose,
  onSelectUrl,
}) => {
  const [assets, setAssets] = useState<UploadedFileAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<UploadedFileAsset | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await clientStorage.getAssets();
      setAssets(data || []);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  const handleDelete = async (idOrFileName: string) => {
    if (!window.confirm('آیا از حذف این فایل از ذخیره‌ساز اطمینان دارید؟')) return;

    try {
      await clientStorage.deleteAsset(idOrFileName);
      setAssets((prev) => prev.filter((a) => a.id !== idOrFileName && a.fileName !== idOrFileName));
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  };

  const copyUrl = (asset: UploadedFileAsset) => {
    const fullUrl = window.location.origin + asset.url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAssets = (assets || []).filter((asset) => {
    const matchesSearch =
      (asset.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.originalName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || asset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatSizeBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
                <span>مدیریت و گاوصندوق فایل‌های آپلودشده روی هاست</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20">
                  /uploads
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                کلیه لوگوها، تصاویر آگهی‌ها و فایل‌های بارگذاری شده در سیستم به صورت دائمی در هاست قرار دارند
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

        {/* New File Upload Box */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <h4 className="font-bold text-amber-400 text-xs flex items-center space-x-2 space-x-reverse">
            <Upload className="w-4 h-4 ml-1" />
            <span>بارگذاری مستقیم فایل جدید در هاست:</span>
          </h4>

          <ImageUploader
            label=""
            multiple={true}
            category="ad_image"
            onUploadSuccess={(urls, newAssets) => {
              setAssets((prev) => [...newAssets, ...prev]);
            }}
            compact={true}
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام فایل..."
              className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-amber-500 text-xs"
            />
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              همه فایل‌ها ({assets.length})
            </button>
            <button
              onClick={() => setSelectedCategory('logo')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedCategory === 'logo'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              لوگوها
            </button>
            <button
              onClick={() => setSelectedCategory('ad_image')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedCategory === 'ad_image'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              عکس آگهی‌ها
            </button>

            <button
              onClick={fetchAssets}
              title="بروزرسانی لیست"
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Files Grid */}
        <div className="flex-1 overflow-y-auto min-h-[220px]">
          {(!filteredAssets || filteredAssets.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
              <ImageIcon className="w-12 h-12 text-slate-700 stroke-1" />
              <p className="text-xs">هیچ فایلی مطابق جستجوی شما یافت نشد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(filteredAssets || []).map((asset) => (
                <div
                  key={asset.id}
                  className="group relative p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2"
                >
                  <div className="relative aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                    {asset.mimeType.includes('pdf') ? (
                      <div className="flex flex-col items-center space-y-1 text-slate-400 p-2 text-center">
                        <FileText className="w-10 h-10 text-amber-400" />
                        <span className="text-[10px] font-mono truncate max-w-full">
                          {asset.originalName}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={asset.url}
                        alt={asset.originalName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                        }}
                      />
                    )}

                    {/* Quick selection overlay */}
                    <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 space-y-2">
                      {onSelectUrl && (
                        <button
                          onClick={() => {
                            onSelectUrl(asset.url);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] w-full shadow-lg"
                        >
                          انتخاب این تصویر
                        </button>
                      )}

                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        <button
                          onClick={() => copyUrl(asset)}
                          title="کپی لینک هاست"
                          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                        >
                          {copiedId === asset.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="مشاهده تصویر اصلی"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => handleDelete(asset.id)}
                          title="حذف از هاست"
                          className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-200 truncate" title={asset.originalName}>
                      {asset.originalName}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{formatSizeBytes(asset.sizeBytes)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px]">
                        {asset.category === 'logo' ? 'لوگو' : 'آگهی'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-2 space-x-reverse text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>ذخیره‌سازی پایدار تمام تصاویر در مسیرهای سرور /uploads</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all"
          >
            بستن مخزن فایل‌ها
          </button>
        </div>
      </div>
    </div>
  );
};
