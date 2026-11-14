import { useState } from 'react';
import { cn } from '../../lib/utils';
import { Field, Icon } from '../ui';
import { HEIGHTS } from './formData';

const OTHER = '__other__';
const getErr = (errors, name) => name.split('.').reduce((o, k) => o?.[k], errors)?.message;

/**
 * A dropdown that never gets in the way: if the answer is not in the list, choose "Other" and type it.
 * Works with react-hook-form (`form` + `name`). The stored value is plain text either way.
 */
export function SelectOther({ form, name, label, options, placeholder = 'Choose…', hint, className, otherLabel = 'Other (type it)', otherPlaceholder = 'Type here' }) {
  const { watch, setValue, formState } = form;
  const value = watch(name) ?? '';
  const [forced, setForced] = useState(false);
  const custom = value !== '' && !options.includes(value);
  const showOther = forced || custom;
  const error = getErr(formState.errors, name);
  const set = (v) => setValue(name, v, { shouldDirty: true, shouldValidate: formState.isSubmitted || Boolean(error) });

  return (
    <div className={className}>
      <Field
        as="select"
        label={label}
        error={showOther ? undefined : error}
        hint={showOther ? undefined : hint}
        value={showOther ? OTHER : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) {
            setForced(true);
            if (!custom) set('');
          } else {
            setForced(false);
            set(v);
          }
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={OTHER}>{otherLabel}</option>
      </Field>
      {showOther && (
        <div className="mt-2">
          <input className="field" placeholder={otherPlaceholder} value={custom ? value : forced && !options.includes(value) ? value : ''} maxLength={80} onChange={(e) => set(e.target.value)} autoFocus={forced && !custom} aria-label={`${typeof label === 'string' ? label.replace(' *', '') : 'Answer'} — type your answer`} />
          {error ? <span className="field-error">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
        </div>
      )}
    </div>
  );
}

/** Height in feet/inches (stored in cm). "Other" lets people type centimetres. */
export function HeightSelect({ form, name = 'heightCm', label = 'Height', className }) {
  const { watch, setValue, formState } = form;
  const raw = watch(name);
  const value = raw === '' || raw == null ? '' : Number(raw);
  const [forced, setForced] = useState(false);
  const known = HEIGHTS.some((h) => h.cm === value);
  const showOther = forced || (value !== '' && !known);
  const error = getErr(formState.errors, name);
  const set = (v) => setValue(name, v, { shouldDirty: true, shouldValidate: formState.isSubmitted || Boolean(error) });
  return (
    <div className={className}>
      <Field
        as="select"
        label={label}
        error={showOther ? undefined : error}
        value={showOther ? OTHER : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) {
            setForced(true);
            if (known) set('');
          } else {
            setForced(false);
            set(v === '' ? '' : Number(v));
          }
        }}
      >
        <option value="">Choose…</option>
        {HEIGHTS.map((h) => (
          <option key={h.cm} value={h.cm}>
            {h.label}
          </option>
        ))}
        <option value={OTHER}>Other (type in cm)</option>
      </Field>
      {showOther && (
        <div className="mt-2">
          <input className="field" type="number" inputMode="numeric" min={120} max={230} placeholder="Height in cm, e.g. 168" value={value} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))} autoFocus={forced && !known} aria-label="Height in centimetres" />
          {error && <span className="field-error">{error}</span>}
        </div>
      )}
    </div>
  );
}

/** Pick several answers by tapping chips, and add your own. Stores an array of text. */
export function ChipsInput({ form, name, label, options, hint, addPlaceholder = 'Add your own', className }) {
  const { watch, setValue } = form;
  const value = watch(name) || [];
  const [draft, setDraft] = useState('');
  const set = (list) => setValue(name, list, { shouldDirty: true });
  const toggle = (o) => set(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (!value.some((x) => x.toLowerCase() === t.toLowerCase())) set([...value, t.slice(0, 40)]);
    setDraft('');
  };
  const custom = value.filter((v) => !options.includes(v));
  return (
    <div className={className}>
      <span className="field-label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {[...options, ...custom].map((o) => {
          const on = value.includes(o);
          return (
            <button key={o} type="button" onClick={() => toggle(o)} aria-pressed={on} className={cn('rounded-full border px-3 py-1.5 text-[13px] transition', on ? 'border-primary bg-primary text-white' : 'border-line bg-white text-[#4b4641] hover:border-primary')}>
              {on && <Icon name="check" size={12} className="mr-1 inline" />}
              {o}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <input className="field" placeholder={addPlaceholder} value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={add} disabled={!draft.trim()}>
          <Icon name="plus" size={15} /> Add
        </button>
      </div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </div>
  );
}

/** A heading for a group of questions inside a step. */
export function GroupTitle({ children, hint }) {
  return (
    <div className="sm:col-span-2">
      <h3 className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">{children}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/**
 * "More details (optional)" — folded away so the form stays short. Opens by itself when one of its fields already has an answer.
 * `names` = the form fields inside (used to decide whether to start open).
 */
export function MoreFields({ form, names = [], title = 'More details (optional)', children }) {
  const [initiallyOpen] = useState(() => names.some((n) => {
    const v = form.getValues(n);
    return Array.isArray(v) ? v.length > 0 : v !== '' && v != null;
  }));
  return (
    <details open={initiallyOpen} className="group sm:col-span-2 rounded-xl border border-line bg-white/60 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[#4b4641] [&::-webkit-details-marker]:hidden">
        {title}
        <Icon name="chevron-down" size={16} className="transition group-open:rotate-180" />
      </summary>
      <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}
