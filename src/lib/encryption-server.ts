import 'server-only';

import CryptoJS from 'crypto-js';
import { isEncrypted } from '@/lib/encryption';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

export function encryptFieldServer(value: string): string {
  if (!value || !ENCRYPTION_KEY) return value;
  return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
}

export function decryptFieldServer(encryptedValue: string): string {
  if (!encryptedValue || !ENCRYPTION_KEY) return encryptedValue;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedValue;
  } catch {
    return encryptedValue;
  }
}

/** Server-side check with same semantics as client `isEncrypted`. */
export function isEncryptedValue(value: string | null | undefined): boolean {
  return isEncrypted(value);
}
