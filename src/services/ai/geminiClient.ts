/**
 * کلاینت مستقیم هوش مصنوعی گوگل جمنای بر پایه @google/genai SDK
 * همراه با مدیریت کلید، اسکیمای ساختاریافته و جلوگیری از توقف برنامه
 */

import { GoogleGenAI } from '@google/genai';
import { PromptTemplates } from './promptTemplates.js';
import { GeneratedCampaignContent, validateCampaignContent } from './schemas.js';

export class GeminiClient {
  private static instance: GoogleGenAI | null = null;

  private static getClient(): GoogleGenAI | null {
    try {
      // در محیط AI Studio کلید از پروسس یا متغیرهای محیطی خوانده می‌شود
      const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : '';
      if (!this.instance && apiKey) {
        this.instance = new GoogleGenAI({ apiKey });
      }
      return this.instance;
    } catch (e) {
      return null;
    }
  }

  public static async generateCampaignCopy(params: {
    productName: string;
    description?: string;
    keywords: string[];
    sector: string;
    tone: string;
    brandName?: string;
    priceText?: string;
    userPrompt?: string;
  }): Promise<{ success: boolean; data?: GeneratedCampaignContent; error?: string }> {
    const ai = this.getClient();
    if (!ai) {
      return { success: false, error: 'GEMINI_CLIENT_NOT_CONFIGURED' };
    }

    try {
      const { systemInstruction, contents } = PromptTemplates.buildCampaignCopyPrompt(params);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const responseText = response.text || '';
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(responseText.trim().replace(/^```json/i, '').replace(/```$/i, ''));
      } catch (jsonErr) {
        return { success: false, error: 'INVALID_JSON_RESPONSE' };
      }

      const validation = validateCampaignContent(parsedJson);
      if (validation.valid && validation.data) {
        return { success: true, data: validation.data };
      }

      return {
        success: false,
        error: `SCHEMA_VALIDATION_FAILED: ${validation.errors.join(', ')}`,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'GEMINI_API_ERROR' };
    }
  }
}
