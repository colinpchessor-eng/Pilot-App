'use server';

import ExcelJS from 'exceljs';
import { getAdminFirestore, verifyIsAdmin } from '@/lib/firebase-admin';
import { adminDecryptAtpBatchForExport, adminDecryptMedicalDateBatchForExport } from '@/app/applicant/sensitive-field-actions';
import type { ApplicantData } from '@/lib/types';
import { format } from 'date-fns';

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F3864' },
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
    };
  });
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 10 ? 10 : maxLength + 2;
  });
}

function applyAlternatingRows(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEBF0FA' },
        };
      });
    }
  });
}

function formatDate(dateObj: any): string {
  if (!dateObj) return '';
  if (typeof dateObj === 'string') return dateObj; // string already
  if (dateObj.toDate && typeof dateObj.toDate === 'function') {
    try {
      return format(dateObj.toDate(), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }
  return '';
}

function formatDateTime(dateObj: any): string {
  if (!dateObj) return '';
  if (dateObj.toDate && typeof dateObj.toDate === 'function') {
    try {
      return format(dateObj.toDate(), "yyyy-MM-dd'T'HH:mm:ssXXX");
    } catch {
      return '';
    }
  }
  return '';
}

export async function generateParadoxExcelBase64(idToken: string, candidateUid: string): Promise<string> {
  await verifyIsAdmin(idToken);
  const db = getAdminFirestore();

  const userDoc = await db.collection('users').doc(candidateUid).get();
  if (!userDoc.exists) {
    throw new Error('Candidate not found.');
  }

  const applicant = userDoc.data() as ApplicantData;
  const candidateId = applicant.candidateId || '';

  // Decrypt sensitive fields using the admin batch function
  const [atpCol] = await adminDecryptAtpBatchForExport(idToken, [applicant.atpNumber]);
  const [medCol] = await adminDecryptMedicalDateBatchForExport(idToken, [applicant.firstClassMedicalDate]);

  const workbook = new ExcelJS.Workbook();

  // 1. Candidate Sheet
  const sheet1 = workbook.addWorksheet('Candidate', { properties: { tabColor: { argb: 'FF2E75B6' } } });
  sheet1.columns = [
    { header: 'candidate_id', key: 'candidate_id' },
    { header: 'uid', key: 'uid' },
    { header: 'email', key: 'email' },
    { header: 'first_name', key: 'first_name' },
    { header: 'last_name', key: 'last_name' },
    { header: 'submitted_at', key: 'submitted_at' },
    { header: 'is_certified', key: 'is_certified' },
    { header: 'printed_name', key: 'printed_name' },
    { header: 'atp_number', key: 'atp_number' },
    { header: 'first_class_medical_date', key: 'first_class_medical_date' },
    { header: 'type_ratings', key: 'type_ratings' },
    { header: 'flight_hours_total', key: 'flight_hours_total' },
    { header: 'flight_hours_turbine_pic', key: 'flight_hours_turbine_pic' },
    { header: 'flight_hours_military', key: 'flight_hours_military' },
    { header: 'flight_hours_civilian', key: 'flight_hours_civilian' },
    { header: 'flight_hours_multi_engine', key: 'flight_hours_multi_engine' },
    { header: 'flight_hours_instructor', key: 'flight_hours_instructor' },
    { header: 'flight_hours_evaluator', key: 'flight_hours_evaluator' },
    { header: 'flight_hours_sic', key: 'flight_hours_sic' },
    { header: 'flight_hours_other', key: 'flight_hours_other' },
    { header: 'flight_hours_night', key: 'flight_hours_night' },
    { header: 'last_aircraft_flown', key: 'last_aircraft_flown' },
    { header: 'date_last_flown', key: 'date_last_flown' },
    { header: 'consent_given', key: 'consent_given' },
    { header: 'consent_timestamp', key: 'consent_timestamp' },
    { header: 'consent_version', key: 'consent_version' },
  ];

  sheet1.addRow({
    candidate_id: candidateId,
    uid: applicant.uid,
    email: applicant.email || '',
    first_name: applicant.firstName || '',
    last_name: applicant.lastName || '',
    submitted_at: formatDateTime(applicant.submittedAt),
    is_certified: applicant.isCertified ? 'true' : 'false',
    printed_name: applicant.printedName || '',
    atp_number: atpCol || '',
    first_class_medical_date: medCol || '',
    type_ratings: applicant.typeRatings || '',
    flight_hours_total: applicant.flightTime?.total || 0,
    flight_hours_turbine_pic: applicant.flightTime?.turbinePic || 0,
    flight_hours_military: applicant.flightTime?.military || 0,
    flight_hours_civilian: applicant.flightTime?.civilian || 0,
    flight_hours_multi_engine: applicant.flightTime?.multiEngine || 0,
    flight_hours_instructor: applicant.flightTime?.instructor || 0,
    flight_hours_evaluator: applicant.flightTime?.evaluator || 0,
    flight_hours_sic: applicant.flightTime?.sic || 0,
    flight_hours_other: applicant.flightTime?.other || 0,
    flight_hours_night: applicant.flightTime?.nightHours || 0,
    last_aircraft_flown: applicant.flightTime?.lastAircraftFlown || '',
    date_last_flown: applicant.flightTime?.dateLastFlown ? applicant.flightTime.dateLastFlown : '',
    consent_given: applicant.consentGiven ? 'true' : 'false',
    consent_timestamp: formatDateTime(applicant.consentTimestamp),
    consent_version: applicant.consentVersion || '',
  });

  styleHeaderRow(sheet1);
  autoFitColumns(sheet1);
  applyAlternatingRows(sheet1);

  // 2. Employment_History Sheet
  const sheet2 = workbook.addWorksheet('Employment_History', { properties: { tabColor: { argb: 'FF375623' } } });
  sheet2.columns = [
    { header: 'candidate_id', key: 'candidate_id' },
    { header: 'employer_seq', key: 'employer_seq' },
    { header: 'employer_name', key: 'employer_name' },
    { header: 'title', key: 'title' },
    { header: 'street', key: 'street' },
    { header: 'city', key: 'city' },
    { header: 'state', key: 'state' },
    { header: 'zip', key: 'zip' },
    { header: 'start_date', key: 'start_date' },
    { header: 'end_date', key: 'end_date' },
    { header: 'is_current', key: 'is_current' },
    { header: 'aircraft_types', key: 'aircraft_types' },
    { header: 'total_hours', key: 'total_hours' },
    { header: 'duties', key: 'duties' },
  ];

  (applicant.employmentHistory || []).forEach((emp, idx) => {
    sheet2.addRow({
      candidate_id: candidateId,
      employer_seq: idx + 1,
      employer_name: emp.employerName || '',
      title: emp.jobTitle || '',
      street: emp.street || '',
      city: emp.city || '',
      state: emp.state || '',
      zip: emp.zip || '',
      start_date: formatDate(emp.startDate),
      end_date: formatDate(emp.endDate),
      is_current: emp.endDate === null ? 'true' : 'false',
      aircraft_types: emp.aircraftTypes || '',
      total_hours: emp.totalHours || 0,
      duties: emp.duties || '',
    });
  });

  styleHeaderRow(sheet2);
  autoFitColumns(sheet2);
  applyAlternatingRows(sheet2);

  // 3. Residence_History Sheet
  const sheet3 = workbook.addWorksheet('Residence_History', { properties: { tabColor: { argb: 'FF7B2C2C' } } });
  sheet3.columns = [
    { header: 'candidate_id', key: 'candidate_id' },
    { header: 'residence_seq', key: 'residence_seq' },
    { header: 'street', key: 'street' },
    { header: 'city', key: 'city' },
    { header: 'state', key: 'state' },
    { header: 'zip', key: 'zip' },
    { header: 'start_date', key: 'start_date' },
    { header: 'end_date', key: 'end_date' },
    { header: 'is_current', key: 'is_current' },
  ];

  (applicant.residentialHistory || []).forEach((res, idx) => {
    sheet3.addRow({
      candidate_id: candidateId,
      residence_seq: idx + 1,
      street: res.street || '',
      city: res.city || '',
      state: res.state || '',
      zip: res.zip || '',
      start_date: formatDate(res.startDate),
      end_date: formatDate(res.endDate),
      is_current: res.isCurrent ? 'true' : (res.endDate === null ? 'true' : 'false'),
    });
  });

  styleHeaderRow(sheet3);
  autoFitColumns(sheet3);
  applyAlternatingRows(sheet3);

  // 4. Safety_Disclosures Sheet
  const sheet4 = workbook.addWorksheet('Safety_Disclosures', { properties: { tabColor: { argb: 'FF7030A0' } } });
  sheet4.columns = [
    { header: 'candidate_id', key: 'candidate_id' },
    { header: 'question_key', key: 'question_key' },
    { header: 'question_label', key: 'question_label' },
    { header: 'answer', key: 'answer' },
    { header: 'explanation', key: 'explanation' },
  ];

  const SAFETY_ORDER = [
    'terminations',
    'askedToResign',
    'formalDiscipline',
    'accidents',
    'incidents',
    'flightViolations',
    'certificateAction',
    'pendingFaaAction',
    'failedCheckRide',
    'investigationBoard',
    'previousInterview',
    'trainingCommitmentConflict',
    'otherInfo',
  ] as const;

  const SAFETY_LABELS: Record<string, string> = {
    terminations: 'Terminations or resignations in lieu of from any FAA covered positions?',
    askedToResign: 'Asked to resign from any FAA covered position?',
    formalDiscipline: 'Have you ever received formal discipline from your employer?',
    accidents: 'Aircraft accidents?',
    incidents: 'Aircraft Incidents?',
    flightViolations: 'Flight violations?',
    certificateAction: 'Certificate suspension/revocation?',
    pendingFaaAction: 'Pending FAA Action/Letters of investigation?',
    failedCheckRide: 'Have you ever failed a flight check ride, proficiency check, flight eval, or upgrade attempt aircraft or while compensated as a professional pilot (in the last three years)?',
    investigationBoard: 'Have you ever been called before a field board of investigation for any reason?',
    previousInterview: 'Have you previously interviewed for the following positions at Fedex (not counting the one that you were hired under)?',
    trainingCommitmentConflict: 'Do you have any commitment that will not allow you to enter and complete uninterrupted a training syllabus of approximately 10 weeks once commenced?',
    otherInfo: 'Is there anything else you feel warrants and that you would like to bring up at this time?',
  };

  const sq = applicant.safetyQuestions;
  if (sq) {
    SAFETY_ORDER.forEach((key) => {
      const q = sq[key as keyof typeof sq];
      if (q) {
        sheet4.addRow({
          candidate_id: candidateId,
          question_key: key,
          question_label: SAFETY_LABELS[key] || key,
          answer: q.answer || '',
          explanation: q.explanation || '',
        });
      }
    });
  }

  styleHeaderRow(sheet4);
  autoFitColumns(sheet4);
  applyAlternatingRows(sheet4);

  const buffer = await workbook.xlsx.writeBuffer();
  // Buffer is an ArrayBuffer/Buffer depending on environment, cast to Buffer to get string
  return Buffer.from(buffer).toString('base64');
}
