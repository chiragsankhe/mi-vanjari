import { Icon } from '../ui';

export const MAX_EXTRA_PHONES = 4;
export const tenDigits = (v) => String(v || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
export const isMobile = (v) => /^[6-9]\d{9}$/.test(tenDigits(v));

/** Entries are { name, phone } (a plain number is accepted too and treated as a number without a name). */
const asContact = (c) => (typeof c === 'string' ? { name: '', phone: c } : { name: c?.name || '', phone: c?.phone || '' });

/** Errors for a list of extra contacts: { [index]: message }. Rows with nothing in them are ignored. */
export function validateExtraPhones(list = []) {
  const errs = {};
  list.map(asContact).forEach((c, i) => {
    if (c.phone.trim() && !isMobile(c.phone)) errs[i] = 'Enter a valid 10-digit mobile number';
    else if (!c.phone.trim() && c.name.trim()) errs[i] = 'Add the phone number for this person';
  });
  return errs;
}

/** What to save: [{ name, phone }] — digits only, no empty rows, no repeat of the main number. */
export function cleanExtraContacts(list = [], main = '') {
  const seen = new Set([tenDigits(main)]);
  const out = [];
  for (const c of list.map(asContact)) {
    const phone = tenDigits(c.phone);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    out.push({ name: c.name.trim(), phone });
  }
  return out;
}

/**
 * "+ Add another contact number" — a business often has more than one phone, answered by different people.
 * Controlled: `value` is an array of { name, phone }, `onChange` gets the new array, `errors` is { [index]: message }.
 */
export function ExtraPhonesField({ value = [], onChange, errors = {}, label = 'More contact numbers' }) {
  const list = value.map(asContact);
  const set = (i, patch) => onChange(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i) => onChange(list.filter((_, j) => j !== i));
  return (
    <div className="sm:col-span-2">
      {list.length > 0 && <span className="field-label">{label}</span>}
      <div className="space-y-3">
        {list.map((c, i) => (
          <div key={i} className="rounded-xl border border-line bg-white p-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={60}
                value={c.name}
                onChange={(e) => set(i, { name: e.target.value })}
                placeholder="Person name, e.g. Ramesh (manager)"
                aria-label={`Name for contact number ${i + 2}`}
                className="field min-w-0 flex-1"
              />
              <button type="button" onClick={() => remove(i)} className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-sand hover:text-primary" aria-label={`Remove contact number ${i + 2}`}>
                <Icon name="trash" size={16} />
              </button>
            </div>
            <span className={`field mt-2 flex items-center gap-2 p-0 pl-3 ${errors[i] ? 'border-primary' : ''}`}>
              <span className="text-sm text-muted">+91</span>
              <input type="tel" inputMode="numeric" maxLength={14} value={c.phone} onChange={(e) => set(i, { phone: e.target.value })} placeholder="98765 43210" aria-label={`Contact number ${i + 2}`} className="h-full w-full bg-transparent py-2.5 pr-3 outline-none" />
            </span>
            {errors[i] && <span className="field-error">{errors[i]}</span>}
          </div>
        ))}
      </div>
      {list.length < MAX_EXTRA_PHONES ? (
        <button type="button" onClick={() => onChange([...list, { name: '', phone: '' }])} className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 px-3 py-2 text-[13px] font-semibold text-primary hover:bg-primary-soft">
          <Icon name="plus" size={15} /> Add another contact number
        </button>
      ) : (
        <p className="mt-2 text-xs text-muted">You can add up to {MAX_EXTRA_PHONES} more numbers.</p>
      )}
    </div>
  );
}
