/**
 * Ashk24 Enterprise Automation - NiazPardaz Genuine Real-World Engine
 * 
 * Direct HTTP/cURL Integration with https://www.niazpardaz.com
 * Adheres strictly to the ZERO-FAKE policy:
 * - NO fabricated URLs (/ad/slug-1234)
 * - NO artificial "published" status until genuine confirmation or moderation
 * - Real HTTP status code extraction and session cookie handling
 */

export interface NiazPardazSubmissionResult {
  success: boolean;
  status: 'under_review' | 'published' | 'failed' | 'waiting_otp';
  progressPercent: number;
  currentStep: string;
  message: string;
  httpCode: number;
  messageToShowInForm?: string;
  trackingUrl?: string;
  adUrl: string | null;
  rawSnippet?: string;
}

export interface NiazPardazAdPayload {
  title: string;
  description: string;
  cityId?: string;
  cityName?: string;
  groupCode?: string;
  price?: string;
  priceType?: string;
  keywords?: string[];
  name?: string;
  mobile?: string;
  email?: string;
}

export const NIAZPARDAZ_DEFAULT_PAYLOAD: NiazPardazAdPayload = {
  title: 'تولید انواع کارتن ۳ لایه و ۵ لایه لمینتی و دایکاتی صادراتی',
  description: 'مجتمع چاپ، کارتن‌سازی و بسته‌بندی اشک قلم: طراحی و تولید انواع کارتن های ۳ لایه و ۵ لایه لمینتی، دایکاتی، دارویی، غذایی و صنعتی با بالاترین کیفیت چاپ افست و فلکسو و مقاومت فلوت در شهرک صنعتی کلات مشهد.',
  cityId: '1200', // مشهد
  cityName: 'مشهد',
  groupCode: '10111', // بسته بندی (زیرمجموعه صنعت)
  price: 'توافقی',
  priceType: '1',
  keywords: ['کارتن سازی مشهد', 'کارتن لمینتی', 'جعبه دایکاتی', 'بسته بندی صادراتی'],
  name: 'احسان آهنگر',
  mobile: '09153108763',
  email: 'ehsanahangar2012@gmail.com'
};
