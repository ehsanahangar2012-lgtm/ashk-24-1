/**
 * سرویس مدیریت پروفایل شرکت‌ها و مشتریان سازمانی (Company Service)
 */

import { CompanyProfile } from '../../types/ashk24.js';
import { callApi } from '../api/apiClient.js';
import { storageVault } from '../storage/storageVault.js';

const COMPANY_KEY = 'ashk24_company';
const COMPANIES_KEY = 'ashk24_companies';

const DEFAULT_COMPANY: CompanyProfile = {
  id: 'cmp_default_01',
  name: 'مجتمع چاپ، کارتن‌سازی و بسته‌بندی حرفه‌ای اشک قلم',
  brandName: 'اشک قلم (Ashk Ghalam)',
  nationalCode: '10380456789',
  phoneNumber: '09153108763',
  email: 'info@ashkghalam.ir',
  website: 'http://www.ashkghalam.ir',
  address: 'مشهد، شهرک صنعتی کلات',
  sector: 'industrial',
  defaultTone: 'persuasive',
  keywords: [
    'چاپ و بسته‌بندی اشک قلم',
    'جعبه‌سازی سفارشی',
    'چاپ افست حرفه‌ای',
    'کارتن‌سازی مشهد',
    'طراحی زینک اختصاصی',
    'طراحی و چاپ لیبل صنعتی',
    'شهرک صنعتی کلات',
  ],
  targetAudience: 'تولیدکنندگان کالا، کارخانجات صنعتی و صاحبان برندها جهت صفر تا صد بسته‌بندی و کارتن',
  logoUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&auto=format&fit=crop&q=80',
  contactPerson: 'مهندس احسان آهنگر',
  taxId: 'IR-98153108763',
  registrationNumber: '584920',
  telegramChannel: '@ashkghalam',
  instagramHandle: '@ashkghalam',
  catalogPdfUrl: 'http://www.ashkghalam.ir/catalog.pdf',
  productImages: [
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
  ],
  aboutUsSummary: 'اشک قلم: مجتمع چاپ و بسته‌بندی، کارتن ۳ لایه و ۵ لایه لمینتی و دایکاتی در مشهد، شهرک صنعتی کلات.',
  updatedAt: new Date().toISOString(),
};

export class CompanyService {
  public static async getCompanyProfile(): Promise<CompanyProfile> {
    const serverCompany = await callApi<CompanyProfile>('company');
    if (serverCompany && serverCompany.name) {
      try {
        storageVault.setItem(COMPANY_KEY, JSON.stringify(serverCompany));
      } catch (e) {}
      return serverCompany;
    }

    const saved = storageVault.getItem(COMPANY_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }

    return DEFAULT_COMPANY;
  }

  public static async updateCompanyProfile(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const current = await this.getCompanyProfile();
    const updated: CompanyProfile = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const serverRes = await callApi<{ data: CompanyProfile }>('company', {
      method: 'POST',
      body: JSON.stringify(updated),
    });

    const finalResult = serverRes?.data || updated;
    try {
      storageVault.setItem(COMPANY_KEY, JSON.stringify(finalResult));
    } catch (e) {}

    return finalResult;
  }

  public static async getCompanies(): Promise<CompanyProfile[]> {
    const serverCompanies = await callApi<CompanyProfile[]>('companies');
    if (serverCompanies && Array.isArray(serverCompanies) && serverCompanies.length > 0) {
      try {
        storageVault.setItem(COMPANIES_KEY, JSON.stringify(serverCompanies));
      } catch (e) {}
      return serverCompanies;
    }

    const saved = storageVault.getItem(COMPANIES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }

    const single = await this.getCompanyProfile();
    return [single];
  }

  public static async createCompany(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const serverRes = await callApi<{ data: CompanyProfile }>('companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (serverRes?.data) {
      const current = await this.getCompanies();
      storageVault.setItem(COMPANIES_KEY, JSON.stringify([...current, serverRes.data]));
      return serverRes.data;
    }

    const newCompany: CompanyProfile = {
      ...DEFAULT_COMPANY,
      ...data,
      id: `cmp_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    const current = await this.getCompanies();
    storageVault.setItem(COMPANIES_KEY, JSON.stringify([...current, newCompany]));
    return newCompany;
  }

  public static async switchActiveCompany(id: string): Promise<CompanyProfile> {
    const serverRes = await callApi<{ activeCompany: CompanyProfile }>('companies/switch-active', {
      method: 'POST',
      body: JSON.stringify({ companyId: id }),
    });

    if (serverRes?.activeCompany) {
      storageVault.setItem(COMPANY_KEY, JSON.stringify(serverRes.activeCompany));
      return serverRes.activeCompany;
    }

    const companies = await this.getCompanies();
    const found = companies.find((c) => c.id === id);
    if (found) {
      storageVault.setItem(COMPANY_KEY, JSON.stringify(found));
      return found;
    }

    return this.getCompanyProfile();
  }

  public static async deleteCompany(id: string): Promise<boolean> {
    const res = await callApi(`companies/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const current = await this.getCompanies();
    storageVault.setItem(COMPANIES_KEY, JSON.stringify(current.filter((c) => c.id !== id)));
    return !!res;
  }
}
