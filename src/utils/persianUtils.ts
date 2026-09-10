// Persian digits map
const ENGLISH_TO_PERSIAN_DIGITS: { [key: string]: string } = {
  '0': '۰',
  '1': '۱',
  '2': '۲',
  '3': '۳',
  '4': '۴',
  '5': '۵',
  '6': '۶',
  '7': '۷',
  '8': '۸',
  '9': '۹',
};

const PERSIAN_TO_ENGLISH_DIGITS: { [key: string]: string } = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

/**
 * Converts English numbers in a string or number to Persian digits
 */
export function toPersianDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  return str.replace(/[0-9]/g, (digit) => ENGLISH_TO_PERSIAN_DIGITS[digit] || digit);
}

/**
 * Converts Persian numbers in a string to English digits
 */
export function toEnglishDigits(input: string | undefined | null): string {
  if (!input) return '';
  return input.replace(/[۰-۹]/g, (digit) => PERSIAN_TO_ENGLISH_DIGITS[digit] || digit);
}

/**
 * Formats a numeric price into Toman currency string with Persian digits and 3-digit comma separators
 */
export function toTomanFormat(amountInToman: number | string | undefined | null): string {
  if (amountInToman === undefined || amountInToman === null || isNaN(Number(amountInToman))) {
    return '۰ تومان';
  }
  const num = Math.round(Number(amountInToman));
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  return `${toPersianDigits(formatted)} تومان`;
}

/**
 * Returns current Jalali (Shamsi) date string e.g. "1404/05/22"
 */
export function getCurrentJalaliDate(): string {
  try {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(today);
    const year = parts.find((p) => p.type === 'year')?.value || '1404';
    const month = parts.find((p) => p.type === 'month')?.value || '05';
    const day = parts.find((p) => p.type === 'day')?.value || '22';
    
    return `${toEnglishDigits(year)}/${toEnglishDigits(month)}/${toEnglishDigits(day)}`;
  } catch {
    return '1404/05/22';
  }
}

export function getJalaliCurrentDate(): string {
  return getCurrentJalaliDate();
}

export function getJalaliCurrentTime(): string {
  try {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '12:00';
  }
}

/**
 * Returns Jalali date string in Persian digits
 */
export function getPersianJalaliDate(jalaliString?: string): string {
  const dateStr = jalaliString || getCurrentJalaliDate();
  return toPersianDigits(dateStr);
}

/**
 * Validates an Iranian mobile number (e.g. 09123456789 or 09351234567)
 */
export function isValidIranianPhone(phone: string): boolean {
  const normalized = toEnglishDigits(phone).replace(/\s+|-|\+98/g, '');
  return /^09\d{9}$/.test(normalized);
}

/**
 * Extract OTP code (4-6 digits) from SMS text using Persian and English Regex
 */
export function extractOtpCodeFromText(text: string): string | null {
  if (!text) return null;
  const engText = toEnglishDigits(text);
  
  // Regex patterns commonly used in Iranian SMS (e.g., "کد ورود: 58204", "رمز یکبار مصرف شما 829103 است")
  const patterns = [
    /(?:کد|رمز|کد ورود|کد فعالسازی|تایید|otp|code)[\s:]*([0-9]{4,6})/i,
    /([0-9]{4,6})[\s:]*(?:کد|رمز|کد ورود|کد فعالسازی|تایید)/i,
    /\b([0-9]{4,6})\b/,
  ];

  for (const pattern of patterns) {
    const match = engText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
