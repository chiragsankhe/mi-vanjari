import { AnimatePresence, motion } from 'motion/react';
import { useFieldArray } from 'react-hook-form';
import { Field, Icon } from '../ui';

export const MAX_DEGREES = 10;
export const emptyDegree = () => ({ degree: '', institute: '', year: '' });

/**
 * Education as a list: every degree the member has (degree, college / university, year),
 * with "+ Add degree". Lives inside the profile form (react-hook-form field array `degrees`).
 */
export function DegreesField({ form, required = false }) {
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'degrees' });
  const errors = formState.errors.degrees;
  const thisYear = new Date().getFullYear();

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="field-label mb-0">Education{required ? ' *' : ''}</span>
        <small className="text-[11px] text-muted">Add every degree, diploma or course</small>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {fields.map((f, i) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-line bg-white/70 p-3 sm:p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
                  <Icon name="graduation" size={13} /> Degree {i + 1}
                </span>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition hover:bg-primary-soft hover:text-primary" aria-label={`Remove degree ${i + 1}`}>
                    <Icon name="trash" size={13} /> Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1.3fr_1.5fr_0.7fr]">
                <Field label="Degree / course" placeholder="e.g. B.Com, B.E. Computer, MBA, ITI" error={errors?.[i]?.degree?.message} {...register(`degrees.${i}.degree`)} />
                <Field label="College / university (optional)" placeholder="e.g. Mumbai University" {...register(`degrees.${i}.institute`)} />
                <Field label="Year (optional)" type="number" inputMode="numeric" min={1950} max={thisYear + 6} placeholder={String(thisYear - 2)} error={errors?.[i]?.year?.message} {...register(`degrees.${i}.year`)} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {typeof errors?.message === 'string' && <p className="field-error mt-2">{errors.message}</p>}
      {errors?.root?.message && <p className="field-error mt-2">{errors.root.message}</p>}

      {fields.length < MAX_DEGREES && (
        <button type="button" onClick={() => append(emptyDegree())} className="btn btn-outline btn-sm mt-3">
          <Icon name="plus" size={15} /> Add degree
        </button>
      )}
    </div>
  );
}
