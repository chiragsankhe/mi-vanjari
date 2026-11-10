import { AnimatePresence, motion } from 'motion/react';
import { useFieldArray } from 'react-hook-form';
import { cn } from '../../lib/utils';
import { Field, Icon } from '../ui';
import { RELATIONS } from './ProfileForm';

export const MAX_CONTACTS = 4;
const BEST_TIMES = ['Anytime', 'Morning (9 AM – 12 PM)', 'Afternoon (12 – 4 PM)', 'Evening (5 – 8 PM)', 'Night (after 8 PM)', 'Weekends only'];
const blank = (relation) => ({ relation, relationLabel: '', name: '', phone: '', bestTime: '', languages: '', isPrimary: false });

/**
 * "Family contacts": who should members call about this profile (father, mother, elder brother…).
 * Lives inside the profile form (react-hook-form field array `familyContacts`).
 */
export function FamilyContactsSection({ form }) {
  const { control, register, watch, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'familyContacts' });
  const errors = formState.errors.familyContacts || [];
  const contacts = watch('familyContacts') || [];

  const add = () => {
    const used = new Set(contacts.map((c) => c.relation));
    const next = ['FATHER', 'MOTHER', 'ELDER_BROTHER', 'ELDER_SISTER', 'UNCLE'].find((r) => !used.has(r)) || 'OTHER';
    const c = blank(next);
    if (next === 'FATHER') c.name = watch('fatherName') || '';
    if (next === 'MOTHER') c.name = watch('motherName') || '';
    if (!contacts.length) c.isPrimary = true;
    append(c);
  };

  const makePrimary = (i) => contacts.forEach((_, j) => setValue(`familyContacts.${j}.isPrimary`, i === j, { shouldDirty: true }));

  return (
    <fieldset>
      <legend className="mb-1 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Family contacts · संपर्कासाठी कुटुंबीय</legend>
      <p className="mb-4 text-xs leading-relaxed text-muted">
        Who should families call about this profile? Add your father, mother, elder brother, sister or any relative who will take the call. The person marked <b>Call first</b> is shown at the top.
        <span className="mt-1 flex items-start gap-1.5 text-[#5c544d]">
          <Icon name="lock" size={13} className="mt-0.5 shrink-0" />
          Numbers are shown only to members you are connected with (accepted follow). Others see who to contact, with the number hidden. Please add only people who agreed to be contacted.
        </span>
      </p>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {fields.map((f, i) => {
            const e = errors[i] || {};
            const c = contacts[i] || {};
            return (
              <motion.div key={f.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={cn('rounded-xl border bg-white p-4', c.isPrimary ? 'border-primary/40 shadow-[0_0_0_3px_rgba(200,65,26,0.06)]' : 'border-line')}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => makePrimary(i)}
                    className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold transition', c.isPrimary ? 'border-primary bg-primary text-white' : 'border-line text-muted hover:border-primary/40')}
                    aria-pressed={!!c.isPrimary}
                  >
                    {c.isPrimary ? '★ Call first' : 'Make “Call first”'}
                  </button>
                  <button type="button" onClick={() => remove(i)} className="ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-sand hover:text-primary" aria-label="Remove contact">
                    <Icon name="trash" size={15} />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field as="select" label="Relation *" {...register(`familyContacts.${i}.relation`)}>
                    {RELATIONS.map(([v, en, mr]) => (
                      <option key={v} value={v}>
                        {en} · {mr}
                      </option>
                    ))}
                  </Field>
                  {c.relation === 'OTHER' ? (
                    <Field label="How are they related? *" placeholder="e.g. Mama, Cousin" error={e.relationLabel?.message} {...register(`familyContacts.${i}.relationLabel`)} />
                  ) : (
                    <Field label="Name *" placeholder="e.g. Suresh Sankhe" error={e.name?.message} {...register(`familyContacts.${i}.name`)} />
                  )}
                  {c.relation === 'OTHER' && <Field label="Name *" placeholder="Full name" error={e.name?.message} {...register(`familyContacts.${i}.name`)} />}
                  <label className="block">
                    <span className="field-label">Mobile number *</span>
                    <span className={cn('field flex items-center gap-2 p-0 pl-3', e.phone && 'border-primary')}>
                      <span className="text-sm text-muted">+91</span>
                      <input type="tel" inputMode="numeric" autoComplete="off" placeholder="98765 43210" maxLength={14} className="h-full w-full bg-transparent py-2.5 pr-3 outline-none" {...register(`familyContacts.${i}.phone`)} />
                    </span>
                    {e.phone && <span className="mt-1 block text-xs text-primary">{e.phone.message}</span>}
                  </label>
                  <Field as="select" label="Best time to call" {...register(`familyContacts.${i}.bestTime`)}>
                    <option value="">—</option>
                    {/* keep a previously saved custom value selectable, so saving never erases it */}
                    {[...BEST_TIMES, ...(c.bestTime && !BEST_TIMES.includes(c.bestTime) ? [c.bestTime] : [])].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Field>
                  <Field label="Languages" placeholder="e.g. Marathi, Hindi" {...register(`familyContacts.${i}.languages`)} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {fields.length < MAX_CONTACTS ? (
        <button type="button" onClick={add} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3 text-sm font-semibold text-muted transition hover:border-primary hover:text-primary">
          <Icon name="plus" size={16} /> {fields.length ? 'Add another family member' : 'Add a family contact'}
        </button>
      ) : (
        <p className="mt-3 text-center text-xs text-muted">You can add up to {MAX_CONTACTS} family contacts.</p>
      )}
    </fieldset>
  );
}
