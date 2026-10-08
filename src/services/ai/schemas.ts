/**
 * تعاریف اسکیما و اعتبارسنجی خروجی هوش مصنوعی (AI Output Validation Schemas)
 */

export interface GeneratedCampaignContent {
  provider: string;
  topics: string[];
  suggestedTitle: string;
  suggestedBody: string;
  suggestedShortSnippet: string;
  bulletPoints: string[];
  suggestedHashtags: string[];
  seoScore: number;
  callToAction: string;
  reasoning: string;
}

export function validateCampaignContent(raw: any): { valid: boolean; data?: GeneratedCampaignContent; errors: string[] } {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['خروجی مدل آبجکت معتبر JSON نیست.'] };
  }

  const topics = Array.isArray(raw.topics) ? raw.topics.filter((t: any) => typeof t === 'string' && t.trim().length > 3) : [];
  if (topics.length === 0) {
    if (typeof raw.suggestedTitle === 'string' && raw.suggestedTitle.trim().length > 3) {
      topics.push(raw.suggestedTitle.trim());
    } else {
      errors.push('فیلد topics شامل حداقل یک تیتر معتبر نیست.');
    }
  }

  const suggestedTitle = typeof raw.suggestedTitle === 'string' && raw.suggestedTitle.trim() ? raw.suggestedTitle.trim() : (topics[0] || '');
  const suggestedBody = typeof raw.suggestedBody === 'string' && raw.suggestedBody.trim() ? raw.suggestedBody.trim() : '';
  if (!suggestedBody || suggestedBody.length < 15) {
    errors.push('متن اصلی آگهی (suggestedBody) بسیار کوتاه یا نامعتبر است.');
  }

  const bulletPoints = Array.isArray(raw.bulletPoints)
    ? raw.bulletPoints.filter((b: any) => typeof b === 'string' && b.trim().length > 2)
    : [];

  const suggestedHashtags = Array.isArray(raw.suggestedHashtags)
    ? raw.suggestedHashtags.filter((h: any) => typeof h === 'string').map((h: string) => h.startsWith('#') ? h : '#' + h)
    : [];

  const seoScore = typeof raw.seoScore === 'number' && raw.seoScore >= 0 && raw.seoScore <= 100
    ? Math.round(raw.seoScore)
    : 95;

  const validData: GeneratedCampaignContent = {
    provider: typeof raw.provider === 'string' ? raw.provider : 'gemini-3.8-flash',
    topics,
    suggestedTitle,
    suggestedBody,
    suggestedShortSnippet: typeof raw.suggestedShortSnippet === 'string' ? raw.suggestedShortSnippet : (suggestedBody.slice(0, 120) + '...'),
    bulletPoints: bulletPoints.length > 0 ? bulletPoints : ['تضمین کیفیت', 'تحویل فوری', 'قیمت رقابتی'],
    suggestedHashtags: suggestedHashtags.length > 0 ? suggestedHashtags : ['#آگهی_ویژه', '#تولید_ملی'],
    seoScore,
    callToAction: typeof raw.callToAction === 'string' ? raw.callToAction : 'جهت کسب اطلاعات بیشتر و ثبت سفارش تماس حاصل فرمایید.',
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : 'تولید شده بر اساس الگوریتم‌های استاندارد سئو و نگارش فارسی.',
  };

  return { valid: errors.length === 0, data: validData, errors };
}
