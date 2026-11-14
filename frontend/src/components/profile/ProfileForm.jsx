import { z } from 'zod';
import { formatPhone } from '../../lib/utils';
import { Field, Icon, Segment } from '../ui';
import { DegreesField, emptyDegree } from './DegreesField';
import { FamilyContactsSection } from './FamilyContactsSection';
import {
  BLOOD_GROUPS, BODY_TYPES, BUSINESS_TYPES, COMMUNITIES, CREATED_BY, DIETS, DISTRICTS, employmentGroups, EMPLOYMENT_TYPES, FAMILY_VALUES, FIT, HABITS, HOBBIES, INCOMES, INTERESTS, LANGUAGES,
  MOTHER_TONGUES, OCCUPATIONS, PARENT_OCCUPATIONS, PHYSICAL_STATUS, QUALIFICATIONS, RELIGIONS, STATES,
} from './formData';
import { ChipsInput, GroupTitle, HeightSelect, MoreFields, SelectOther } from './formBits';

const opt = z.string().trim().optional().or(z.literal(''));
// '' must be checked first: z.coerce.number() turns an empty box into 0, which the API rejects (e.g. age 0 < 18)
const optNum = z.union([z.literal(''), z.coerce.number()]).optional();
const list = z.array(z.string()).optional();

export const RELATIONS = [
  ['FATHER', 'Father', 'वडील'],
  ['MOTHER', 'Mother', 'आई'],
  ['ELDER_BROTHER', 'Elder brother', 'मोठा भाऊ'],
  ['ELDER_SISTER', 'Elder sister', 'मोठी बहीण'],
  ['BROTHER', 'Brother', 'भाऊ'],
  ['SISTER', 'Sister', 'बहीण'],
  ['UNCLE', 'Uncle', 'काका / मामा'],
  ['AUNT', 'Aunt', 'काकू / मावशी'],
  ['GRANDFATHER', 'Grandfather', 'आजोबा'],
  ['GRANDMOTHER', 'Grandmother', 'आजी'],
  ['GUARDIAN', 'Guardian', 'पालक'],
  ['OTHER', 'Other relative', 'इतर'],
];
export const relationLabel = (c) => (c.relation === 'OTHER' && c.relationLabel) || RELATIONS.find((r) => r[0] === c.relation)?.[1] || c.relation;
export const relationMr = (c) => (c.relation === 'OTHER' ? '' : RELATIONS.find((r) => r[0] === c.relation)?.[2] || '');

const tenDigits = (v) => String(v || '').replace(/\D/g, '').slice(-10);
const isMobile = (v) => /^[6-9]\d{9}$/.test(String(v || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''));

const contactSchema = z
  .object({
    relation: z.enum(RELATIONS.map((r) => r[0])),
    relationLabel: opt,
    name: z.string().trim().min(2, 'Enter their name'),
    phone: z.string().refine(isMobile, 'Enter a valid 10-digit mobile number'),
    whatsapp: z.string().refine((v) => !v || isMobile(v), 'Enter a valid 10-digit number').optional(),
    bestTime: opt,
    languages: opt,
    isPrimary: z.boolean().optional(),
  })
  .refine((c) => c.relation !== 'OTHER' || c.relationLabel?.trim(), { message: 'How are they related?', path: ['relationLabel'] });

const isPhone = (v) => /^(\+?91[\s-]?)?[6-9]\d{4}\s?\d{5}$/.test(String(v || '').trim());
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

/**
 * Profile form rules. For matrimony a few more answers are needed (they are marked *);
 * community / business / services members just need name, city and state.
 * `requireEmail` is on at sign-up (older profiles may not have an email yet).
 */
export const makeProfileSchema = ({ requireEmail = false, requirePhone = false } = {}) =>
  z
    .object({
      fullName: z.string().trim().min(2, 'Please enter your full name'),
      email: requireEmail ? z.string().trim().min(1, 'Email is required').refine(isEmail, 'Enter a valid email address') : z.string().trim().refine((v) => !v || isEmail(v), 'Enter a valid email address').optional(),
      phone: requirePhone
        ? z.string().trim().min(1, 'Mobile number is required').refine(isPhone, 'Enter a valid 10-digit mobile number')
        : z.string().trim().refine((v) => !v || isPhone(v), 'Enter a valid 10-digit mobile number').optional(),
      dateOfBirth: opt,
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().or(z.literal('')),
      maritalStatus: z.enum(['NEVER_MARRIED', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional(),
      heightCm: optNum,
      bio: opt,
      // personal
      createdBy: opt,
      weightKg: optNum,
      bloodGroup: opt,
      motherTongue: opt,
      languages: list,
      // community
      religion: opt,
      community: opt,
      subCaste: opt,
      gotra: opt,
      devak: opt,
      kuldaivat: opt,
      // location
      currentCity: z.string().trim().min(2, 'City is required'),
      currentDistrict: opt,
      currentState: z.string().trim().min(2, 'State is required'),
      nativeVillage: opt,
      nativeDistrict: opt,
      nativeState: opt,
      // physical
      bodyType: opt,
      physicalStatus: opt,
      physicalDetails: z.string().trim().max(500, 'Keep it under 500 characters').optional().or(z.literal('')),
      // education
      highestQualification: opt,
      degrees: z
        .array(
          z.object({
            degree: z.string().trim().max(80, 'Keep it under 80 characters'),
            specialization: opt,
            institute: opt,
            year: z.union([z.literal(''), z.coerce.number().int().min(1950, 'Check the year').max(2100, 'Check the year')]).optional(),
          }),
        )
        .optional(),
      // professional
      employmentType: opt,
      occupation: opt,
      jobDesignation: opt,
      companyName: opt,
      workingCity: opt,
      experienceYears: optNum,
      businessName: opt,
      businessType: opt,
      businessYears: optNum,
      annualIncome: opt,
      workDetails: z.string().trim().max(1000, 'Keep it under 1000 characters').optional().or(z.literal('')),
      isMatrimonial: z.boolean().optional(),
      // family
      fatherName: opt,
      fatherOccupation: opt,
      motherName: opt,
      motherOccupation: opt,
      siblingsCount: optNum,
      brothers: optNum,
      marriedBrothers: optNum,
      sisters: optNum,
      marriedSisters: optNum,
      familyType: z.enum(['NUCLEAR', 'JOINT', '']).optional(),
      familyValues: opt,
      aboutFamily: z.string().trim().max(600, 'Keep it under 600 characters').optional().or(z.literal('')),
      // lifestyle & about
      diet: opt,
      drinking: opt,
      smoking: opt,
      hobbies: list,
      interests: list,
      careerGoals: z.string().trim().max(600, 'Keep it under 600 characters').optional().or(z.literal('')),
      marriageExpectations: z.string().trim().max(600, 'Keep it under 600 characters').optional().or(z.literal('')),
      // kundli & partner
      timeOfBirth: opt,
      placeOfBirth: opt,
      prefAgeMin: optNum,
      prefAgeMax: optNum,
      prefEducation: opt,
      prefLocation: opt,
      prefOccupation: opt,
      prefName: opt,
      accountType: z.enum(['PUBLIC', 'PRIVATE']).optional(),
      familyContacts: z.array(contactSchema).max(4).optional(),
    })
    .superRefine((d, ctx) => {
      if (d.prefAgeMin && d.prefAgeMax && Number(d.prefAgeMin) > Number(d.prefAgeMax)) ctx.addIssue({ code: 'custom', path: ['prefAgeMax'], message: 'Min age must be below max age' });
      if (!d.isMatrimonial) return;
      // matrimony-only requirements
      const need = (field, message) => {
        const v = d[field];
        if (v === '' || v == null) ctx.addIssue({ code: 'custom', path: [field], message });
      };
      if (!d.dateOfBirth) ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'Date of birth is required for matrimony' });
      else if ((Date.now() - new Date(d.dateOfBirth).getTime()) / (365.25 * 864e5) < 18) ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'You must be at least 18 years old' });
      if (!d.gender) ctx.addIssue({ code: 'custom', path: ['gender'], message: 'Please choose' });
      need('heightCm', 'Choose your height');
      need('motherTongue', 'Choose or type your mother tongue');
      need('religion', 'Choose or type your religion');
      need('community', 'Choose or type your community');
      need('currentDistrict', 'Choose or type your district');
      need('highestQualification', 'Choose your highest qualification');
      need('employmentType', 'Choose what you do');
      if (!d.occupation || d.occupation.trim().length < 2) ctx.addIssue({ code: 'custom', path: ['occupation'], message: 'Occupation is required for matrimony' });
      need('timeOfBirth', 'Birth time is needed for the Kundali (ask your parents)');
      need('placeOfBirth', 'Birth place is needed for the Kundali');
      if (!(d.familyContacts || []).length) ctx.addIssue({ code: 'custom', path: ['familyContacts'], message: 'Add one contact person (name and mobile number)' });
    });

export const profileFormSchema = makeProfileSchema();

const NUMBERS = ['heightCm', 'weightKg', 'experienceYears', 'businessYears', 'siblingsCount', 'brothers', 'marriedBrothers', 'sisters', 'marriedSisters', 'prefAgeMin', 'prefAgeMax'];

/** Strip empty strings → null so the API stores clean values. */
export function cleanProfile(values) {
  const out = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === '' || v === undefined) out[k] = null;
    else out[k] = v;
  }
  if (out.phone == null) delete out.phone; // never clear the saved number by leaving the field out
  if (!out.familyType) delete out.familyType;
  if (out.familyType === null) out.familyType = null;
  NUMBERS.forEach((k) => {
    if (out[k] != null) out[k] = Number(out[k]);
  });
  ['languages', 'hobbies', 'interests'].forEach((k) => {
    if (Array.isArray(values[k])) out[k] = values[k].map((x) => String(x).trim()).filter(Boolean);
  });
  if (Array.isArray(values.degrees)) {
    out.degrees = values.degrees
      .filter((d) => d.degree?.trim())
      .map((d) => ({ degree: d.degree.trim(), specialization: d.specialization?.trim() || null, institute: d.institute?.trim() || null, year: d.year === '' || d.year == null ? null : Number(d.year) }));
    delete out.education; // the server builds the summary from the degrees
  }
  if (Array.isArray(values.familyContacts)) {
    out.familyContacts = values.familyContacts.map((c) => ({
      relation: c.relation,
      relationLabel: c.relation === 'OTHER' ? c.relationLabel?.trim() || null : null,
      name: c.name.trim(),
      phone: tenDigits(c.phone),
      whatsapp: tenDigits(c.whatsapp) || null,
      bestTime: c.bestTime || null,
      languages: c.languages?.trim() || null,
      isPrimary: !!c.isPrimary,
    }));
  }
  return out;
}

export function profileDefaults(p = {}) {
  const text = (k, fallback = '') => p[k] || fallback;
  const num = (k) => p[k] ?? '';
  return {
    fullName: text('fullName'),
    email: text('email'),
    dateOfBirth: text('dateOfBirth'),
    gender: p.gender || undefined,
    maritalStatus: p.maritalStatus || 'NEVER_MARRIED',
    heightCm: num('heightCm'),
    bio: text('bio'),
    createdBy: text('createdBy'),
    weightKg: num('weightKg'),
    bloodGroup: text('bloodGroup'),
    motherTongue: text('motherTongue', 'Marathi'),
    languages: p.languages || [],
    religion: text('religion', 'Hindu'),
    community: text('community', 'Vanjari'),
    subCaste: text('subCaste'),
    gotra: text('gotra'),
    devak: text('devak'),
    kuldaivat: text('kuldaivat'),
    currentCity: text('currentCity'),
    currentDistrict: text('currentDistrict'),
    currentState: text('currentState', 'Maharashtra'),
    nativeVillage: text('nativeVillage'),
    nativeDistrict: text('nativeDistrict'),
    nativeState: text('nativeState'),
    bodyType: text('bodyType'),
    physicalStatus: text('physicalStatus'),
    physicalDetails: text('physicalDetails'),
    highestQualification: text('highestQualification'),
    degrees: (Array.isArray(p.degrees) && p.degrees.length ? p.degrees : p.education ? [{ degree: p.education }] : [emptyDegree()]).map((d) => ({
      degree: d.degree || '',
      specialization: d.specialization || '',
      institute: d.institute || '',
      year: d.year ?? '',
    })),
    employmentType: text('employmentType'),
    occupation: text('occupation'),
    jobDesignation: text('jobDesignation'),
    companyName: text('companyName'),
    workingCity: text('workingCity'),
    experienceYears: num('experienceYears'),
    businessName: text('businessName'),
    businessType: text('businessType'),
    businessYears: num('businessYears'),
    annualIncome: text('annualIncome'),
    workDetails: text('workDetails'),
    isMatrimonial: p.isMatrimonial ?? false,
    fatherName: text('fatherName'),
    fatherOccupation: text('fatherOccupation'),
    motherName: text('motherName'),
    motherOccupation: text('motherOccupation'),
    siblingsCount: num('siblingsCount'),
    brothers: num('brothers'),
    marriedBrothers: num('marriedBrothers'),
    sisters: num('sisters'),
    marriedSisters: num('marriedSisters'),
    familyType: p.familyType || '',
    familyValues: text('familyValues'),
    aboutFamily: text('aboutFamily'),
    diet: text('diet'),
    drinking: text('drinking'),
    smoking: text('smoking'),
    hobbies: p.hobbies || [],
    interests: p.interests || [],
    careerGoals: text('careerGoals'),
    marriageExpectations: text('marriageExpectations'),
    timeOfBirth: text('timeOfBirth'),
    placeOfBirth: text('placeOfBirth'),
    prefAgeMin: num('prefAgeMin'),
    prefAgeMax: num('prefAgeMax'),
    prefEducation: text('prefEducation'),
    prefLocation: text('prefLocation'),
    prefOccupation: text('prefOccupation'),
    prefName: text('prefName'),
    accountType: p.accountType || 'PUBLIC',
    familyContacts: (p.familyContacts || []).map((c) => ({
      relation: c.relation,
      relationLabel: c.relationLabel || '',
      name: c.name,
      phone: tenDigits(c.phone),
      whatsapp: tenDigits(c.whatsapp),
      bestTime: c.bestTime || '',
      languages: c.languages || '',
      isPrimary: !!c.isPrimary,
    })),
  };
}

/** Which form fields belong to which step (used to validate one step at a time). */
export const STEP_FIELDS = {
  contact: ['fullName', 'email', 'phone', 'currentCity', 'currentDistrict', 'currentState', 'nativeVillage', 'nativeDistrict', 'nativeState'],
  personal: ['dateOfBirth', 'gender', 'maritalStatus', 'heightCm', 'motherTongue', 'createdBy', 'weightKg', 'bloodGroup', 'languages', 'religion', 'community', 'subCaste', 'gotra', 'devak', 'kuldaivat', 'bodyType', 'physicalStatus', 'physicalDetails'],
  work: ['highestQualification', 'degrees', 'employmentType', 'occupation', 'jobDesignation', 'companyName', 'workingCity', 'experienceYears', 'businessName', 'businessType', 'businessYears', 'annualIncome', 'workDetails'],
  family: ['fatherName', 'fatherOccupation', 'motherName', 'motherOccupation', 'brothers', 'marriedBrothers', 'sisters', 'marriedSisters', 'familyType', 'familyValues', 'aboutFamily'],
  more: ['diet', 'drinking', 'smoking', 'hobbies', 'interests', 'bio', 'careerGoals', 'marriageExpectations'],
  kundli: ['timeOfBirth', 'placeOfBirth', 'prefAgeMin', 'prefAgeMax', 'prefOccupation', 'prefName'],
  reach: ['familyContacts', 'accountType'],
};

const star = (on) => (on ? ' *' : '');

/** Email + mobile number. A number verified by SMS login is shown read-only. */
export function ContactFields({ form, phone, phoneVerified, requireEmail = false, requirePhone = false, hideEmail = false }) {
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <>
      {!hideEmail && <Field label={`Email ID${requireEmail ? ' *' : ' (optional)'}`} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" error={e.email?.message} {...register('email')} />}
      {phoneVerified && phone ? (
        <label className="block">
          <span className="field-label">Mobile number</span>
          <span className="field flex items-center gap-2 bg-sand/60 text-muted">
            <Icon name="check" size={15} className="text-leaf" /> {formatPhone(phone)} <small className="ml-auto text-[11px]">verified</small>
          </span>
        </label>
      ) : (
        <Field label={`Mobile number${requirePhone ? ' *' : ' (optional)'}`} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} placeholder="10-digit mobile number" hint="Shown only to people you approve" error={e.phone?.message} {...register('phone')} />
      )}
    </>
  );
}

/** Where you live (and, folded away, where you are from). */
function LocationFields({ form, withVillageHint = true }) {
  const { register, formState, watch } = form;
  const e = formState.errors;
  const M = !!watch('isMatrimonial');
  return (
    <>
      <Field label="City / village *" placeholder="e.g. Boisar" error={e.currentCity?.message} {...register('currentCity')} />
      <SelectOther form={form} name="currentDistrict" label={`District${star(M)}`} options={DISTRICTS} />
      <SelectOther form={form} name="currentState" label="State *" options={STATES} placeholder="Choose state" />
      <MoreFields form={form} names={['nativeVillage', 'nativeDistrict', 'nativeState']} title="Native place (optional)">
        <Field label="Native village" placeholder="e.g. Dahanu" hint={withVillageHint ? 'Helps people from home find you' : undefined} {...register('nativeVillage')} />
        <SelectOther form={form} name="nativeDistrict" label="Native district" options={DISTRICTS} />
        <SelectOther form={form} name="nativeState" label="Native state" options={STATES} placeholder="Choose state" />
      </MoreFields>
    </>
  );
}

/** Step 1 for every member: who you are and where you live. Community-only members fill just this. */
export function ContactSection({ form, phone, phoneVerified, email }) {
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name *" placeholder="e.g. Aditya Chavan" autoComplete="name" error={e.fullName?.message} {...register('fullName')} className="sm:col-span-2" />
      <ContactFields form={form} phone={phone} phoneVerified={phoneVerified} hideEmail={Boolean(email)} />
      <LocationFields form={form} />
    </div>
  );
}

/** Personal details + religion & community + physical information. */
export function BasicSection({ form, withName = true }) {
  const { register, formState, watch, setValue } = form;
  const e = formState.errors;
  const M = !!watch('isMatrimonial');
  const physical = watch('physicalStatus');
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {withName && <Field label="Full name *" placeholder="e.g. Aditya Chavan" error={e.fullName?.message} {...register('fullName')} className="sm:col-span-2" />}
      <Field label={`Date of birth${star(true)}`} type="date" max={new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)} error={e.dateOfBirth?.message} {...register('dateOfBirth')} />
      <div>
        <span className="field-label">Gender *</span>
        <Segment
          id="gender"
          value={watch('gender')}
          onChange={(v) => setValue('gender', v, { shouldValidate: true, shouldDirty: true })}
          options={[
            { value: 'MALE', label: 'Male' },
            { value: 'FEMALE', label: 'Female' },
            { value: 'OTHER', label: 'Other' },
          ]}
        />
        {e.gender && <span className="field-error">{e.gender.message}</span>}
      </div>
      <Field as="select" label="Marital status *" {...register('maritalStatus')}>
        <option value="NEVER_MARRIED">Single</option>
        <option value="MARRIED">Married</option>
        <option value="DIVORCED">Divorced</option>
        {/* not offered any more, but a member who chose it earlier keeps seeing their value */}
        {watch('maritalStatus') === 'WIDOWED' && <option value="WIDOWED">Widowed</option>}
      </Field>
      {watch('maritalStatus') === 'MARRIED' && <p className="-mt-2 text-xs text-muted sm:col-span-2">Married members are not shown in Matches. You can still use the community, business and services sections.</p>}
      <HeightSelect form={form} label={`Height${star(M)}`} />
      <SelectOther form={form} name="motherTongue" label={`Mother tongue${star(M)}`} options={MOTHER_TONGUES} />

      <MoreFields form={form} names={['createdBy', 'weightKg', 'bloodGroup', 'languages']} title="More about you (optional)">
        <SelectOther form={form} name="createdBy" label="Profile created by" options={CREATED_BY} />
        <Field label="Weight (kg)" type="number" inputMode="numeric" min={30} max={250} placeholder="e.g. 65" {...register('weightKg')} />
        <SelectOther form={form} name="bloodGroup" label="Blood group" options={BLOOD_GROUPS} />
        <ChipsInput form={form} name="languages" label="Languages you know" options={LANGUAGES} className="sm:col-span-2" />
      </MoreFields>

      <GroupTitle hint="Pre-filled for the Vanjari community — change it if needed.">Religion & community</GroupTitle>
      <SelectOther form={form} name="religion" label={`Religion${star(M)}`} options={RELIGIONS} />
      <SelectOther form={form} name="community" label={`Community${star(M)}`} options={COMMUNITIES} />
      <MoreFields form={form} names={['subCaste', 'gotra', 'devak', 'kuldaivat']} title="Gotra, Devak & more (optional)">
        <Field label="Sub-community / sub-caste" placeholder="optional" {...register('subCaste')} />
        <Field label="Gotra" placeholder="e.g. Kashyap" {...register('gotra')} />
        <Field label="Devak" placeholder="e.g. Panchpallav" {...register('devak')} />
        <Field label="Kuldaivat (family deity)" placeholder="e.g. Khandoba" {...register('kuldaivat')} />
      </MoreFields>

      <GroupTitle hint="All optional — share only what you are comfortable with.">Physical information</GroupTitle>
      <SelectOther form={form} name="bodyType" label="Body type" options={BODY_TYPES} />
      <SelectOther form={form} name="physicalStatus" label="Physical status" options={PHYSICAL_STATUS} hint="Most people choose “Fully fit”." />
      {physical && physical !== FIT && (
        <Field
          as="textarea"
          rows={3}
          label="Anything you want families to know (optional)"
          placeholder="e.g. a past surgery or illness, and how you are now. Honest details build trust."
          maxLength={500}
          error={e.physicalDetails?.message}
          {...register('physicalDetails')}
          className="sm:col-span-2"
        />
      )}
    </div>
  );
}

/** Education + work. One question decides what else is asked, so nobody sees fields that do not apply. */
export function WorkSection({ form, withLocation = true }) {
  const { register, formState, watch } = form;
  const e = formState.errors;
  const M = !!watch('isMatrimonial');
  const type = watch('employmentType');
  const { job, business } = employmentGroups(type);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {withLocation && (
        <>
          <GroupTitle>Where you live</GroupTitle>
          <LocationFields form={form} />
        </>
      )}

      <GroupTitle hint="Choose your highest qualification. You can add the full degree details below (optional).">Education</GroupTitle>
      <SelectOther form={form} name="highestQualification" label={`Highest qualification${star(M)}`} options={QUALIFICATIONS} className="sm:col-span-2" />
      <MoreFields form={form} names={['degrees.0.degree']} title="Add degree details — college, specialization (optional)">
        <DegreesField form={form} required={false} />
      </MoreFields>

      <GroupTitle hint="Tell us what you do. The questions below change to match your answer.">Work</GroupTitle>
      <SelectOther form={form} name="employmentType" label={`I am working as${star(M)}`} options={EMPLOYMENT_TYPES} />
      <SelectOther form={form} name="occupation" label={`Occupation${star(M)}`} options={OCCUPATIONS} hint="e.g. Engineer, Teacher, Farmer" />
      {job && (
        <>
          <Field label="Job designation" placeholder="e.g. Senior Accountant" {...register('jobDesignation')} />
          <Field label="Company / organization" placeholder="e.g. Tata Motors" {...register('companyName')} />
          <Field label="Working city" placeholder="e.g. Pune" {...register('workingCity')} />
          <Field label="Years of experience" type="number" inputMode="numeric" min={0} max={60} placeholder="e.g. 5" {...register('experienceYears')} />
        </>
      )}
      {business && (
        <>
          {job && <GroupTitle hint="Your own business, full-time or alongside your job.">Your business</GroupTitle>}
          <Field label={/farm/i.test(type || '') ? 'Farm / work name (optional)' : 'Business name'} placeholder="e.g. Jadhav Dairy" {...register('businessName')} />
          <SelectOther form={form} name="businessType" label="Type of business" options={BUSINESS_TYPES} />
          <Field label="Years in this business" type="number" inputMode="numeric" min={0} max={60} placeholder="e.g. 3" {...register('businessYears')} />
          {!job && <Field label="Working city" placeholder="e.g. Palghar" {...register('workingCity')} />}
        </>
      )}
      <SelectOther form={form} name="annualIncome" label="Annual income (optional)" options={INCOMES} placeholder="Prefer not to say" />
      <Field
        as="textarea"
        rows={3}
        label="More about my work (optional)"
        placeholder="e.g. 9–5 job as an accountant, and I also run a dairy business with my father on weekends."
        maxLength={1000}
        error={e.workDetails?.message}
        {...register('workDetails')}
        className="sm:col-span-2"
      />
    </div>
  );
}

/** Family background. */
export function FamilySection({ form }) {
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Father’s name" {...register('fatherName')} />
      <SelectOther form={form} name="fatherOccupation" label="Father’s occupation" options={PARENT_OCCUPATIONS} />
      <Field label="Mother’s name" {...register('motherName')} />
      <SelectOther form={form} name="motherOccupation" label="Mother’s occupation" options={PARENT_OCCUPATIONS} />

      <GroupTitle hint="Leave blank if you have none.">Brothers & sisters</GroupTitle>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
        <Field label="Brothers" type="number" inputMode="numeric" min={0} max={15} {...register('brothers')} />
        <Field label="Married" type="number" inputMode="numeric" min={0} max={15} {...register('marriedBrothers')} />
        <Field label="Sisters" type="number" inputMode="numeric" min={0} max={15} {...register('sisters')} />
        <Field label="Married" type="number" inputMode="numeric" min={0} max={15} {...register('marriedSisters')} />
      </div>

      <Field as="select" label="Family type" {...register('familyType')}>
        <option value="">Choose…</option>
        <option value="NUCLEAR">Nuclear</option>
        <option value="JOINT">Joint</option>
      </Field>
      <SelectOther form={form} name="familyValues" label="Family values" options={FAMILY_VALUES} />
      <Field as="textarea" rows={3} label="About my family (optional)" placeholder="A few lines about your family…" maxLength={600} error={e.aboutFamily?.message} {...register('aboutFamily')} className="sm:col-span-2" />
    </div>
  );
}

/** Lifestyle & habits + about me. */
export function LifestyleSection({ form }) {
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <GroupTitle hint="All optional.">Lifestyle</GroupTitle>
      <SelectOther form={form} name="diet" label="Diet" options={DIETS} />
      <SelectOther form={form} name="drinking" label="Drinking" options={HABITS} />
      <SelectOther form={form} name="smoking" label="Smoking" options={HABITS} />
      <div className="hidden sm:block" />
      <ChipsInput form={form} name="hobbies" label="Hobbies" options={HOBBIES} className="sm:col-span-2" />
      <ChipsInput form={form} name="interests" label="Interests" options={INTERESTS} className="sm:col-span-2" />

      <GroupTitle>About me</GroupTitle>
      <Field as="textarea" rows={4} label="About myself" placeholder="A few lines about you, your values and interests…" maxLength={600} error={e.bio?.message} {...register('bio')} className="sm:col-span-2" />
      <MoreFields form={form} names={['careerGoals', 'marriageExpectations']} title="Career goals & expectations (optional)">
        <Field as="textarea" rows={3} label="My career goals" maxLength={600} {...register('careerGoals')} className="sm:col-span-2" />
        <Field as="textarea" rows={3} label="Expectations from marriage" maxLength={600} {...register('marriageExpectations')} className="sm:col-span-2" />
      </MoreFields>
    </div>
  );
}

/** Birth details (Rashi & Nakshatra are worked out automatically) + what you look for in a partner. */
export function KundliSection({ form }) {
  const { register, formState, watch } = form;
  const e = formState.errors;
  const M = !!watch('isMatrimonial');
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <GroupTitle hint="We calculate your Rashi, Nakshatra and Kundali matching automatically from these.">Birth details</GroupTitle>
      <Field label={`Exact birth time${star(M)}`} type="time" hint="Ask your parents — it makes the Kundali accurate" error={e.timeOfBirth?.message} {...register('timeOfBirth')} />
      <Field label={`Birth place${star(M)}`} placeholder="e.g. Palghar" error={e.placeOfBirth?.message} {...register('placeOfBirth')} />

      <GroupTitle hint="Keep it simple — only what matters most. All optional.">Partner preferences</GroupTitle>
      <Field label="Preferred age — from" type="number" inputMode="numeric" min={18} max={80} {...register('prefAgeMin')} />
      <Field label="Preferred age — to" type="number" inputMode="numeric" min={18} max={80} error={e.prefAgeMax?.message} {...register('prefAgeMax')} />
      <SelectOther form={form} name="prefOccupation" label="Preferred occupation" options={OCCUPATIONS} placeholder="Any" />
      <Field label="Preferred name (optional)" placeholder="e.g. a name your family likes" {...register('prefName')} />
    </div>
  );
}

/** Contact person, privacy, and the matrimony switch. */
export function ReachSection({ form, showMatrimonial = true }) {
  const { watch, setValue, formState } = form;
  const isMatrimonial = watch('isMatrimonial');
  return (
    <div className="space-y-6">
      {showMatrimonial && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-4">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--color-primary)]" checked={!!isMatrimonial} onChange={(ev) => setValue('isMatrimonial', ev.target.checked, { shouldDirty: true })} />
          <span>
            <b className="block text-sm">Show me in matrimonial search</b>
            <small className="text-xs text-muted">Turn on if you (or your family) are looking for a life partner. You can change this anytime.</small>
          </span>
        </label>
      )}
      {(isMatrimonial || !showMatrimonial) && <FamilyContactsSection form={form} required={!!isMatrimonial} />}
      {formState.errors.familyContacts?.message && <p className="field-error -mt-3">{formState.errors.familyContacts.message}</p>}
      <div>
        <span className="field-label">Profile privacy</span>
        <Segment
          id="privacy"
          value={watch('accountType')}
          onChange={(v) => setValue('accountType', v, { shouldDirty: true })}
          options={[
            { value: 'PUBLIC', label: '🌐 Public' },
            { value: 'PRIVATE', label: '🔒 Private' },
          ]}
        />
        <p className="mt-2 text-xs text-muted">
          {watch('accountType') === 'PRIVATE' ? 'Only members whose follow request you accept can see your photos and details.' : 'Verified community members can see your profile details. Your phone number stays hidden.'}
        </p>
      </div>
    </div>
  );
}
