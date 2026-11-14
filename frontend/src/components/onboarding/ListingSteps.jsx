import { useQuery } from '@tanstack/react-query';
import { cleanExtraContacts, ExtraPhonesField, validateExtraPhones } from '../common/ExtraPhones';
import { PhotoUploader } from '../common/Listing';
import { get } from '../../lib/api';
import { Field } from '../ui';

/**
 * Sign-up steps for "Showcase my business" and "List my wedding services".
 * Controlled by the onboarding page (value / onChange / errors); validated with validateBusiness / validateService.
 */

const tenDigits = (v) => String(v || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
const isMobile = (v) => /^[6-9]\d{9}$/.test(tenDigits(v));

export const emptyBusiness = (base = {}) => ({ name: '', category: '', description: '', phone: tenDigits(base.phone), whatsapp: tenDigits(base.phone), contactName: '', extraPhones: [], location: base.city || '', website: '', photos: [] });
export const emptyService = (base = {}) => ({ businessName: '', categoryId: '', priceFrom: '', experienceYears: '', location: base.city || '', phone: tenDigits(base.phone), whatsapp: tenDigits(base.phone), description: '', photos: [] });

export function validateBusiness(b) {
  const e = {};
  if (b.name.trim().length < 2) e.name = 'Enter your business name';
  if (!b.category) e.category = 'Choose a category';
  if (b.description.trim().length < 10) e.description = 'Tell people what you do (at least 10 characters)';
  if (!isMobile(b.phone)) e.phone = 'Enter a valid 10-digit mobile number';
  if (b.whatsapp && !isMobile(b.whatsapp)) e.whatsapp = 'Enter a valid 10-digit number';
  const extra = validateExtraPhones(b.extraPhones || []);
  if (Object.keys(extra).length) e.extraPhones = extra;
  if (b.location.trim().length < 2) e.location = 'Enter the address or area';
  if (b.website && !/^https?:\/\/\S+\.\S+/.test(b.website.trim())) e.website = 'Start with https://';
  return e;
}

export function validateService(s) {
  const e = {};
  if (!s.categoryId) e.categoryId = 'Choose your service';
  if (s.businessName.trim().length < 2) e.businessName = 'Enter your brand / business name';
  if (s.priceFrom === '' || Number(s.priceFrom) < 0) e.priceFrom = 'Enter a starting price';
  if (s.location.trim().length < 2) e.location = 'Which areas do you serve?';
  if (!isMobile(s.phone)) e.phone = 'Enter a valid 10-digit mobile number';
  if (s.whatsapp && !isMobile(s.whatsapp)) e.whatsapp = 'Enter a valid 10-digit number';
  if (s.experienceYears !== '' && (Number(s.experienceYears) < 0 || Number(s.experienceYears) > 80)) e.experienceYears = 'Enter years between 0 and 80';
  return e;
}

export const toBusinessPayload = (b) => ({
  name: b.name.trim(),
  category: b.category,
  description: b.description.trim(),
  phone: tenDigits(b.phone),
  contactName: (b.contactName || '').trim() || null,
  extraContacts: cleanExtraContacts(b.extraPhones || [], b.phone),
  whatsapp: b.whatsapp ? tenDigits(b.whatsapp) : null,
  location: b.location.trim(),
  website: b.website.trim() || null,
  photos: b.photos,
});

export const toServicePayload = (s) => ({
  businessName: s.businessName.trim(),
  categoryId: s.categoryId,
  priceFrom: Number(s.priceFrom),
  experienceYears: s.experienceYears === '' ? null : Number(s.experienceYears),
  location: s.location.trim(),
  phone: tenDigits(s.phone),
  whatsapp: s.whatsapp ? tenDigits(s.whatsapp) : null,
  description: s.description.trim() || null,
  photos: s.photos,
});

function PhoneField({ label, value, onChange, error }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <span className={`field flex items-center gap-2 p-0 pl-3 ${error ? 'border-primary' : ''}`}>
        <span className="text-sm text-muted">+91</span>
        <input type="tel" inputMode="numeric" maxLength={14} value={value} onChange={(e) => onChange(e.target.value)} placeholder="98765 43210" className="h-full w-full bg-transparent py-2.5 pr-3 outline-none" />
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function BusinessStep({ value: b, onChange, errors = {} }) {
  const cats = useQuery({ queryKey: ['business-categories'], queryFn: () => get('/business/categories'), staleTime: Infinity });
  const set = (k) => (e) => onChange({ ...b, [k]: e?.target ? e.target.value : e });
  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold">Your business</h2>
      <p className="mt-1 mb-5 text-sm text-muted">It appears in the Mi Vanjari business directory so the community can find and support you. Free.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name *" placeholder="e.g. Sankhe Dairy Farm" value={b.name} onChange={set('name')} error={errors.name} />
        <Field as="select" label="Category *" value={b.category} onChange={set('category')} error={errors.category}>
          <option value="">Choose…</option>
          {(cats.data || []).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Field>
        <Field as="textarea" label="What do you do? *" placeholder="Products or services, since when, what makes you special…" maxLength={1500} value={b.description} onChange={set('description')} error={errors.description} className="sm:col-span-2" />
        <PhoneField label="Business phone *" value={b.phone} onChange={set('phone')} error={errors.phone} />
        <Field label="Person name for this number" placeholder="e.g. Ramesh Sankhe (owner)" maxLength={60} value={b.contactName || ''} onChange={set('contactName')} />
        <PhoneField label="WhatsApp" value={b.whatsapp} onChange={set('whatsapp')} error={errors.whatsapp} />
        <ExtraPhonesField value={b.extraPhones || []} onChange={set('extraPhones')} errors={errors.extraPhones || {}} />
        <Field label="Address / area *" placeholder="e.g. Tarapur MIDC, Boisar" value={b.location} onChange={set('location')} error={errors.location} />
        <Field label="Website or Instagram (optional)" placeholder="https://…" value={b.website} onChange={set('website')} error={errors.website} />
        <div className="sm:col-span-2">
          <span className="field-label">Photos (optional) — shop, products, logo · add as many as you like</span>
          <PhotoUploader value={b.photos} onChange={set('photos')} endpoint="/business/upload" />
        </div>
      </div>
    </div>
  );
}

export function ServiceStep({ value: s, onChange, errors = {} }) {
  const cats = useQuery({ queryKey: ['service-categories'], queryFn: () => get('/services/categories') });
  const set = (k) => (e) => onChange({ ...s, [k]: e?.target ? e.target.value : e });
  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold">Your wedding service</h2>
      <p className="mt-1 mb-5 text-sm text-muted">Families planning weddings will find you on the Services page. Our team checks new listings before they go live (usually within 48 hours). Free.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="field-label">Service type *</span>
          <div className="flex flex-wrap gap-1.5">
            {(cats.data || []).map((c) => (
              <button key={c.id} type="button" onClick={() => onChange({ ...s, categoryId: c.id })} className={`chip ${s.categoryId === c.id ? 'chip-on' : ''}`}>
                {c.name} <span className="heading-deva ml-1 text-[11px] opacity-70">{c.nameMr}</span>
              </button>
            ))}
          </div>
          {errors.categoryId && <span className="field-error">{errors.categoryId}</span>}
        </div>
        <Field label="Brand / business name *" placeholder="e.g. Pimple Photography" value={s.businessName} onChange={set('businessName')} error={errors.businessName} />
        <Field label="Starting price (₹) *" type="number" inputMode="numeric" min={0} placeholder="e.g. 25000" value={s.priceFrom} onChange={set('priceFrom')} error={errors.priceFrom} />
        <Field label="Areas you serve *" placeholder="e.g. Palghar, Boisar, Dahanu" value={s.location} onChange={set('location')} error={errors.location} />
        <Field label="Years of experience" type="number" inputMode="numeric" min={0} max={80} placeholder="e.g. 5" value={s.experienceYears} onChange={set('experienceYears')} error={errors.experienceYears} />
        <PhoneField label="Booking phone *" value={s.phone} onChange={set('phone')} error={errors.phone} />
        <PhoneField label="WhatsApp" value={s.whatsapp} onChange={set('whatsapp')} error={errors.whatsapp} />
        <Field as="textarea" label="About your service" placeholder="What's included, packages, specialities…" maxLength={1500} value={s.description} onChange={set('description')} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <span className="field-label">Portfolio photos (optional) — add as many as you like</span>
          <PhotoUploader value={s.photos} onChange={set('photos')} endpoint="/services/upload" />
        </div>
      </div>
    </div>
  );
}
