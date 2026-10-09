/**
 * Ashk24 Unified Publication & Content Verification Service
 * Shared engine for Backend (Node/cPanel), Browser Client & Local Agent
 * Version: 5.9.36
 * 
 * قوانین اعتبارسنجی مستقل:
 * ۱. استخراج و بررسی ساختار URL: رد لینک‌های ورود، ثبت‌نام، پنل ادمین یا سبد خرید
 * ۲. راستی‌آزمایی واقعی شبکه و پروتکل HTTP: پاسخ باید معتبر و با کد وضعیت 200 باشد
 * ۳. راستی‌آزمایی دقیق و مستقل محتوا: تطبیق چند کلمه کلیدی غیرعمومی از عنوان کمپین و شناسه آگهی
 * ۴. رد قطعی تطبیق تک‌کلمه‌ای عمومی (مانند "کارتن" یا "آگهی") به عنوان گواه انتشار
 */

// کلمات عمومی که به تنهایی برای اثبات انتشار آگهی معتبر نیستند
const GENERIC_EXCLUDED_TERMS = new Set([
  'کارتن', 'جعبه', 'آگهی', 'فروش', 'خرید', 'تولید', 'ایران', 'قیمت', 'تماس',
  'تهران', 'مشهد', 'اصفهان', 'تبریز', 'شیراز', 'شرکت', 'صنعت', 'پست', 'بازار',
  'ad', 'post', 'view', 'manage', 'free', 'iran', 'item', 'product'
]);

/**
 * پاکسازی و استخراج کلمات کلیدی مشخص و اختصاصی از عنوان یا متن کمپین
 * @param {string} text 
 * @returns {string[]}
 */
export function extractSpecificKeywords(text) {
  if (!text || typeof text !== 'string') return [];
  
  // تبدیل به کلمات منفرد بدون علائم نگارشی
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length >= 3 && !GENERIC_EXCLUDED_TERMS.has(w));
  
  // حذف موارد تکراری
  return Array.from(new Set(words));
}

/**
 * بررسی اینکه آیا آدرس یک آدرس عمومی معتبر برای نمایش آگهی است یا صفحه ورود/ثبت‌نام
 * @param {string} url 
 * @returns {{ valid: boolean; reason?: string }}
 */
export function validatePublicAdUrlFormat(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'آدرس اینترنتی ارائه نشده است.' };
  }

  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, reason: 'پروتکل آدرس اینترنتی نامعتبر است (باید http یا https باشد).' };
  }

  const lower = trimmed.toLowerCase();
  const authOrAdminKeywords = ['login', 'register', 'auth', 'signin', 'signup', 'dashboard', 'panel', 'admin', 'download'];
  for (const kw of authOrAdminKeywords) {
    if (lower.includes(kw)) {
      return {
        valid: false,
        reason: `آدرس ارائه‌شده مربوط به بخش احراز هویت یا مدیریت است (${kw}) و صفحه عمومی آگهی نیست.`
      };
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
      return {
        valid: false,
        reason: 'آدرس ارائه شده فقط دامنه اصلی است و شناسه یا صفحه جزئیات آگهی را شامل نمی‌شود.'
      };
    }
  } catch (e) {
    return { valid: false, reason: 'ساختار آدرس اینترنتی استاندارد نیست.' };
  }

  return { valid: true };
}

/**
 * بررسی تطابق شواهد در متن دریافت شده از صفحه با عنوان و مشخصات کمپین
 * @param {string} pageContent - کل متن یا HTML استخراج‌شده از صفحه
 * @param {string} currentUrl - آدرس فعلی صفحه
 * @param {{ expectedTitle?: string; expectedJobId?: string; expectedCampaignId?: string; expectedPhone?: string }} options
 * @returns {{ matched: boolean; matchedKeywords: string[]; matchedJobId: boolean; reason?: string }}
 */
export function evaluatePageContentEvidence(pageContent, currentUrl, options = {}) {
  const { expectedTitle = '', expectedJobId = '', expectedPhone = '' } = options;

  if (!pageContent || typeof pageContent !== 'string' || pageContent.length < 150) {
    return {
      matched: false,
      matchedKeywords: [],
      matchedJobId: false,
      reason: 'محتوای صفحه خالی است یا حجم آن برای یک آگهی معتبر ناکافی است.'
    };
  }

  const lowerContent = pageContent.toLowerCase();

  // نشانه‌های صریح صفحات خطا و نبود آگهی
  const errorIndicators = [
    '404 not found',
    'صفحه مورد نظر یافت نشد',
    'آگهی حذف شده است',
    'این آگهی منقضی شده',
    'یافت نشد'
  ];
  for (const ind of errorIndicators) {
    if (lowerContent.includes(ind)) {
      return {
        matched: false,
        matchedKeywords: [],
        matchedJobId: false,
        reason: `صفحه حاوی پیام خطای سیستمی است: «${ind}»`
      };
    }
  }

  // ۱. بررسی شناسه آگهی در URL یا متن صفحه
  let matchedJobId = false;
  if (expectedJobId) {
    const cleanJobId = String(expectedJobId).trim();
    if (cleanJobId && (currentUrl.includes(cleanJobId) || lowerContent.includes(cleanJobId.toLowerCase()))) {
      matchedJobId = true;
    }
  }

  // ۲. تطبیق عنوان واقعی کمپین
  const specificKeywords = extractSpecificKeywords(expectedTitle);
  const matchedKeywords = [];

  for (const kw of specificKeywords) {
    if (lowerContent.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  // اگر عنوان حاوی چند کلمه اختصاصی بود، تطبیق حداقل ۳ کلمه یا ۵۰٪ کلمات الزامی است
  const requiredMatches = specificKeywords.length >= 4
    ? Math.max(3, Math.ceil(specificKeywords.length * 0.5))
    : (specificKeywords.length <= 1 ? 1 : Math.min(2, specificKeywords.length));

  const matchedTitle = specificKeywords.length > 0 && matchedKeywords.length >= requiredMatches;

  // تلفن تماس
  let matchedPhone = false;
  if (expectedPhone && expectedPhone.length >= 7) {
    const cleanPhone = expectedPhone.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length >= 7 && lowerContent.includes(cleanPhone)) {
      matchedPhone = true;
    }
  }

  // تصمیم‌گیری نهایی: باید یا عنوان منطبق باشد یا شناسه معتبر آگهی + حداقل ۲ کلمه اختصاصی
  const isSufficientEvidence = matchedTitle || (matchedJobId && matchedKeywords.length >= 2);

  if (!isSufficientEvidence) {
    return {
      matched: false,
      matchedTitle: false,
      matchedKeywords,
      matchedJobId,
      matchedPhone,
      reason: `شواهد محتوایی کافی در صفحه یافت نشد (کلمات تطبیق‌یافته: [${matchedKeywords.join('، ')}] از [${specificKeywords.join('، ')}]).`
    };
  }

  return {
    matched: true,
    matchedTitle,
    matchedKeywords,
    matchedJobId,
    matchedPhone,
    reason: undefined
  };
}

/**
 * متد جامع راستی‌آزمایی مستقل آدرس عمومی آگهی در اینترنت (استفاده مشترک در سرور و ورکرها)
 * @param {{
 *   url: string;
 *   expectedTitle: string;
 *   expectedJobId?: string;
 *   expectedCampaignId?: string;
 *   expectedPhone?: string;
 *   timeoutMs?: number;
 * }} options
 * @returns {Promise<{
 *   verified: boolean;
 *   httpStatus: number;
 *   url: string;
 *   matchedTitle: boolean;
 *   matchedId: boolean;
 *   matchedKeywords: string[];
 *   error?: string;
 *   verifiedAt: string;
 * }>}
 */
export async function verifyPublicationEvidence(options) {
  const { url, expectedTitle = '', expectedJobId = '', expectedPhone = '', timeoutMs = 8000 } = options;
  const nowIso = new Date().toISOString();

  // ۱. بررسی فرمت آدرس
  const urlCheck = validatePublicAdUrlFormat(url);
  if (!urlCheck.valid) {
    return {
      verified: false,
      httpStatus: 422,
      url: url || '',
      matchedTitle: false,
      matchedId: false,
      matchedKeywords: [],
      error: urlCheck.reason,
      verifiedAt: nowIso
    };
  }

  // ۲. استعلام زنده HTTP با جلوگیری از خطای گواهی SSL در محیط‌های تست
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Ashk24-Verification-Engine/5.9.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });

    clearTimeout(timer);

    const httpStatus = res.status;
    if (httpStatus < 200 || httpStatus >= 400) {
      return {
        verified: false,
        httpStatus,
        url,
        matchedTitle: false,
        matchedId: false,
        matchedKeywords: [],
        error: `پاسخ ناموفق سرور مقصد با کد وضعیت ${httpStatus}.`,
        verifiedAt: nowIso
      };
    }

    const html = await res.text();

    // ۳. ارزیابی محتوای واقعی
    const evalResult = evaluatePageContentEvidence(html, res.url || url, {
      expectedTitle,
      expectedJobId,
      expectedPhone
    });

    if (!evalResult.matched) {
      return {
        verified: false,
        httpStatus,
        url: res.url || url,
        matchedTitle: false,
        matchedId: evalResult.matchedJobId,
        matchedKeywords: evalResult.matchedKeywords,
        error: evalResult.reason,
        verifiedAt: nowIso
      };
    }

    return {
      verified: true,
      httpStatus,
      url: res.url || url,
      matchedTitle: true,
      matchedId: evalResult.matchedJobId,
      matchedKeywords: evalResult.matchedKeywords,
      verifiedAt: nowIso
    };

  } catch (err) {
    return {
      verified: false,
      httpStatus: 0,
      url,
      matchedTitle: false,
      matchedId: false,
      matchedKeywords: [],
      error: `عدم امکان دسترسی یا دریافت پاسخ از آدرس مقصد: ${err.message || 'خطای اتصال شبکه'}`,
      verifiedAt: nowIso
    };
  }
}
