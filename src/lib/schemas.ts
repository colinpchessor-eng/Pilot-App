import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    firstName: z.string().min(1, { message: 'First name is required.' }),
    lastName: z.string().min(1, { message: 'Last name is required.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type SignupSchema = z.infer<typeof signupSchema>;

export const employmentHistorySchema = z
  .object({
    employerName: z.string().min(1, 'Employer name is required.'),
    jobTitle: z.string().min(1, 'Job title is required.'),
    startDate: z.date({ required_error: 'Start date is required.' }),
    endDate: z.date().nullable(),
    isCurrent: z.boolean().default(false),
    aircraftTypes: z.string().min(1, 'Aircraft types are required.'),
    totalHours: z.coerce
      .number({ invalid_type_error: 'Must be a number.' })
      .min(1, 'Hours are required.'),
    duties: z.string().min(1, 'Duties are required.'),
  })
  .superRefine((data, ctx) => {
    if (!data.isCurrent && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date is required if this is not a current employer.',
        path: ['endDate'],
      });
    }
    if (
      !data.isCurrent &&
      data.endDate &&
      data.startDate &&
      data.startDate > data.endDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date.',
        path: ['endDate'],
      });
    }
  });

const safetyQuestionItemSchema = z
  .object({
    answer: z.enum(['yes', 'no']).nullable(),
    explanation: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.answer === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'You must select an answer.',
        path: ['answer'],
      });
    }
    if (data.answer === 'yes' && (!data.explanation || data.explanation.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Explanation is required for a "Yes" answer.',
        path: ['explanation'],
      });
    }
  });

export const applicationFormSchema = z
  .object({
    flightTime: z.object({
      total: z.coerce.number().min(0, 'Cannot be negative.').optional(),
      turbinePic: z.coerce.number().min(0, 'Cannot be negative.').optional(),
      military: z.coerce.number().min(0, 'Cannot be negative.').optional(),
      civilian: z.coerce.number().min(0, 'Cannot be negative.').optional(),
      multiEngine: z.coerce.number().min(0, 'Cannot be negative.').optional(),
      instructor: z.coerce.number().min(0, 'Cannot be negative.').optional(),
      evaluator: z.coerce.number().min(0, 'Cannot be negative.').optional(),
      sic: z.coerce.number().min(0, 'Cannot be negative.').optional(),
      other: z.coerce.number().min(0, 'Cannot be negative.').optional(),
    }),
    firstClassMedicalDate: z
      .date({
        required_error: 'First class medical date is required.',
      })
      .nullable(),
    atpNumber: z.string().min(1, 'ATP Number is required.'),
    typeRatings: z
      .string()
      .min(1, 'At least one rating or certificate is required.'),
    employmentHistory: z.array(employmentHistorySchema).optional(),
    safetyQuestions: z.object({
      terminations: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      askedToResign: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      accidents: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      incidents: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      flightViolations: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      certificateAction: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      pendingFaaAction: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      failedCheckRide: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      formalDiscipline: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      investigationBoard: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      previousInterview: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      trainingCommitmentConflict: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
      otherInfo: safetyQuestionItemSchema.superRefine((data, ctx) => { if (data.answer === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must select an answer.', path: ['answer'], }); } }),
    }),
    isCertified: z.literal(true, {
      errorMap: () => ({
        message: 'You must certify your application to submit.',
      }),
    }),
    printedName: z.string().min(1, 'You must enter your name to certify.'),
  })
  .superRefine((data, ctx) => {
    if (!data.firstClassMedicalDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'First class medical date is required.',
        path: ['firstClassMedicalDate'],
      });
    }
  });

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;
