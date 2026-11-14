import { Icon } from '../ui';

export const MAX_EXTRA_PHONES = 4;
export const tenDigits = (v) => String(v || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
export const isMobile = (v) => /^[6-9]\d{9}$/.test(tenDigits(v));

/** Errors for a list of extra numbers: { [index]: message }. Empty boxes are ignored. */
export function validateExtraPhones(list = []) {
  const errs = {};
  list.forEach((v, i) => {
    if (String(v).trim() && !isMobile(v)) errs[i] = 'Enter a valid 10-digit mobile number';
  });
  return errs;
}

/** The numbers to save: digits only, no empty boxes, no repeats of the main number. */
export const cleanExtraPhones = (list = [], main = '') => [...new Set(list.map(tenDigits).filter((v) => v && v !== tenDigits(main)))];

/**
 * "+ Add another contact number" — a business often has more than one phone.
 * Controlled: `value` is an array of text, `onChange` gets the new array, `errors` is { [index]: message }.
 */
export function ExtraPhonesField({ value = [], onChange, errors = {}, label = 'More contact numbers' }) {
  const set = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)));
  const remove = (i) => onChange(value.filter((_, j) => j !== i));
  return (
    <div className="sm:col-span-2">
      {value.length > 0 && <span className="field-label">{label}</span>}
      <div className="space-y-2">
        {value.map((v, i) => (
          <div key={i}>
            <div className="flex items-center gap-2">
              <span className={`field flex flex-1 items-center gap-2 p-0 pl-3 ${errors[i] ? 'border-primary' : ''}`}>
                <span className="text-sm text-muted">+91</span>
                <input type="tel" inputMode="numeric" maxLength={14} value={v} onChange={(e) => set(i, e.target.value)} placeholder="98765 43210" aria-label={`Contact number ${i + 2}`} className="h-full w-full bg-transparent py-2.5 pr-3 outline-none" />
              </span>
              <button type="button" onClick={() => remove(i)} className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-sand hover:text-primary" aria-label={`Remove contact number ${i + 2}`}>
                <Icon name="trash" size={16} />
              </button>
            </div>
            {errors[i] && <span className="field-error">{errors[i]}</span>}
          </div>
        ))}
      </div>
      {value.length < MAX_EXTRA_PHONES ? (
        <button type="button" onClick={() => onChange([...value, ''])} className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 px-3 py-2 text-[13px] font-semibold text-primary hover:bg-primary-soft">
          <Icon name="plus" size={15} /> Add another contact number
        </button>
      ) : (
        <p className="mt-2 text-xs text-muted">You can add up to {MAX_EXTRA_PHONES} more numbers.</p>
      )}
    </div>
  );
}
