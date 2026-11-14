import { z } from 'zod';
import { normalizePhone } from '../../utils/format.js';

const optStr = (max = 120) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v));

/** a list of short typed / picked answers (languages, hobbies, interests) */
const tagList = z
  .array(z.string().trim().min(1).max(40))
  .max(25)
  .optional()
  .transform((v) => (v ? [...new Set(v)] : v));

const optInt = (min, max) =>
  z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable().optional());

export const RELATIONS = ['FATHER', 'MOTHER', 'ELDER_BROTHER', 'ELDER_SISTER', 'BROTHER', 'SISTER', 'UNCLE', 'AUNT', 'GRANDFATHER', 'GRANDMOTHER', 'GUARDIAN', 'OTHER'];

/** A family member to call about this profile. */
export const familyContactSchema = z
  .object({
    relation: z.enum(RELATIONS),
    relationLabel: optStr(40),
    name: z.string().trim().min(2, 'Enter their name').max(80),
    phone: z
      .string()
      .transform((v) => normalizePhone(v))
      .refine(Boolean, 'Enter a valid 10-digit mobile number'),
    whatsapp: z
      .string()
      .transform((v) => (v ? normalizePhone(v) : null))
      .optional()
      .nullable(),
    bestTime: optStr(60),
    languages: optStr(60),
    isPrimary: z.boolean().optional(),
  })
  .refine((c) => c.relation !== 'OTHER' || c.relationLabel, { message: 'Tell us how they are related', path: ['relationLabel'] });

export const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Please enter your full name').max(80),
    // contact mobile (members log in by email, so the number is entered here; saved on the account)
    phone: z
      .string()
      .trim()
      .regex(/^(\+?91[\s-]?)?[6-9]\d{4}\s?\d{5}$/, 'Enter a valid 10-digit mobile number')
      .optional()
      .nullable()
      .or(z.literal('').transform(() => null)),
    email: z.union([z.literal('').transform(() => null), z.string().trim().toLowerCase().email('Enter a valid email address').max(120)]).optional().nullable(),
    // date of birth, gender, education & occupation: required only for matrimony (see requireMatrimonyFields)
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
      .refine((v) => {
        const age = (Date.now() - new Date(v).getTime()) / (365.25 * 86400_000);
        return age >= 18 && age <= 100;
      }, 'You must be at least 18 years old')
      .optional()
      .nullable()
      .or(z.literal('').transform(() => null)),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
    maritalStatus: z.enum(['NEVER_MARRIED', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional(),
    heightCm: optInt(120, 230),
    bio: optStr(600),

    // personal
    createdBy: optStr(40),
    weightKg: optInt(30, 250),
    bloodGroup: optStr(20),
    motherTongue: optStr(40),
    languages: tagList,
    // religion & community
    religion: optStr(40),
    community: optStr(60),
    devak: optStr(60),
    kuldaivat: optStr(60),
    // location
    currentDistrict: optStr(60),
    nativeDistrict: optStr(60),
    nativeState: optStr(60),
    // physical
    bodyType: optStr(40),
    physicalStatus: optStr(60),
    physicalDetails: optStr(500),

    currentCity: z.string().trim().min(2, 'City is required').max(80),
    currentState: z.string().trim().min(2, 'State is required').max(80),
    currentCountry: z.string().trim().max(80).optional(),
    nativeVillage: optStr(80),

    education: optStr(120),
    // every degree the member has; `education` (the summary used by search) is built from these
    degrees: z
      .array(
        z.object({
          degree: z.string().trim().min(1, 'Enter the degree').max(80),
          specialization: optStr(80),
          institute: optStr(120),
          year: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(1950).max(2100).nullable().optional()),
        }),
      )
      .max(10, 'You can add up to 10 degrees')
      .optional(),
    highestQualification: optStr(80),
    workDetails: optStr(1000),
    occupation: optStr(120),
    annualIncome: optStr(40),
    // professional
    employmentType: optStr(60),
    jobDesignation: optStr(80),
    companyName: optStr(100),
    workingCity: optStr(80),
    experienceYears: optInt(0, 60),
    businessName: optStr(100),
    businessType: optStr(80),
    businessYears: optInt(0, 60),

    isMatrimonial: z.boolean().optional(),
    gotra: optStr(60),
    subCaste: optStr(60),
    fatherName: optStr(80),
    fatherOccupation: optStr(80),
    motherName: optStr(80),
    motherOccupation: optStr(80),
    siblingsCount: optInt(0, 20),
    brothers: optInt(0, 15),
    marriedBrothers: optInt(0, 15),
    sisters: optInt(0, 15),
    marriedSisters: optInt(0, 15),
    familyType: z.enum(['NUCLEAR', 'JOINT']).optional().nullable(),
    familyValues: optStr(60),
    aboutFamily: optStr(600),

    // lifestyle
    diet: optStr(40),
    drinking: optStr(40),
    smoking: optStr(40),
    hobbies: tagList,
    interests: tagList,

    // about me
    careerGoals: optStr(600),
    marriageExpectations: optStr(600),

    timeOfBirth: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm')
      .optional()
      .nullable()
      .or(z.literal('').transform(() => null)),
    placeOfBirth: optStr(80),

    prefAgeMin: optInt(18, 80),
    prefAgeMax: optInt(18, 80),
    prefEducation: optStr(80),
    prefLocation: optStr(80),
    prefOccupation: optStr(120),
    prefName: optStr(80),

    accountType: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    showPhone: z.boolean().optional(),
    familyContacts: z.array(familyContactSchema).max(4, 'You can add up to 4 family contacts').optional(),
  })
  .refine((d) => !d.prefAgeMin || !d.prefAgeMax || d.prefAgeMin <= d.prefAgeMax, {
    message: 'Minimum age must be less than maximum age',
    path: ['prefAgeMax'],
  });

export const updateProfileSchema = profileSchema.innerType().partial();

export const settingsSchema = z.object({
  accountType: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  showPhone: z.boolean().optional(),
  isMatrimonial: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const intentsSchema = z.object({
  intents: z.array(z.enum(['MATRIMONY', 'COMMUNITY', 'BUSINESS', 'SERVICES'])).max(4),
});

/** Fields a matrimony profile must have (community-only members don't). */
export const MATRIMONY_REQUIRED = [
  ['dateOfBirth', 'date of birth'],
  ['gender', 'gender'],
  ['education', 'education'],
  ['occupation', 'occupation'],
];
// Everything else on the matrimony form (mother tongue, district, employment type, contact person ...) is checked in the form,
// not here, so profiles created before these questions existed can still be edited.
