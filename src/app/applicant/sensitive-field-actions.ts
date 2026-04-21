'use server';

import { format } from 'date-fns';
import type { ApplicantData } from '@/lib/types';
import {
  verifyIdToken,
  verifyIsAdmin,
  getAdminFirestore,
} from '@/lib/firebase-admin';
import {
  decryptFieldServer,
  encryptFieldServer,
  isEncryptedValue,
} from '@/lib/encryption-server';

/** Encrypt ATP + medical date on the server (caller sends plaintext over HTTPS). */
export async function encryptApplicantSensitiveFields(input: {
  idToken: string;
  atpNumber: string;
  firstClassMedicalDate: string | null;
}): Promise<{ atpNumber: string; firstClassMedicalDate: string | null }> {
  await verifyIdToken(input.idToken);
  return {
    atpNumber: encryptFieldServer(String(input.atpNumber || '')),
    firstClassMedicalDate: input.firstClassMedicalDate
      ? encryptFieldServer(input.firstClassMedicalDate)
      : null,
  };
}

/** Read the signed-in user's Firestore doc and return decrypted sensitive fields for the application form. */
export async function loadApplicantSensitiveFieldsDecrypted(idToken: string): Promise<{
  atpNumber: number;
  firstClassMedicalDate: Date | null;
}> {
  const decoded = await verifyIdToken(idToken);
  const snap = await getAdminFirestore().collection('users').doc(decoded.uid).get();
  const data = snap.data() as ApplicantData | undefined;
  if (!data) {
    return { atpNumber: 0, firstClassMedicalDate: null };
  }

  let atp = 0;
  const rawAtp = data.atpNumber;
  if (rawAtp != null && rawAtp !== '') {
    const str = String(rawAtp);
    if (isEncryptedValue(str)) {
      const decrypted = decryptFieldServer(str);
      atp = Number(decrypted) || 0;
    } else {
      atp = Number(rawAtp) || 0;
    }
  }

  let med: Date | null = null;
  const medRaw = data.firstClassMedicalDate;
  if (medRaw) {
    if (typeof medRaw === 'string' && isEncryptedValue(medRaw)) {
      const d = decryptFieldServer(medRaw);
      med = d ? new Date(d) : null;
    } else if (typeof medRaw === 'object' && medRaw !== null && 'toDate' in medRaw) {
      try {
        med = (medRaw as { toDate: () => Date }).toDate();
      } catch {
        med = null;
      }
    } else if (typeof medRaw === 'string') {
      med = new Date(medRaw);
    }
  }

  return { atpNumber: atp, firstClassMedicalDate: med };
}

export async function adminDecryptAtpBatchForExport(
  idToken: string,
  atpValues: (string | number | null | undefined)[]
): Promise<string[]> {
  await verifyIsAdmin(idToken);
  return atpValues.map((atpRaw) => {
    if (atpRaw == null || atpRaw === '') return '';
    const s = String(atpRaw);
    return isEncryptedValue(s) ? decryptFieldServer(s) : s;
  });
}

/**
 * Admin-gated batch decryption of first-class medical dates for CSV export.
 * Accepts the raw Firestore value (encrypted string, Timestamp, or plain
 * string) and returns a uniform `yyyy-MM-dd` string for every entry
 * (or `""` when absent/unparseable). Must be called from a trusted
 * admin flow; the caller passes the full column and receives a column
 * back in the same order.
 */
export async function adminDecryptMedicalDateBatchForExport(
  idToken: string,
  medValues: ApplicantData['firstClassMedicalDate'][]
): Promise<string[]> {
  await verifyIsAdmin(idToken);
  return medValues.map((medRaw) => {
    if (!medRaw) return '';
    let iso: string | null = null;
    try {
      if (typeof medRaw === 'string') {
        const plain = isEncryptedValue(medRaw) ? decryptFieldServer(medRaw) : medRaw;
        if (!plain) return '';
        const d = new Date(plain);
        if (!isNaN(d.getTime())) iso = format(d, 'yyyy-MM-dd');
      } else if (typeof medRaw === 'object' && 'toDate' in medRaw) {
        iso = format((medRaw as { toDate: () => Date }).toDate(), 'yyyy-MM-dd');
      }
    } catch {
      iso = null;
    }
    return iso ?? '';
  });
}

export async function adminDecryptReviewDisplayFields(
  idToken: string,
  atpRaw: string | null | undefined,
  medRaw: ApplicantData['firstClassMedicalDate']
): Promise<{ atpLabel: string; medDisplay: string }> {
  await verifyIsAdmin(idToken);

  let atpLabel = '—';
  if (atpRaw != null && atpRaw !== '') {
    const s = String(atpRaw);
    atpLabel = isEncryptedValue(s) ? decryptFieldServer(s) : s;
  }

  let medDisplay = '—';
  if (medRaw) {
    if (typeof medRaw === 'string' && isEncryptedValue(medRaw)) {
      const d = decryptFieldServer(medRaw);
      try {
        medDisplay = format(new Date(d), 'PP');
      } catch {
        medDisplay = d;
      }
    } else if (typeof medRaw === 'object' && medRaw !== null && 'toDate' in medRaw) {
      try {
        medDisplay = format((medRaw as { toDate: () => Date }).toDate(), 'PP');
      } catch {
        medDisplay = '—';
      }
    }
  }

  return { atpLabel, medDisplay };
}
