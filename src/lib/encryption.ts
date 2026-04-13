/**
 * Client-safe helpers for encrypted applicant fields (no secret material).
 * Encrypt/decrypt runs only on the server — see `encryption-server.ts` and
 * `src/app/applicant/sensitive-field-actions.ts`.
 */

/** Detect CryptoJS/OpenSSL salted ciphertext prefix (base64 of "Salted__"). */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('U2FsdGVk');
}
