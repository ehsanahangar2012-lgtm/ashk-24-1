/**
 * ماژول ارکستراسیون تولید محتوای تبلیغاتی با معماری مقاوم
 * هماهنگی بین Gemini 3.8 Flash و موتور آفلاین بومی اشک ۲۴
 */

import { GeminiClient } from './geminiClient.js';
import { LocalCampaignAiEngine } from '../localCampaignAiEngine.js';
import { GeneratedCampaignContent } from './schemas.js';
import { callApi } from '../api/apiClient.js';

export class CampaignGenerator {
  public static async generate(params: {
    productName: string;
    description?: string;
    keywords?: string[];
    sector?: string;
    tone?: string;
    brandName?: string;
    priceToman?: number;
    userPrompt?: string;
  }): Promise<GeneratedCampaignContent> {
    const keywords = params.keywords && params.keywords.length > 0
      ? params.keywords
      : ['تولید و فروش', 'سفارش مستقیم', 'کیفیت عالی'];
    const sector = params.sector || 'industrial';
    const tone = params.tone || 'persuasive';
    const priceText = params.priceToman && params.priceToman > 0
      ? `${params.priceToman.toLocaleString('fa-IR')} تومان`
      : 'توافقی / استعلام تماس';

    // ۱. ابتدا تلاش برای فراخوانی بک‌اند یا Gemini Client
    try {
      const serverRes = await callApi<any>('ai/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          keywords,
          tone,
          sector,
          productName: params.productName,
          description: params.description,
          priceText,
          userPrompt: params.userPrompt,
        }),
      });

      if (serverRes && Array.isArray(serverRes.topics) && serverRes.topics.length > 0) {
        return {
          provider: serverRes.provider || 'cpanel-ai-engine',
          topics: serverRes.topics,
          suggestedTitle: serverRes.topics[0] || `تولید و عرضه ${params.productName}`,
          suggestedBody: serverRes.contentVariations?.[0]?.content || `${params.description || ''}`,
          suggestedShortSnippet: `عرضه مستقیم ${params.productName} با قیمت رقابتی.`,
          bulletPoints: ['تضمین کیفیت', 'ارسال سریع', 'خرید مستقیم'],
          suggestedHashtags: keywords.map(k => '#' + k.replace(/\s+/g, '_')),
          seoScore: serverRes.seoScore || 96,
          callToAction: 'جهت ثبت سفارش با ما تماس حاصل فرمایید.',
          reasoning: 'تولید شده با موتور کپی‌رایتینگ تخصصی سرور.',
        };
      }
    } catch (e) {}

    // ۲. تلاش از طریق GeminiClient سمت سرور/کلاینت
    try {
      const geminiResult = await GeminiClient.generateCampaignCopy({
        productName: params.productName,
        description: params.description,
        keywords,
        sector,
        tone,
        brandName: params.brandName,
        priceText,
        userPrompt: params.userPrompt,
      });

      if (geminiResult.success && geminiResult.data) {
        return geminiResult.data;
      }
    } catch (e) {}

    // ۳. موتور آفلاین بومی (ضمانت قطعی ۱۰۰٪ کارکرد بدون اینترنت و فیلترینگ)
    const localBlueprint = LocalCampaignAiEngine.generateCampaignBlueprint({
      productName: params.productName,
      productDescription: params.description || '',
      priceToman: params.priceToman || 0,
      customKeywords: keywords,
      sector,
      tone,
    });

    return {
      provider: 'local-offline-engine-iran',
      topics: [
        localBlueprint.title,
        `عرضه بدون واسطه ${params.productName} با تخفیف ویژه سازمانی`,
        `خرید مستقیم ${params.productName} از درب کارخانه`,
        `طراحی و تولید سفارشی ${params.productName} با بهترین متریال`,
      ],
      suggestedTitle: localBlueprint.title,
      suggestedBody: localBlueprint.bodyText,
      suggestedShortSnippet: localBlueprint.shortSnippet,
      bulletPoints: localBlueprint.bulletPoints,
      suggestedHashtags: localBlueprint.suggestedHashtags,
      seoScore: localBlueprint.seoScore,
      callToAction: 'جهت مشاوره و دریافت پیش‌فاکتور با شماره تماس ما ارتباط برقرار فرمایید.',
      reasoning: 'تولید شده توسط موتور آفلاین اشک ۲۴ سازگار با شرایط شبکه ملی و قطعی اینترنت.',
    };
  }
}
