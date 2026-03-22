import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

export function encryptField(value: string): string {
  if (!value || !ENCRYPTION_KEY) return value;
  return CryptoJS.AES.encrypt(
    value,
    ENCRYPTION_KEY
  ).toString();
}

export function decryptField(
  encryptedValue: string
): string {
  if (!encryptedValue || !ENCRYPTION_KEY)
    return encryptedValue;
  try {
    const bytes = CryptoJS.AES.decrypt(
      encryptedValue,
      ENCRYPTION_KEY
    );
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedValue;
  } catch {
    return encryptedValue;
  }
}

export function isEncrypted(value: string): boolean {
  return value?.startsWith('U2FsdGVk') || false;
}
