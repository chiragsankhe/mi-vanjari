import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { cleanExtraPhones, ExtraPhonesField, validateExtraPhones } from '../../components/common/ExtraPhones';
import { PhotoUploader } from '../../components/common/Listing';
import { Field, Icon, PageHeader, Spinner } from '../../components/ui';
import { errorMessage, get, post, put } from '../../lib/api';
import { useAuth } from '../../store/auth';

const phone = z.string().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');
const schema = z.object({
  name: z.string().trim().min(2, 'Business name is required'),
  category: z.string().min(1, 'Choose a category'),
  description: z.string().max(1500).optional(),
  phone,
  whatsapp: phone.optional().or(z.literal('')),
  website: z.string().url('Enter a full URL starting with https://').optional().or(z.literal('')),
  location: z.string().trim().min(2, 'Location is required'),
});

export default function BusinessForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const myPhone = useAuth((s) => s.user?.phone?.slice(-10));
  const [photos, setPhotos] = useState([]);
  const [extra, setExtra] = useState([]);
  const [extraErrors, setExtraErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const cats = useQuery({ queryKey: ['business-categories'], queryFn: () => get('/business/categories'), staleTime: Infinity });
  const existing = useQuery({ queryKey: ['business', id], queryFn: () => get(`/business/${id}`), enabled: Boolean(id) });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { phone: myPhone || '', category: '' } });
  const e = form.formState.errors;

  useEffect(() => {
    const b = existing.data;
    if (!b) return;
    form.reset({ name: b.name, category: b.category, description: b.description || '', phone: b.phone.slice(-10), whatsapp: b.whatsapp?.slice(-10) || '', website: b.website || '', location: b.location });
    setPhotos(b.photos || []);
    setExtra((b.extraPhones || []).map((p) => p.slice(-10)));
  }, [existing.data, form]);

  const submit = form.handleSubmit(async (v) => {
    const errs = validateExtraPhones(extra);
    setExtraErrors(errs);
    if (Object.keys(errs).length) return toast.error('Please check the extra contact numbers');
    setSaving(true);
    try {
      const body = { ...v, whatsapp: v.whatsapp || null, website: v.website || null, photos, extraPhones: cleanExtraPhones(extra, v.phone) };
      const saved = id ? await put(`/business/${id}`, body) : await post('/business', body);
      qc.invalidateQueries({ queryKey: ['business'] });
      toast.success(id ? 'Business updated' : 'Your business is now listed 🎉');
      navigate(`/business/${saved.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <PageHeader eyebrow="Business directory" title={id ? 'व्यवसाय संपादित करा' : 'आपला व्यवसाय नोंदवा'} subtitle="Let the community discover and support your business." icon="briefcase" />
      <form onSubmit={submit} className="container-page max-w-3xl py-8">
        <div className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
          <Field label="Business name *" error={e.name?.message} {...form.register('name')} className="sm:col-span-2" />
          <Field as="select" label="Category *" error={e.category?.message} {...form.register('category')}>
            <option value="">Choose…</option>
            {cats.data?.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Field>
          <Field label="Location *" placeholder="e.g. Dahanu, Palghar" error={e.location?.message} {...form.register('location')} />
          <Field label="Phone *" inputMode="numeric" error={e.phone?.message} {...form.register('phone')} />
          <Field label="WhatsApp" inputMode="numeric" error={e.whatsapp?.message} {...form.register('whatsapp')} />
          <ExtraPhonesField value={extra} onChange={(v) => { setExtra(v); setExtraErrors({}); }} errors={extraErrors} />
          <Field label="Website" placeholder="https://" error={e.website?.message} {...form.register('website')} className="sm:col-span-2" />
          <Field as="textarea" label="Description" placeholder="Products, services, timings, specialities…" {...form.register('description')} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <span className="field-label">Photos — add as many as you like</span>
            <PhotoUploader value={photos} onChange={setPhotos} endpoint="/business/upload" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : <><Icon name="check" size={17} /> {id ? 'Save changes' : 'Publish listing'}</>}
          </button>
        </div>
      </form>
    </>
  );
}
