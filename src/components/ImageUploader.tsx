import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  Check,
  Loader2,
  Link as LinkIcon,
  HardDrive,
  FileText,
  Trash2,
  Sparkles,
  FolderOpen,
  Eye,
} from 'lucide-react';
import { UploadedFileAsset } from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';
import { ImageUploadVaultModal } from './ImageUploadVaultModal.js';
import { ImageAnalysisModal } from './ImageAnalysisModal.js';

interface ImageUploaderProps {
  label?: string;
  category?: 'logo' | 'ad_image' | 'catalog' | 'other';
  multiple?: boolean;
  currentUrls?: string[];
  onUploadSuccess: (urls: string[], assets: UploadedFileAsset[]) => void;
  onRemoveUrl?: (url: string) => void;
  compact?: boolean;
  adText?: string;
  productName?: string;
  keywords?: string[];
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label = 'بارگذاری فایل و تصویر در هاست',
  category = 'ad_image',
  multiple = false,
  currentUrls = [],
  onUploadSuccess,
  onRemoveUrl,
  compact = false,
  adText = '',
  productName = '',
  keywords = [],
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Vault & AI Analysis Modals
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [analyzingImageUrl, setAnalyzingImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<UploadedFileAsset | null> => {
    try {
      const asset = await clientStorage.uploadAsset(file, category as 'logo' | 'ad_image' | 'catalog' | 'other');
      return asset;
    } catch (err: any) {
      console.error('File upload failed on host:', err);
      setErrorMsg('خطا در بارگذاری فایل در هاست: ' + (err.message || 'عدم دسترسی به سرور'));
      return null;
    }
  };

  const handleFiles = async (filesList: FileList | File[]) => {
    setErrorMsg(null);
    setIsUploading(true);
    setUploadProgress(20);

    const uploadedAssets: UploadedFileAsset[] = [];
    const newUrls: string[] = [];

    try {
      const array = Array.from(filesList);
      for (let i = 0; i < array.length; i++) {
        const file = array[i];
        if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
          setErrorMsg('لطفاً فقط فایل‌های تصویری (PNG, JPG, WEBP, SVG) یا PDF را انتخاب نمایید.');
          continue;
        }

        setUploadProgress(Math.min(90, Math.round(((i + 1) / array.length) * 100)));
        const asset = await processFile(file);
        if (asset) {
          uploadedAssets.push(asset);
          newUrls.push(asset.url);
        }
      }

      setUploadProgress(100);
      if (newUrls.length > 0) {
        onUploadSuccess(newUrls, uploadedAssets);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMsg('خطا در بارگذاری فایل روی هاست: ' + (err.message || 'عدم دسترسی به سرور'));
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const copyToClipboard = (url: string) => {
    const fullUrl = url.startsWith('http') || url.startsWith('blob:') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleSelectFromVault = (selectedUrl: string) => {
    onUploadSuccess([selectedUrl], [
      {
        id: `vault_${Date.now()}`,
        fileName: selectedUrl.split('/').pop() || 'selected.png',
        originalName: selectedUrl.split('/').pop() || 'selected.png',
        url: selectedUrl,
        mimeType: 'image/png',
        sizeBytes: 10240,
        category: 'ad_image',
        uploadedAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="space-y-3 text-xs">
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-300 flex items-center space-x-1.5 space-x-reverse">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>{label}</span>
          </label>
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              type="button"
              onClick={() => setShowVaultModal(true)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold transition-all flex items-center space-x-1 space-x-reverse"
            >
              <FolderOpen className="w-3.5 h-3.5 ml-1" />
              <span>انتخاب از مخزن تصاویر هاست</span>
            </button>
          </div>
        </div>
      )}

      {/* Dropzone Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center ${
          compact ? 'p-3' : 'p-5'
        } ${
          dragActive
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-slate-700 hover:border-slate-500 bg-slate-950/60 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
        />

        {isUploading ? (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-center space-x-2 space-x-reverse text-amber-400 font-semibold">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>در حال ارسال و ذخیره‌سازی در هاست... ({uploadProgress}٪)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">
                جهت آپلود عکس یا فایل کلیک کنید یا فایل را اینجا رها سازید
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                پشتیبانی از PNG، JPG، WEBP، SVG و PDF - ذخیره خودکار در مخزن دائمی `/uploads` هاست
              </p>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] flex items-center space-x-2 space-x-reverse">
          <X className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Previews / Selected Files List */}
      {currentUrls.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <span>عکس‌های پیوست شده به آگهی ({currentUrls.length} تصویر):</span>
            <span className="text-emerald-400 text-[10px]">آماده انتشار در پلتفرم‌ها</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {currentUrls.map((url, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl bg-slate-900 border border-slate-800 p-2 overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800">
                  {url.endsWith('.pdf') ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-1 p-2">
                      <FileText className="w-8 h-8 text-amber-400" />
                      <span className="text-[10px] truncate max-w-full">فایل PDF</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`تصویر آگهی ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800';
                      }}
                    />
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1.5 space-y-1.5">
                    {!url.endsWith('.pdf') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnalyzingImageUrl(url);
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] w-full flex items-center justify-center space-x-1 space-x-reverse shadow-md"
                      >
                        <Sparkles className="w-3 h-3 ml-0.5" />
                        <span>تحلیل هوشمند AI</span>
                      </button>
                    )}

                    <div className="flex items-center space-x-1.5 space-x-reverse">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(url);
                        }}
                        title="کپی لینک عکس"
                        className="p-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                      >
                        {copiedUrl === url ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                      </button>

                      {onRemoveUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveUrl(url);
                          }}
                          title="حذف از آگهی"
                          className="p-1 rounded-md bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="truncate max-w-[100px]">{url.split('/').pop()}</span>
                  <button
                    type="button"
                    onClick={() => setAnalyzingImageUrl(url)}
                    className="text-amber-400 hover:text-amber-300 font-sans text-[9px] flex items-center space-x-0.5 space-x-reverse font-bold"
                  >
                    <span>تحلیل AI</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vault Selection Modal */}
      {showVaultModal && (
        <ImageUploadVaultModal
          isOpen={showVaultModal}
          onClose={() => setShowVaultModal(false)}
          onSelectUrl={(url) => {
            handleSelectFromVault(url);
            setShowVaultModal(false);
          }}
        />
      )}

      {/* AI Image & Text Analysis Modal */}
      {analyzingImageUrl && (
        <ImageAnalysisModal
          isOpen={!!analyzingImageUrl}
          onClose={() => setAnalyzingImageUrl(null)}
          imageUrl={analyzingImageUrl}
          adText={adText}
          productName={productName}
          keywords={keywords}
        />
      )}
    </div>
  );
};
