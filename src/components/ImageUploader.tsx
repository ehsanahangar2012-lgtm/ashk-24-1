import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Check, Loader2, Link as LinkIcon, HardDrive, FileText, Trash2 } from 'lucide-react';
import { UploadedFileAsset } from '../types/ashk24.js';
import { clientStorage } from '../services/clientStorageService.js';

interface ImageUploaderProps {
  label?: string;
  category?: 'logo' | 'ad_image' | 'catalog' | 'other';
  multiple?: boolean;
  currentUrls?: string[];
  onUploadSuccess: (urls: string[], assets: UploadedFileAsset[]) => void;
  onRemoveUrl?: (url: string) => void;
  compact?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label = 'بارگذاری فایل و تصویر در هاست',
  category = 'ad_image',
  multiple = false,
  currentUrls = [],
  onUploadSuccess,
  onRemoveUrl,
  compact = false,
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<UploadedFileAsset | null> => {
    try {
      const asset = await clientStorage.uploadAsset(file, category as 'logo' | 'ad_image' | 'catalog' | 'other');
      return asset;
    } catch (err: any) {
      console.error('File upload failed on host:', err);
      setErrorMsg('خطا در بارگذاری فایل در هاست سی‌پنل: ' + (err.message || 'عدم دسترسی به سرور'));
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
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-3 text-xs">
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-300 flex items-center space-x-1.5 space-x-reverse">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>{label}</span>
          </label>
          <span className="text-[11px] text-amber-400/80 font-mono">ذخیره‌سازی مستقیم روی هاست</span>
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
                جهت انتخاب و آپلود فایل کلیک کنید یا فایل را اینجا رها سازید
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                پشتیبانی از فرمت‌های تصویری (PNG, JPG, WEBP, SVG) و PDF - ذخیره امن در پوشه `/uploads` هاست
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
            <span>فایل‌های قرار گرفته در هاست ({currentUrls.length} مورد):</span>
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
                      alt={`تصویر هاست ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback if image fails
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                      }}
                    />
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 space-x-reverse">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(url);
                      }}
                      title="کپی لینک مستقیم هاست"
                      className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                    >
                      {copiedUrl === url ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                    </button>

                    {onRemoveUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveUrl(url);
                        }}
                        title="حذف از لیست"
                        className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="truncate max-w-[120px]">{url.split('/').pop()}</span>
                  {copiedUrl === url && <span className="text-emerald-400 text-[9px] font-bold">کپی شد!</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
