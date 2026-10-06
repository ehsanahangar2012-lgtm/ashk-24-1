/**
 * سرویس یادگیری عمیق تطبیقی و طبقه‌بندی معنایی چندسیگنالی فیلدها
 * Ashk 24 Deep Adaptive Semantic Learning & Popup Interceptor Engine (v5.7.0)
 *
 * قابلیت‌ها:
 * ۱. بستن خودکار پاپ‌آپ‌ها، بنرها و دیالوگ‌های مزاحم در صفحات هدف
 * ۲. تشخیص خودکار دکمه‌های ورود، ثبت‌نام و ثبت آگهی در صفحات اصلی
 * ۳. امتیازدهی معنایی وزنی چندسیگنالی (Multi-Signal Scoring) برای تفکیک دقیق نام شرکت، نام شخص، عنوان و موبایل
 * ۴. یادگیری عمیق تطبیقی محلی (Local Adaptive Learning) از تصحیحات کاربر و حفظ آن در دیتابیس cPanel و مرورگر
 */

export type SemanticFieldRole =
  | 'ad_title'
  | 'ad_description'
  | 'contact_person'
  | 'company_name'
  | 'mobile_phone'
  | 'landline_phone'
  | 'province'
  | 'city'
  | 'category'
  | 'price'
  | 'address'
  | 'otp_code'
  | 'terms_agree'
  | 'submit_action'
  | 'unknown';

export interface LearnedFieldPattern {
  id: string;
  domain: string;
  role: SemanticFieldRole;
  selector: string;
  tagName: string;
  inputName?: string;
  inputId?: string;
  placeholderText?: string;
  labelText?: string;
  confidenceScore: number;
  learnedAtJalali: string;
  source: 'user_correction' | 'adaptive_inference' | 'manual_preset';
}

export interface SemanticScoreResult {
  role: SemanticFieldRole;
  score: number;
  matchedKeywords: string[];
  reason: string;
}

const STORAGE_KEY = 'ashk24_adaptive_learned_patterns';

class AdaptiveFieldLearningService {
  private static instance: AdaptiveFieldLearningService;
  private learnedPatterns: Map<string, LearnedFieldPattern[]> = new Map();

  private constructor() {
    this.loadPatternsFromStorage();
  }

  public static getInstance(): AdaptiveFieldLearningService {
    if (!AdaptiveFieldLearningService.instance) {
      AdaptiveFieldLearningService.instance = new AdaptiveFieldLearningService();
    }
    return AdaptiveFieldLearningService.instance;
  }

  private loadPatternsFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed: LearnedFieldPattern[] = JSON.parse(data);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            const list = this.learnedPatterns.get(p.domain) || [];
            list.push(p);
            this.learnedPatterns.set(p.domain, list);
          });
        }
      }
    } catch (e) {
      console.warn('[AdaptiveLearning] Error loading patterns:', e);
    }
  }

  private savePatternsToStorage(): void {
    try {
      const all: LearnedFieldPattern[] = [];
      this.learnedPatterns.forEach((list) => all.push(...list));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

      // Attempt to sync to cPanel API if reachable
      fetch('/cpanel-backend/api/index.php?route=adaptive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patterns: all }),
      }).catch(() => {});
    } catch (e) {}
  }

  /**
   * آموزش و یادگیری یک الگوی جدید از تعامل یا تصحیح کاربر
   */
  public learnPattern(pattern: Omit<LearnedFieldPattern, 'id' | 'confidenceScore'>): LearnedFieldPattern {
    const cleanDomain = pattern.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const newPattern: LearnedFieldPattern = {
      ...pattern,
      domain: cleanDomain,
      id: `pat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      confidenceScore: 0.98,
    };

    const list = this.learnedPatterns.get(cleanDomain) || [];
    // Remove conflicting pattern for same selector and role
    const filtered = list.filter((p) => p.selector !== newPattern.selector);
    filtered.unshift(newPattern);
    this.learnedPatterns.set(cleanDomain, filtered);

    this.savePatternsToStorage();
    return newPattern;
  }

  public getPatternsForDomain(domain: string): LearnedFieldPattern[] {
    const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    return this.learnedPatterns.get(cleanDomain) || [];
  }

  public getAllLearnedPatterns(): LearnedFieldPattern[] {
    const all: LearnedFieldPattern[] = [];
    this.learnedPatterns.forEach((list) => all.push(...list));
    return all;
  }

  public deletePattern(id: string): void {
    this.learnedPatterns.forEach((list, domain) => {
      this.learnedPatterns.set(domain, list.filter((p) => p.id !== id));
    });
    this.savePatternsToStorage();
  }

  /**
   * ارزیابی و طبقه‌بندی معنایی چندسیگنالی برای جلوگیری از اختلاط فیلدها
   */
  public classifyField(descriptor: {
    domain?: string;
    tagName: string;
    type?: string;
    name?: string;
    id?: string;
    placeholder?: string;
    labelText?: string;
    surroundingText?: string;
    selector?: string;
  }): SemanticScoreResult {
    const { domain, tagName, type = 'text', name = '', id = '', placeholder = '', labelText = '', surroundingText = '', selector = '' } = descriptor;

    // ۱. اولویت اول: بررسی الگوهای آموخته‌شده قبلی برای این دامنه (Exact Learned Match)
    if (domain) {
      const cleanDom = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      const patterns = this.learnedPatterns.get(cleanDom) || [];
      for (const p of patterns) {
        if (
          (selector && p.selector === selector) ||
          (name && p.inputName && p.inputName.toLowerCase() === name.toLowerCase()) ||
          (id && p.inputId && p.inputId.toLowerCase() === id.toLowerCase())
        ) {
          return {
            role: p.role,
            score: 0.99,
            matchedKeywords: ['الگوی یادگیری‌شده کاربر (Learned Pattern)'],
            reason: `این فیلد قبلاً توسط یادگیری تطبیقی برای دامنه ${cleanDom} تثبیت شده است.`,
          };
        }
      }
    }

    // ادغام متن‌های توصیفی با وزن‌دهی
    const labelCombined = `${labelText} ${placeholder}`.toLowerCase();
    const technicalCombined = `${name} ${id} ${type}`.toLowerCase();
    const allText = `${labelCombined} ${technicalCombined} ${surroundingText}`.toLowerCase();

    // ۲. فیلد شماره موبایل (Mobile Phone)
    const mobileSignals = ['موبایل', 'شماره همراه', 'همراه', 'تلفن همراه', 'mobile', 'cellphone', 'cell_phone', 'txtmobile'];
    if (type === 'tel' || mobileSignals.some((s) => allText.includes(s))) {
      if (!allText.includes('ثابت') && !allText.includes('دفتر') && !allText.includes('کد پستی')) {
        return {
          role: 'mobile_phone',
          score: 0.95,
          matchedKeywords: mobileSignals.filter((s) => allText.includes(s)),
          reason: 'مطابقت دقیق با مشخصات شماره همراه (Mobile/Tel)',
        };
      }
    }

    // ۳. فیلد نام شرکت یا کسب‌وکار (Company Name)
    const companySignals = ['نام شرکت', 'نام مجتمع', 'نام فروشگاه', 'نام واحد', 'نام برند', 'شرکت', 'سازمان', 'company', 'brand', 'organization', 'business_name', 'companyname'];
    if (companySignals.some((s) => allText.includes(s)) && !allText.includes('نام و نام خانوادگی')) {
      return {
        role: 'company_name',
        score: 0.92,
        matchedKeywords: companySignals.filter((s) => allText.includes(s)),
        reason: 'تشخیص نام کسب‌وکار/شرکت (عدم اختلاط با نام شخص)',
      };
    }

    // ۴. فیلد نام و نام خانوادگی شخص رابط (Contact Person / Full Name)
    const personSignals = ['نام و نام خانوادگی', 'نام آگهی دهنده', 'نام رابط', 'نام تماس', 'نام مسئول', 'fullname', 'full_name', 'first_name', 'last_name', 'contact_name', 'contactperson', 'sendername'];
    if (personSignals.some((s) => allText.includes(s)) || (labelCombined.includes('نام') && !labelCombined.includes('شرکت') && !labelCombined.includes('کاربری') && !labelCombined.includes('آگهی'))) {
      return {
        role: 'contact_person',
        score: 0.90,
        matchedKeywords: personSignals.filter((s) => allText.includes(s)),
        reason: 'تشخیص فیلد نام شخص رابط (مهندس احسان آهنگر)',
      };
    }

    // ۵. فیلد عنوان آگهی (Ad Title)
    const titleSignals = ['عنوان آگهی', 'عنوان مطلب', 'تیتر آگهی', 'موضوع آگهی', 'عنوان کالا', 'عنوان خدمات', 'title', 'subject', 'heading', 'ad_title', 'txttitle'];
    if (titleSignals.some((s) => allText.includes(s)) || (labelCombined.includes('عنوان') && !labelCombined.includes('شرکت'))) {
      return {
        role: 'ad_title',
        score: 0.96,
        matchedKeywords: titleSignals.filter((s) => allText.includes(s)),
        reason: 'تشخیص فیلد عنوان آگهی (تفکیک از نام شخص)',
      };
    }

    // ۶. فیلد شرح و متن آگهی (Ad Description / Body)
    const descSignals = ['متن آگهی', 'توضیحات آگهی', 'شرح آگهی', 'متن کامل', 'شرح کالا', 'description', 'desc', 'content', 'comment', 'txtcomment', 'txtbody', 'body'];
    if (tagName.toUpperCase() === 'TEXTAREA' || descSignals.some((s) => allText.includes(s))) {
      return {
        role: 'ad_description',
        score: 0.94,
        matchedKeywords: descSignals.filter((s) => allText.includes(s)),
        reason: 'تشخیص فیلد چندخطی شرح آگهی (Textarea/Body)',
      };
    }

    // ۷. فیلد استان (Province)
    const provinceSignals = ['استان', 'province', 'state', 'ostan', 'ddlstate', 'provinceid'];
    if (provinceSignals.some((s) => allText.includes(s))) {
      return {
        role: 'province',
        score: 0.91,
        matchedKeywords: provinceSignals.filter((s) => allText.includes(s)),
        reason: 'تشخیص انتخاب استان جغرافیایی',
      };
    }

    // ۸. فیلد شهر (City)
    const citySignals = ['شهر', 'شهرستان', 'city', 'shahr', 'cityid', 'ddlcity'];
    if (citySignals.some((s) => allText.includes(s))) {
      return {
        role: 'city',
        score: 0.91,
        matchedKeywords: citySignals.filter((s) => allText.includes(s)),
        reason: 'تشخیص فیلد شهر (مشهد)',
      };
    }

    // ۹. فیلد دسته‌بندی موضوعی (Category)
    const catSignals = ['دسته‌بندی', 'دسته بندی', 'گروه', 'شاخه', 'موضوع', 'category', 'cat', 'group', 'categoryid'];
    if (catSignals.some((s) => allText.includes(s))) {
      return {
        role: 'category',
        score: 0.88,
        matchedKeywords: catSignals.filter((s) => allText.includes(s)),
        reason: 'تشخیص انتخاب دسته‌بندی و شاخه موضوعی',
      };
    }

    // ۱۰. فیلد کد تایید پیامکی (OTP Code)
    const otpSignals = ['کد تایید', 'کد پیامک', 'کد فعالسازی', 'رمز یکبار مصرف', 'otp', 'code', 'smscode', 'verificationcode'];
    if (otpSignals.some((s) => allText.includes(s))) {
      return {
        role: 'otp_code',
        score: 0.98,
        matchedKeywords: otpSignals.filter((s) => allText.includes(s)),
        reason: 'تشخیص درگاه ورود کد تایید پیامکی OTP',
      };
    }

    return {
      role: 'unknown',
      score: 0.3,
      matchedKeywords: [],
      reason: 'نیاز به تعیین توسط کاربر یا پایش عمیق‌تر',
    };
  }
}

export const adaptiveLearningService = AdaptiveFieldLearningService.getInstance();
