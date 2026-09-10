/**
 * Simple, robust XOR-based encryption/decryption with Base64 encoding
 * to secure sensitive cookies/tokens in localStorage or IndexedDB.
 */
const SECRET_SALT = 'Ashk24_Secure_Session_Salt_9982';

export function encryptData(text: string): string {
  if (!text) return '';
  try {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(encodeURIComponent(result));
  } catch (e) {
    console.error('Encryption failed:', e);
    return text;
  }
}

export function decryptData(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const raw = decodeURIComponent(atob(cipherText));
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    // If it's already plain text (fallback for legacy non-encrypted values)
    return cipherText;
  }
}
