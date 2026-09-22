/**
 * معماری آداپتور چندرسانه‌ای (Multi-Platform Adapter Architecture)
 * اشک ۲۴ - موتور انتشار آگنوستیک و مبتنی بر الگوهای دیتابیس
 */

import { Campaign, MediaPlatform, PublicationJob, CompanyProfile } from '../types/ashk24.js';

export interface PlatformSubmissionContext {
  campaign: Campaign;
  job: PublicationJob;
  companyProfile: CompanyProfile;
  platform: MediaPlatform;
}

export interface PlatformSubmissionResult {
  success: boolean;
  status: 'under_review' | 'published' | 'failed' | 'paused_user_action';
  progressPercent: number;
  currentStep: string;
  message: string;
  httpCode: number;
  trackingUrl: string;
  adUrl?: string | null;
  platformName: string;
  platformDomain: string;
  adapterUsed: string;
  messageToShowInForm?: string;
  fieldsSubmitted?: Record<string, string>;
}

export interface PlatformPayloadSpec {
  url: string;
  method: 'POST' | 'GET' | 'PUT';
  headers: Record<string, string>;
  formData: Record<string, string>;
  postBody: string;
  contentType: string;
  trackingUrl: string;
}

export interface IPlatformAdapter {
  id: string;
  name: string;
  canHandle(platform: MediaPlatform): boolean;
  buildPayloadSpec(context: PlatformSubmissionContext): PlatformPayloadSpec;
  parseResponse(response: { statusCode: number; headers: Record<string, any>; body: string }, context: PlatformSubmissionContext): PlatformSubmissionResult;
}

// -------------------------------------------------------------
// Base Helper for clean domain extraction
// -------------------------------------------------------------
function cleanDomain(domain: string): string {
  return (domain || '').toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').trim();
}

// -------------------------------------------------------------
// 1. Istgah Adapter (ایستگاه)
// -------------------------------------------------------------
export class IstgahAdapter implements IPlatformAdapter {
  id = 'adapter_istgah';
  name = 'آداپتور نیازمندی‌های ایستگاه (Istgah)';

  canHandle(platform: MediaPlatform): boolean {
    const dom = cleanDomain(platform.domain);
    return dom.includes('istgah') || platform.name.toLowerCase().includes('istgah');
  }

  buildPayloadSpec(context: PlatformSubmissionContext): PlatformPayloadSpec {
    const { campaign, job, companyProfile, platform } = context;
    const domain = cleanDomain(platform.domain) || 'istgah.com';
    const postUrl = `https://www.${domain}/post/`;
    const trackingUrl = `https://www.${domain}/my/`;

    const formData: Record<string, string> = {
      'title': campaign.title,
      'body': campaign.productDescription || campaign.title,
      'phone': job.contactPhone || companyProfile.phoneNumber || '09153108763',
      'email': job.contactEmail || companyProfile.email || 'info@ashkghalam.ir',
      'state': 'خراسان رضوی',
      'city': 'مشهد',
      'address': companyProfile.address || 'مشهد، شهرک صنعتی کلات',
      'group': 'صنعت و تولید > بسته‌بندی و چاپ',
      'price': campaign.priceToman > 0 ? String(campaign.priceToman) : '0',
      'tags': (campaign.targetKeywords || []).join(', ')
    };

    const urlParams = new URLSearchParams(formData);
    return {
      url: postUrl,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': `https://www.${domain}`,
        'Referer': postUrl
      },
      formData,
      postBody: urlParams.toString(),
      contentType: 'application/x-www-form-urlencoded',
      trackingUrl
    };
  }

  parseResponse(response: { statusCode: number; headers: Record<string, any>; body: string }, context: PlatformSubmissionContext): PlatformSubmissionResult {
    const { platform } = context;
    const { statusCode, body } = response;
    const trackingUrl = `https://www.${cleanDomain(platform.domain)}/my/`;

    if (statusCode >= 200 && statusCode < 400) {
      const isReview = body.includes('تایید') || body.includes('بررسی') || body.includes('موفق') || statusCode === 302;
      return {
        success: true,
        status: 'under_review',
        progressPercent: 95,
        currentStep: `فرم آگهی با موفقیت به درگاه ایستگاه تحویل شد و در صف تایید ناظر قرار دارد.`,
        message: 'تحویل داده شد به ایستگاه',
        httpCode: statusCode,
        trackingUrl,
        adUrl: null,
        platformName: platform.persianName || 'ایستگاه',
        platformDomain: platform.domain,
        adapterUsed: this.id
      };
    }

    return {
      success: false,
      status: statusCode === 401 || statusCode === 403 ? 'paused_user_action' : 'failed',
      progressPercent: 40,
      currentStep: `پاسخ ایستگاه با کد ${statusCode} همراه بود.`,
      message: `خطای کد ${statusCode}`,
      httpCode: statusCode,
      trackingUrl,
      adUrl: null,
      platformName: platform.persianName || 'ایستگاه',
      platformDomain: platform.domain,
      adapterUsed: this.id
    };
  }
}

// -------------------------------------------------------------
// 2. Payamsara Adapter (پیام‌سرا)
// -------------------------------------------------------------
export class PayamsaraAdapter implements IPlatformAdapter {
  id = 'adapter_payamsara';
  name = 'آداپتور نیازمندی‌های پیام‌سرا (Payamsara)';

  canHandle(platform: MediaPlatform): boolean {
    const dom = cleanDomain(platform.domain);
    return dom.includes('payamsara') || platform.name.toLowerCase().includes('payamsara');
  }

  buildPayloadSpec(context: PlatformSubmissionContext): PlatformPayloadSpec {
    const { campaign, job, companyProfile, platform } = context;
    const domain = cleanDomain(platform.domain) || 'payamsara.com';
    const postUrl = `https://${domain}/ad/new`;
    const trackingUrl = `https://${domain}/my-account`;

    const formData: Record<string, string> = {
      'ad_title': campaign.title,
      'ad_content': campaign.productDescription || campaign.title,
      'contact_phone': job.contactPhone || companyProfile.phoneNumber || '09153108763',
      'contact_email': job.contactEmail || companyProfile.email || 'info@ashkghalam.ir',
      'province_name': 'خراسان رضوی',
      'city_name': 'مشهد',
      'price_value': campaign.priceToman > 0 ? String(campaign.priceToman) : 'توافقی',
      'keywords': (campaign.targetKeywords || []).join('، ')
    };

    const urlParams = new URLSearchParams(formData);
    return {
      url: postUrl,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': `https://${domain}`,
        'Referer': postUrl
      },
      formData,
      postBody: urlParams.toString(),
      contentType: 'application/x-www-form-urlencoded',
      trackingUrl
    };
  }

  parseResponse(response: { statusCode: number; headers: Record<string, any>; body: string }, context: PlatformSubmissionContext): PlatformSubmissionResult {
    const { platform } = context;
    const { statusCode } = response;
    const trackingUrl = `https://${cleanDomain(platform.domain)}/my-account`;

    if (statusCode >= 200 && statusCode < 400) {
      return {
        success: true,
        status: 'under_review',
        progressPercent: 95,
        currentStep: `آگهی با موفقیت به پیام‌سرا تحویل داده شد و در وضعیت در حال بررسی قرار گرفت.`,
        message: 'ثبت در پیام‌سرا موفق',
        httpCode: statusCode,
        trackingUrl,
        adUrl: null,
        platformName: platform.persianName || 'پیام‌سرا',
        platformDomain: platform.domain,
        adapterUsed: this.id
      };
    }

    return {
      success: false,
      status: 'failed',
      progressPercent: 35,
      currentStep: `خطای کد ${statusCode} در پیام‌سرا`,
      message: `خطای سرور ${statusCode}`,
      httpCode: statusCode,
      trackingUrl,
      adUrl: null,
      platformName: platform.persianName || 'پیام‌سرا',
      platformDomain: platform.domain,
      adapterUsed: this.id
    };
  }
}

// -------------------------------------------------------------
// 3. Agahi24 Adapter (آگهی ۲۴)
// -------------------------------------------------------------
export class Agahi24Adapter implements IPlatformAdapter {
  id = 'adapter_agahi24';
  name = 'آداپتور نیازمندی‌های آگهی ۲۴ (Agahi24)';

  canHandle(platform: MediaPlatform): boolean {
    const dom = cleanDomain(platform.domain);
    return dom.includes('agahi24') || platform.name.toLowerCase().includes('agahi24');
  }

  buildPayloadSpec(context: PlatformSubmissionContext): PlatformPayloadSpec {
    const { campaign, job, companyProfile, platform } = context;
    const domain = cleanDomain(platform.domain) || 'agahi24.com';
    const postUrl = `https://www.${domain}/post-new/`;
    const trackingUrl = `https://www.${domain}/my-ads/`;

    const formData: Record<string, string> = {
      'subject': campaign.title,
      'description': campaign.productDescription || campaign.title,
      'mobile': job.contactPhone || companyProfile.phoneNumber || '09153108763',
      'email': job.contactEmail || companyProfile.email || 'info@ashkghalam.ir',
      'ostan': 'خراسان رضوی',
      'shahr': 'مشهد',
      'category_id': '14', // Industry & Packaging
      'price': campaign.priceToman > 0 ? String(campaign.priceToman) : '0'
    };

    const urlParams = new URLSearchParams(formData);
    return {
      url: postUrl,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': `https://www.${domain}`,
        'Referer': postUrl
      },
      formData,
      postBody: urlParams.toString(),
      contentType: 'application/x-www-form-urlencoded',
      trackingUrl
    };
  }

  parseResponse(response: { statusCode: number; headers: Record<string, any>; body: string }, context: PlatformSubmissionContext): PlatformSubmissionResult {
    const { platform } = context;
    const { statusCode } = response;
    const trackingUrl = `https://www.${cleanDomain(platform.domain)}/my-ads/`;

    if (statusCode >= 200 && statusCode < 400) {
      return {
        success: true,
        status: 'under_review',
        progressPercent: 95,
        currentStep: `فرم آگهی با موفقیت در آگهی۲۴ ثبت و به صف بررسی ناظر ارسال شد.`,
        message: 'ثبت موفق در آگهی۲۴',
        httpCode: statusCode,
        trackingUrl,
        adUrl: null,
        platformName: platform.persianName || 'آگهی ۲۴',
        platformDomain: platform.domain,
        adapterUsed: this.id
      };
    }

    return {
      success: false,
      status: 'failed',
      progressPercent: 40,
      currentStep: `خطا در آگهی۲۴ با کد ${statusCode}`,
      message: `پاسخ ناموفق ${statusCode}`,
      httpCode: statusCode,
      trackingUrl,
      adUrl: null,
      platformName: platform.persianName || 'آگهی ۲۴',
      platformDomain: platform.domain,
      adapterUsed: this.id
    };
  }
}

// -------------------------------------------------------------
// 4. ParsCenter Adapter (پارس‌سنتر - پرتال B2B)
// -------------------------------------------------------------
export class ParsCenterAdapter implements IPlatformAdapter {
  id = 'adapter_parscenter';
  name = 'آداپتور پرتال صنعتی پارس‌سنتر (ParsCenter)';

  canHandle(platform: MediaPlatform): boolean {
    const dom = cleanDomain(platform.domain);
    return dom.includes('parscenter') || platform.name.toLowerCase().includes('parscenter');
  }

  buildPayloadSpec(context: PlatformSubmissionContext): PlatformPayloadSpec {
    const { campaign, job, companyProfile, platform } = context;
    const domain = cleanDomain(platform.domain) || 'parscenter.com';
    const postUrl = `https://${domain}/Product/Create`;
    const trackingUrl = `https://${domain}/User/Products`;

    const formData: Record<string, string> = {
      'ProductName': campaign.title,
      'ProductDescription': campaign.productDescription || campaign.title,
      'CompanyName': companyProfile.name || companyProfile.brandName || 'اشک قلم',
      'ContactNumber': job.contactPhone || companyProfile.phoneNumber || '09153108763',
      'Province': 'خراسان رضوی',
      'City': 'مشهد',
      'Sector': 'صنعت چاپ و بسته‌بندی',
      'Keywords': (campaign.targetKeywords || []).join(',')
    };

    const urlParams = new URLSearchParams(formData);
    return {
      url: postUrl,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': `https://${domain}`,
        'Referer': postUrl
      },
      formData,
      postBody: urlParams.toString(),
      contentType: 'application/x-www-form-urlencoded',
      trackingUrl
    };
  }

  parseResponse(response: { statusCode: number; headers: Record<string, any>; body: string }, context: PlatformSubmissionContext): PlatformSubmissionResult {
    const { platform } = context;
    const { statusCode } = response;
    const trackingUrl = `https://${cleanDomain(platform.domain)}/User/Products`;

    if (statusCode >= 200 && statusCode < 400) {
      return {
        success: true,
        status: 'under_review',
        progressPercent: 95,
        currentStep: `محصول صنعتی با موفقیت به دایرکتوری پارس‌سنتر تحویل شد.`,
        message: 'ثبت کاتالوگ در پارس‌سنتر',
        httpCode: statusCode,
        trackingUrl,
        adUrl: null,
        platformName: platform.persianName || 'پارس‌سنتر',
        platformDomain: platform.domain,
        adapterUsed: this.id
      };
    }

    return {
      success: false,
      status: 'failed',
      progressPercent: 35,
      currentStep: `خطای کد ${statusCode} در پارس‌سنتر`,
      message: `خطای پارس‌سنتر ${statusCode}`,
      httpCode: statusCode,
      trackingUrl,
      adUrl: null,
      platformName: platform.persianName || 'پارس‌سنتر',
      platformDomain: platform.domain,
      adapterUsed: this.id
    };
  }
}

// -------------------------------------------------------------
// 5. Baskool Adapter (باسکول - بازار B2B عمده)
// -------------------------------------------------------------
export class BaskoolAdapter implements IPlatformAdapter {
  id = 'adapter_baskool';
  name = 'آداپتور بازار عمده‌فروشی باسکول (Baskool)';

  canHandle(platform: MediaPlatform): boolean {
    const dom = cleanDomain(platform.domain);
    return dom.includes('baskool') || platform.name.toLowerCase().includes('baskool');
  }

  buildPayloadSpec(context: PlatformSubmissionContext): PlatformPayloadSpec {
    const { campaign, job, companyProfile, platform } = context;
    const domain = cleanDomain(platform.domain) || 'baskool.com';
    const postUrl = `https://www.${domain}/api/product/create`;
    const trackingUrl = `https://www.${domain}/profile/products`;

    const formData: Record<string, string> = {
      'title': campaign.title,
      'description': campaign.productDescription || campaign.title,
      'min_order': '500',
      'price': campaign.priceToman > 0 ? String(campaign.priceToman) : '0',
      'phone': job.contactPhone || companyProfile.phoneNumber || '09153108763',
      'location': 'مشهد، شهرک صنعتی کلات',
      'category_name': 'بسته‌بندی و کارتن'
    };

    const postBody = JSON.stringify(formData);
    return {
      url: postUrl,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Origin': `https://www.${domain}`,
        'Referer': `https://www.${domain}/profile/products/create`
      },
      formData,
      postBody,
      contentType: 'application/json',
      trackingUrl
    };
  }

  parseResponse(response: { statusCode: number; headers: Record<string, any>; body: string }, context: PlatformSubmissionContext): PlatformSubmissionResult {
    const { platform } = context;
    const { statusCode } = response;
    const trackingUrl = `https://www.${cleanDomain(platform.domain)}/profile/products`;

    if (statusCode >= 200 && statusCode < 400) {
      return {
        success: true,
        status: 'under_review',
        progressPercent: 95,
        currentStep: `محصول با موفقیت در بازار باسکول ثبت و در نوبت تایید قرار گرفت.`,
        message: 'ثبت موفق در باسکول',
        httpCode: statusCode,
        trackingUrl,
        adUrl: null,
        platformName: platform.persianName || 'باسکول',
        platformDomain: platform.domain,
        adapterUsed: this.id
      };
    }

    return {
      success: false,
      status: 'failed',
      progressPercent: 35,
      currentStep: `خطای کد ${statusCode} در باسکول`,
      message: `پاسخ ناموفق ${statusCode}`,
      httpCode: statusCode,
      trackingUrl,
      adUrl: null,
      platformName: platform.persianName || 'باسکول',
      platformDomain: platform.domain,
      adapterUsed: this.id
    };
  }
}

// -------------------------------------------------------------
// 6. NiazPardaz Adapter (نیازپرداز)
// -------------------------------------------------------------
export class NiazPardazAdapter implements IPlatformAdapter {
  id = 'adapter_niazpardaz';
  name = 'آداپتور نیازمندی‌های نیازپرداز (NiazPardaz)';

  canHandle(platform: MediaPlatform): boolean {
    const dom = cleanDomain(platform.domain);
    return dom.includes('niazpardaz') || platform.name.toLowerCase().includes('niazpardaz');
  }

  buildPayloadSpec(context: PlatformSubmissionContext): PlatformPayloadSpec {
    const { campaign, job, companyProfile, platform } = context;
    const domain = cleanDomain(platform.domain) || 'niazpardaz.com';
    const postUrl = `https://www.${domain}/ad/new`;
    const trackingUrl = `https://www.${domain}/ad/List`;

    const formData: Record<string, string> = {
      'title': campaign.title,
      'content': campaign.productDescription || campaign.title,
      'tell': job.contactPhone || companyProfile.phoneNumber || '09153108763',
      'email': job.contactEmail || companyProfile.email || 'info@ashkghalam.ir',
      'state_id': '11', // Khorasan Razavi
      'city_id': '1', // Mashhad
      'address': companyProfile.address || 'مشهد، شهرک صنعتی کلات',
      'cat_id': '267', // Printing & Packaging
      'price': campaign.priceToman > 0 ? String(campaign.priceToman) : '0'
    };

    const urlParams = new URLSearchParams(formData);
    return {
      url: postUrl,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': `https://www.${domain}`,
        'Referer': postUrl
      },
      formData,
      postBody: urlParams.toString(),
      contentType: 'application/x-www-form-urlencoded',
      trackingUrl
    };
  }

  parseResponse(response: { statusCode: number; headers: Record<string, any>; body: string }, context: PlatformSubmissionContext): PlatformSubmissionResult {
    const { platform } = context;
    const { statusCode, body } = response;
    const trackingUrl = `https://www.${cleanDomain(platform.domain)}/ad/List`;

    if (statusCode >= 200 && statusCode < 400) {
      return {
        success: true,
        status: 'under_review',
        progressPercent: 95,
        currentStep: `فرم آگهی با موفقیت به نیازپرداز تحویل داده شد.`,
        message: 'ثبت در نیازپرداز موفق',
        httpCode: statusCode,
        trackingUrl,
        adUrl: null,
        platformName: platform.persianName || 'نیازپرداز',
        platformDomain: platform.domain,
        adapterUsed: this.id
      };
    }

    return {
      success: false,
      status: 'failed',
      progressPercent: 30,
      currentStep: `خطا در نیازپرداز با کد ${statusCode}`,
      message: `خطای کد ${statusCode}`,
      httpCode: statusCode,
      trackingUrl,
      adUrl: null,
      platformName: platform.persianName || 'نیازپرداز',
      platformDomain: platform.domain,
      adapterUsed: this.id
    };
  }
}

// -------------------------------------------------------------
// 7. Dynamic Database-Driven Universal Adapter (الگوی پویا و تعریف‌شده در دیتابیس)
// -------------------------------------------------------------
export class DynamicDatabaseDrivenAdapter implements IPlatformAdapter {
  id = 'adapter_database_driven_universal';
  name = 'آداپتور عمومی هوشمند مبتنی بر متاداده و الگوهای دیتابیس (Database Pattern Engine)';

  canHandle(_platform: MediaPlatform): boolean {
    return true; // Fallback for all other platforms
  }

  buildPayloadSpec(context: PlatformSubmissionContext): PlatformPayloadSpec {
    const { campaign, job, companyProfile, platform } = context;
    const domain = cleanDomain(platform.domain) || 'classifieds.ir';
    const cfg = platform.adapterConfig || {};

    const endpoint = cfg.endpoint || '/ad/new';
    const method = (cfg.submitMethod || 'POST') as 'POST' | 'GET' | 'PUT';
    const format = cfg.requestFormat || 'form_urlencoded';
    const postUrl = endpoint.startsWith('http') ? endpoint : `https://${domain}${endpoint}`;
    const trackingUrl = cfg.trackingUrlPattern
      ? cfg.trackingUrlPattern.replace('{domain}', domain)
      : `https://${domain}/my-ads`;

    const fieldMap = cfg.fieldMap || {};

    const titleKey = fieldMap.title || 'title';
    const descKey = fieldMap.description || 'description';
    const phoneKey = fieldMap.phone || 'phone';
    const emailKey = fieldMap.email || 'email';
    const provinceKey = fieldMap.province || 'province';
    const cityKey = fieldMap.city || 'city';
    const priceKey = fieldMap.price || 'price';
    const addressKey = fieldMap.address || 'address';

    const formData: Record<string, string> = {
      [titleKey]: campaign.title,
      [descKey]: campaign.productDescription || campaign.title,
      [phoneKey]: job.contactPhone || companyProfile.phoneNumber || '09153108763',
      [emailKey]: job.contactEmail || companyProfile.email || 'info@ashkghalam.ir',
      [provinceKey]: cfg.defaultProvince || 'خراسان رضوی',
      [cityKey]: cfg.defaultCity || 'مشهد',
      [priceKey]: campaign.priceToman > 0 ? String(campaign.priceToman) : 'توافقی',
      [addressKey]: companyProfile.address || 'مشهد، شهرک صنعتی کلات'
    };

    if (fieldMap.customFields) {
      Object.entries(fieldMap.customFields).forEach(([k, v]) => {
        formData[k] = v;
      });
    }

    let postBody = '';
    let contentType = 'application/x-www-form-urlencoded';

    if (format === 'json') {
      postBody = JSON.stringify(formData);
      contentType = 'application/json';
    } else {
      const urlParams = new URLSearchParams(formData);
      postBody = urlParams.toString();
      contentType = 'application/x-www-form-urlencoded';
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Content-Type': contentType,
      'Origin': `https://${domain}`,
      'Referer': postUrl,
      ...(cfg.headers || {})
    };

    return {
      url: postUrl,
      method,
      headers,
      formData,
      postBody,
      contentType,
      trackingUrl
    };
  }

  parseResponse(response: { statusCode: number; headers: Record<string, any>; body: string }, context: PlatformSubmissionContext): PlatformSubmissionResult {
    const { platform } = context;
    const { statusCode, body } = response;
    const cfg = platform.adapterConfig || {};
    const domain = cleanDomain(platform.domain) || 'classifieds.ir';
    const trackingUrl = cfg.trackingUrlPattern
      ? cfg.trackingUrlPattern.replace('{domain}', domain)
      : `https://${domain}/my-ads`;

    const successCodes = cfg.successHttpCodes || [200, 201, 302, 301];
    const isCodeSuccess = successCodes.includes(statusCode);

    if (isCodeSuccess) {
      return {
        success: true,
        status: 'under_review',
        progressPercent: 95,
        currentStep: `فرم آگهی با الگوی دیتابیس به درگاه ${platform.persianName} ارسال گردید و در صف نظارت قرار گرفت.`,
        message: `تحویل داده شد به ${platform.name}`,
        httpCode: statusCode,
        trackingUrl,
        adUrl: null,
        platformName: platform.persianName || platform.name,
        platformDomain: platform.domain,
        adapterUsed: this.id
      };
    }

    return {
      success: false,
      status: statusCode === 401 || statusCode === 403 ? 'paused_user_action' : 'failed',
      progressPercent: 35,
      currentStep: `پاسخ وب‌سایت ${platform.persianName} همراه با وضعیت ${statusCode} دریافت شد.`,
      message: `خطای کد ${statusCode}`,
      httpCode: statusCode,
      trackingUrl,
      adUrl: null,
      platformName: platform.persianName || platform.name,
      platformDomain: platform.domain,
      adapterUsed: this.id
    };
  }
}

// -------------------------------------------------------------
// Platform Adapter Registry (مرکز مدیریت و مسیریابی آداپتورها)
// -------------------------------------------------------------
export class MultiPlatformAdapterRegistry {
  private adapters: IPlatformAdapter[] = [];
  private fallbackAdapter: IPlatformAdapter;

  constructor() {
    this.fallbackAdapter = new DynamicDatabaseDrivenAdapter();
    // Register specialized adapters first
    this.register(new IstgahAdapter());
    this.register(new PayamsaraAdapter());
    this.register(new Agahi24Adapter());
    this.register(new ParsCenterAdapter());
    this.register(new BaskoolAdapter());
    this.register(new NiazPardazAdapter());
  }

  public register(adapter: IPlatformAdapter): void {
    this.adapters.push(adapter);
  }

  public getAdapterForPlatform(platform: MediaPlatform): IPlatformAdapter {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(platform)) {
        return adapter;
      }
    }
    return this.fallbackAdapter;
  }

  public getAllAdapters(): IPlatformAdapter[] {
    return [...this.adapters, this.fallbackAdapter];
  }
}

export const platformAdapterRegistry = new MultiPlatformAdapterRegistry();
