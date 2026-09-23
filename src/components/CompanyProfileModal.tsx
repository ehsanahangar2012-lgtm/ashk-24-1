import React from 'react';
import { X, Building2 } from 'lucide-react';
import { CompanyProfile } from '../types/ashk24.js';
import { CompanyProfileView } from './CompanyProfileView.js';

interface CompanyProfileModalProps {
  company: CompanyProfile | null;
  companies?: CompanyProfile[];
  onClose: () => void;
  onSave: (updated: Partial<CompanyProfile>) => void;
  onSelectCompany?: (id: string) => Promise<void> | void;
  onCreateCompany?: (newCompany: Omit<CompanyProfile, 'id' | 'updatedAt'>) => Promise<void> | void;
  onDeleteCompany?: (id: string) => Promise<void> | void;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  company,
  companies = [],
  onClose,
  onSave,
  onSelectCompany,
  onCreateCompany,
  onDeleteCompany,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-8 shadow-2xl space-y-6">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                پنجره مدیریت شرکت‌ها و مشتریان تبلیغاتی (Multi-Tenant Hub)
              </h2>
              <p className="text-[11px] text-slate-400">
                تعریف مشخصات برندها، شماره‌های پیامک، لوگوها و کلمات کلیدی اختصاصی
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Content using CompanyProfileView */}
        <CompanyProfileView
          company={company}
          companies={companies}
          onSave={async (updated) => {
            await onSave(updated);
          }}
          onSelectCompany={onSelectCompany}
          onCreateCompany={onCreateCompany}
          onDeleteCompany={onDeleteCompany}
        />
      </div>
    </div>
  );
};
