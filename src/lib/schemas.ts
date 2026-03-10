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

export const applicationFormSchema = z.object({
  flightTime: z.object({
    total: z.coerce
      .number({ invalid_type_error: 'Must be a number.' })
      .min(1, 'Total flight hours are required.'),
    multiCrew: z.coerce
      .number({ invalid_type_error: 'Must be a number.' })
      .min(
        500,
        'A minimum of 500 hours of Civilian Multi-Crew flight time is required.'
      ),
    pic: z.coerce
      .number({ invalid_type_error: 'Must be a number.' })
      .min(1, 'PIC hours are required.'),
  }),
  typeRatings: z
    .array(z.object({ value: z.string().min(1, 'Type rating cannot be empty.') }))
    .min(1, 'At least one type rating is required.'),
  safetyQuestions: z.object({
    incidents: z.enum(['yes', 'no'], {
      required_error: 'You must select an answer.',
    }),
    accidents: z.enum(['yes', 'no'], {
      required_error: 'You must select an answer.',
    }),
    faaAction: z.enum(['yes', 'no'], {
      required_error: 'You must select an answer.',
    }),
  }),
  resumeFileName: z
    .string({ required_error: 'Resume is required for submission.' })
    .min(1, 'Resume is required for submission.'),
  trainingCommitment: z.literal(true, {
    errorMap: () => ({
      message: 'You must agree to the training commitment to submit.',
    }),
  }),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;
