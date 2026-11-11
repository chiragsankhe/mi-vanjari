import { z } from 'zod';
import { formatPhone } from '../../lib/utils';
import { Field, Icon, Segment } from '../ui';
import { DegreesField, emptyDegree } from './DegreesField';
import { FamilyContactsSection } from './FamilyContactsSection';

const opt = z.string().trim().optional().or(z.literal(''));
// '' must be checked first: z.coerce.number() turns an empty box into 0, which the API rejects (e.g. age 0 < 18)
const optNum = z.union([z.literal(''), z.coerce.number()]).optional();

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
    bestTime: opt,
    languages: opt,
    isPrimary: z.boolean().optional(),
  })
  .refine((c) => c.relation !== 'OTHER' || c.relationLabel?.trim(), { message: 'How are they related?', path: ['relationLabel'] });

const isPhone = (v) => /^(\+?91[\s-]?)?[6-9]\d{4}\s?\d{5}$/.test(String(v || '').trim());
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

/**
 * Profile form rules. Date of birth, gender, education and occupation are required only
 * when the member is in matrimony; community / business / services members just need the basics.
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
    currentCity: z.string().trim().min(2, 'City is required'),
    currentState: z.string().trim().min(2, 'State is required'),
    nativeVillage: opt,
    degrees: z
      .array(
        z.object({
          degree: z.string().trim().max(80, 'Keep it under 80 characters'),
          institute: opt,
          year: z.union([z.literal(''), z.coerce.number().int().min(1950, 'Check the year').max(2100, 'Check the year')]).optional(),
        }),
      )
      .optional(),
    workDetails: z.string().trim().max(1000, 'Keep it under 1000 characters').optional().or(z.literal('')),
    occupation: opt,
    annualIncome: opt,
    isMatrimonial: z.boolean().optional(),
    gotra: opt,
    subCaste: opt,
    fatherName: opt,
    fatherOccupation: opt,
    motherName: opt,
    siblingsCount: optNum,
    familyType: z.enum(['NUCLEAR', 'JOINT', '']).optional(),
    timeOfBirth: opt,
    placeOfBirth: opt,
    prefAgeMin: optNum,
    prefAgeMax: optNum,
    prefEducation: opt,
    prefLocation: opt,
    accountType: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    familyContacts: z.array(contactSchema).max(4).optional(),
  })
    .superRefine((d, ctx) => {
      if (d.prefAgeMin && d.prefAgeMax && Number(d.prefAgeMin) > Number(d.prefAgeMax)) ctx.addIssue({ code: 'custom', path: ['prefAgeMax'], message: 'Min age must be below max age' });
      if (!d.isMatrimonial) return;
      // matrimony-only requirements
      if (!d.dateOfBirth) ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'Date of birth is required for matrimony' });
      else if ((Date.now() - new Date(d.dateOfBirth).getTime()) / (365.25 * 864e5) < 18) ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'You must be at least 18 years old' });
      if (!d.gender) ctx.addIssue({ code: 'custom', path: ['gender'], message: 'Please choose' });
      if (!(d.degrees || []).some((x) => x.degree?.trim().length >= 2)) ctx.addIssue({ code: 'custom', path: ['degrees', 0, 'degree'], message: 'Add at least one degree for matrimony' });
      if (!d.occupation || d.occupation.trim().length < 2) ctx.addIssue({ code: 'custom', path: ['occupation'], message: 'Occupation is required for matrimony' });
    });

export const profileFormSchema = makeProfileSchema();

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
  ['heightCm', 'siblingsCount', 'prefAgeMin', 'prefAgeMax'].forEach((k) => {
    if (out[k] != null) out[k] = Number(out[k]);
  });
  if (Array.isArray(values.degrees)) {
    out.degrees = values.degrees
      .filter((d) => d.degree?.trim())
      .map((d) => ({ degree: d.degree.trim(), institute: d.institute?.trim() || null, year: d.year === '' || d.year == null ? null : Number(d.year) }));
    delete out.education; // the server builds the summary from the degrees
  }
  if (Array.isArray(values.familyContacts)) {
    out.familyContacts = values.familyContacts.map((c) => ({
      relation: c.relation,
      relationLabel: c.relation === 'OTHER' ? c.relationLabel?.trim() || null : null,
      name: c.name.trim(),
      phone: tenDigits(c.phone),
      bestTime: c.bestTime || null,
      languages: c.languages?.trim() || null,
      isPrimary: !!c.isPrimary,
    }));
  }
  return out;
}

export function profileDefaults(p = {}) {
  return {
    fullName: p.fullName || '',
    email: p.email || '',
    dateOfBirth: p.dateOfBirth || '',
    gender: p.gender || undefined,
    maritalStatus: p.maritalStatus || 'NEVER_MARRIED',
    heightCm: p.heightCm ?? '',
    bio: p.bio || '',
    currentCity: p.currentCity || '',
    currentState: p.currentState || 'Maharashtra',
    nativeVillage: p.nativeVillage || '',
    degrees: (Array.isArray(p.degrees) && p.degrees.length ? p.degrees : p.education ? [{ degree: p.education }] : [emptyDegree()]).map((d) => ({
      degree: d.degree || '',
      institute: d.institute || '',
      year: d.year ?? '',
    })),
    workDetails: p.workDetails || '',
    occupation: p.occupation || '',
    annualIncome: p.annualIncome || '',
    isMatrimonial: p.isMatrimonial ?? false,
    gotra: p.gotra || '',
    subCaste: p.subCaste || '',
    fatherName: p.fatherName || '',
    fatherOccupation: p.fatherOccupation || '',
    motherName: p.motherName || '',
    siblingsCount: p.siblingsCount ?? '',
    familyType: p.familyType || '',
    timeOfBirth: p.timeOfBirth || '',
    placeOfBirth: p.placeOfBirth || '',
    prefAgeMin: p.prefAgeMin ?? '',
    prefAgeMax: p.prefAgeMax ?? '',
    prefEducation: p.prefEducation || '',
    prefLocation: p.prefLocation || '',
    accountType: p.accountType || 'PUBLIC',
    familyContacts: (p.familyContacts || []).map((c) => ({
      relation: c.relation,
      relationLabel: c.relationLabel || '',
      name: c.name,
      phone: tenDigits(c.phone),
      bestTime: c.bestTime || '',
      languages: c.languages || '',
      isPrimary: !!c.isPrimary,
    })),
  };
}

export const STEP_FIELDS = [
  ['fullName', 'dateOfBirth', 'gender', 'maritalStatus', 'heightCm', 'bio'],
  ['currentCity', 'currentState', 'nativeVillage', 'degrees', 'occupation', 'annualIncome', 'workDetails'],
  ['gotra', 'subCaste', 'fatherName', 'fatherOccupation', 'motherName', 'siblingsCount', 'familyType', 'timeOfBirth', 'placeOfBirth', 'prefAgeMin', 'prefAgeMax', 'prefEducation', 'prefLocation', 'accountType', 'familyContacts'],
];

const STATES = ['Maharashtra', 'Gujarat', 'Karnataka', 'Goa', 'Madhya Pradesh', 'Telangana', 'Delhi', 'Other (India)', 'Outside India'];

export function BasicSection({ form, withName = true }) {
  const { register, formState, watch, setValue } = form;
  const e = formState.errors;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {withName && <Field label="Full name *" placeholder="e.g. Aditya Chavan" error={e.fullName?.message} {...register('fullName')} className="sm:col-span-2" />}
      <Field label="Date of birth *" type="date" max={new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)} error={e.dateOfBirth?.message} {...register('dateOfBirth')} />
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
      <Field as="select" label="Marital status" {...register('maritalStatus')}>
        <option value="NEVER_MARRIED">Single</option>
        <option value="MARRIED">Married</option>
        <option value="DIVORCED">Divorced</option>
        {/* not offered any more, but a member who chose it earlier keeps seeing their value */}
        {watch('maritalStatus') === 'WIDOWED' && <option value="WIDOWED">Widowed</option>}
      </Field>
      <Field label="Height (cm)" type="number" inputMode="numeric" placeholder="e.g. 165" {...register('heightCm')} />
      <Field as="textarea" label="About me" placeholder="A few lines about you, your values and interests…" maxLength={600} {...register('bio')} className="sm:col-span-2" />
    </div>
  );
}

/**
 * Step 1 for every member: who you are and how to reach you.
 * Community-only members fill just this.
 */
/** Email + mobile number. A number verified by SMS login is shown read-only. */
export function ContactFields({ form, phone, phoneVerified, requireEmail = true }) {
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <>
      <Field label={`Email ID${requireEmail ? ' *' : ''}`} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" error={e.email?.message} {...register('email')} />
      {phoneVerified && phone ? (
        <label className="block">
          <span className="field-label">Mobile number</span>
          <span className="field flex items-center gap-2 bg-sand/60 text-muted">
            <Icon name="check" size={15} className="text-leaf" /> {formatPhone(phone)} <small className="ml-auto text-[11px]">verified</small>
          </span>
        </label>
      ) : (
        <Field label="Mobile number *" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} placeholder="10-digit mobile number" hint="Shown only to people you approve" error={e.phone?.message} {...register('phone')} />
      )}
    </>
  );
}

export function ContactSection({ form, phone, phoneVerified }) {
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name *" placeholder="e.g. Aditya Chavan" autoComplete="name" error={e.fullName?.message} {...register('fullName')} className="sm:col-span-2" />
      <ContactFields form={form} phone={phone} phoneVerified={phoneVerified} />
      <Field label="City / village *" placeholder="e.g. Boisar" error={e.currentCity?.message} {...register('currentCity')} />
      <Field as="select" label="State *" error={e.currentState?.message} {...register('currentState')}>
        {STATES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </Field>
      <Field label="Native village (optional)" placeholder="e.g. Dahanu, Palghar" hint="Helps people from home find you" {...register('nativeVillage')} className="sm:col-span-2" />
    </div>
  );
}

export function WorkSection({ form, withLocation = true }) {
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {withLocation && (
        <>
          <Field label="Current city *" placeholder="e.g. Pune" error={e.currentCity?.message} {...register('currentCity')} />
          <Field as="select" label="State *" error={e.currentState?.message} {...register('currentState')}>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Field>
          <Field label="Native village" placeholder="e.g. Dahanu, Palghar" hint="Helps families from home find you" {...register('nativeVillage')} className="sm:col-span-2" />
        </>
      )}
      <DegreesField form={form} required={!!form.watch('isMatrimonial')} />
      <Field label="Occupation *" placeholder="e.g. Software Engineer" error={e.occupation?.message} {...register('occupation')} />
      <Field as="select" label="Annual income (optional)" {...register('annualIncome')}>
        <option value="">Prefer not to say</option>
        {['Below ₹3 L', '₹3–6 L', '₹6–10 L', '₹10–20 L', '₹20–35 L', '₹35 L+'].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </Field>
      <Field
        as="textarea"
        rows={4}
        label="More about my work (optional)"
        placeholder="e.g. 9–5 job as an accountant at TCS, and I also run a dairy business with my father on weekends."
        hint="Job, business, farming, side work — anything that tells families more"
        maxLength={1000}
        error={e.workDetails?.message}
        {...register('workDetails')}
        className="sm:col-span-2"
      />
    </div>
  );
}

export function FamilySection({ form, showMatrimonial = true }) {
  const { register, watch, setValue, formState } = form;
  const e = formState.errors;
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
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Family</legend>
        <Field label="Gotra" placeholder="e.g. Kashyap" {...register('gotra')} />
        <Field label="Sub-caste" placeholder="optional" {...register('subCaste')} />
        <Field label="Father’s name" {...register('fatherName')} />
        <Field label="Father’s occupation" {...register('fatherOccupation')} />
        <Field label="Mother’s name" {...register('motherName')} />
        <Field label="Siblings" type="number" min={0} max={20} {...register('siblingsCount')} />
        <Field as="select" label="Family type" {...register('familyType')}>
          <option value="">—</option>
          <option value="NUCLEAR">Nuclear</option>
          <option value="JOINT">Joint</option>
        </Field>
      </fieldset>
      {(isMatrimonial || !showMatrimonial) && <FamilyContactsSection form={form} />}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Birth details (for Kundali)</legend>
        <p className="-mt-1 mb-1 text-xs text-muted sm:col-span-2">We calculate your Rashi & Nakshatra automatically. Time of birth makes it accurate.</p>
        <Field label="Time of birth" type="time" {...register('timeOfBirth')} />
        <Field label="Place of birth" placeholder="e.g. Palghar" {...register('placeOfBirth')} />
      </fieldset>
      {(isMatrimonial || !showMatrimonial) && (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Partner preferences</legend>
          <Field label="Min age" type="number" min={18} max={80} {...register('prefAgeMin')} />
          <Field label="Max age" type="number" min={18} max={80} error={e.prefAgeMax?.message} {...register('prefAgeMax')} />
          <Field label="Preferred education" placeholder="e.g. Graduate" {...register('prefEducation')} />
          <Field label="Preferred location" placeholder="e.g. Pune / Maharashtra" {...register('prefLocation')} />
        </fieldset>
      )}
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
