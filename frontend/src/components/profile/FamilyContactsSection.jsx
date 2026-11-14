import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useFieldArray } from 'react-hook-form';
import { cn } from '../../lib/utils';
import { Field, Icon } from '../ui';
import { RELATIONS } from './ProfileForm';

export const MAX_CONTACTS = 4;
const blank = (relation, extra = {}) => ({ relation, relationLabel: '', name: '', phone: '', whatsapp: '', bestTime: '', languages: '', isPrimary: false, ...extra });

/**
 * "Contact person": who families should call about this profile — person, name, mobile and WhatsApp number.
 * One is enough; more can be added. Lives inside the profile form (react-hook-form field array `familyContacts`).
 */
export function FamilyContactsSection({ form, required = false }) {
  const { control, register, watch, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'familyContacts' });
  const errors = formState.errors.familyContacts || [];
  const contacts = watch('familyContacts') || [];

  // matrimony needs one contact person: show the empty row straight away so nobody has to hunt for a button
  useEffect(() => {
    if (required && fields.length === 0) append(blank('FATHER', { isPrimary: true, name: form.getValues('fatherName') || '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [required]);

  const add = () => {
    const used = new Set(contacts.map((c) => c.relation));
    const next = ['FATHER', 'MOTHER', 'ELDER_BROTHER', 'ELDER_SISTER', 'UNCLE'].find((r) => !used.has(r)) || 'OTHER';
    const c = blank(next, { name: next === 'FATHER' ? watch('fatherName') || '' : next === 'MOTHER' ? watch('motherName') || '' : '' });
    if (!contacts.length) c.isPrimary = true;
    append(c);
  };
  const makePrimary = (i) => contacts.forEach((_, j) => setValue(`familyContacts.${j}.isPrimary`, i === j, { shouldDirty: true }));

  return (
    <fieldset>
      <legend className="mb-1 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Contact person{required ? ' *' : ''} · संपर्क</legend>
      <p className="mb-4 text-xs leading-relaxed text-muted">
        Who should families call about this profile? Add one person who agreed to take the call.
        <span className="mt-1 flex items-start gap-1.5 text-[#5c544d]">
          <Icon name="lock" size={13} className="mt-0.5 shrink-0" />
          Numbers are shown only to members you have approved. Others see who to contact, with the number hidden.
        </span>
      </p>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {fields.map((f, i) => {
            const e = errors[i] || {};
            const c = contacts[i] || {};
            return (
              <motion.div key={f.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={cn('rounded-xl border bg-white p-4', c.isPrimary && fields.length > 1 ? 'border-primary/40' : 'border-line')}>
                {(fields.length > 1 || !required) && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => makePrimary(i)} className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold transition', c.isPrimary ? 'border-primary bg-primary text-white' : 'border-line text-muted hover:border-primary/40')} aria-pressed={!!c.isPrimary}>
                        {c.isPrimary ? '★ Call first' : 'Make “Call first”'}
                      </button>
                    )}
                    <button type="button" onClick={() => remove(i)} className="ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-sand hover:text-primary" aria-label="Remove contact">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field as="select" label="Contact person *" {...register(`familyContacts.${i}.relation`)}>
                    {RELATIONS.map(([v, en, mr]) => (
                      <option key={v} value={v}>
                        {en} · {mr}
                      </option>
                    ))}
                  </Field>
                  <Field label="Person’s name *" placeholder="e.g. Suresh Sankhe" error={e.name?.message} {...register(`familyContacts.${i}.name`)} />
                  {c.relation === 'OTHER' && <Field label="How are they related? *" placeholder="e.g. Mama, Cousin" error={e.relationLabel?.message} {...register(`familyContacts.${i}.relationLabel`)} className="sm:col-span-2" />}
                  <label className="block">
                    <span className="field-label">Contact number *</span>
                    <span className={cn('field flex items-center gap-2 p-0 pl-3', e.phone && 'border-primary')}>
                      <span className="text-sm text-muted">+91</span>
                      <input type="tel" inputMode="numeric" autoComplete="off" placeholder="98765 43210" maxLength={14} className="h-full w-full bg-transparent py-2.5 pr-3 outline-none" {...register(`familyContacts.${i}.phone`)} />
                    </span>
                    {e.phone && <span className="mt-1 block text-xs text-primary">{e.phone.message}</span>}
                  </label>
                  <label className="block">
                    <span className="field-label">WhatsApp number (optional)</span>
                    <span className={cn('field flex items-center gap-2 p-0 pl-3', e.whatsapp && 'border-primary')}>
                      <span className="text-sm text-muted">+91</span>
                      <input type="tel" inputMode="numeric" autoComplete="off" placeholder="Same as contact number if empty" maxLength={14} className="h-full w-full bg-transparent py-2.5 pr-3 outline-none" {...register(`familyContacts.${i}.whatsapp`)} />
                    </span>
                    {e.whatsapp && <span className="mt-1 block text-xs text-primary">{e.whatsapp.message}</span>}
                  </label>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {fields.length < MAX_CONTACTS && fields.length > 0 && (
        <button type="button" onClick={add} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-xs font-semibold text-muted transition hover:border-primary hover:text-primary">
          <Icon name="plus" size={14} /> Add another contact person
        </button>
      )}
      {fields.length === 0 && (
        <button type="button" onClick={add} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3 text-sm font-semibold text-muted transition hover:border-primary hover:text-primary">
          <Icon name="plus" size={16} /> Add a contact person
        </button>
      )}
    </fieldset>
  );
}
