import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { PhotoUploader } from '../../components/common/Listing';
import { Field, Icon, PageHeader, Spinner } from '../../components/ui';
import { errorMessage, get, post, put } from '../../lib/api';
import { useAuth } from '../../store/auth';

const phone = z.string().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');
const schema = z.object({
  businessName: z.string().trim().min(2, 'Name is required'),
  categoryId: z.string().min(1, 'Choose a category'),
  description: z.string().max(1500).optional(),
  phone,
  whatsapp: phone.optional().or(z.literal('')),
  location: z.string().trim().min(2, 'Location is required'),
  priceFrom: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
});

export default function ServiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const myPhone = useAuth((s) => s.user?.phone?.slice(-10));
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const cats = useQuery({ queryKey: ['service-categories'], queryFn: () => get('/services/categories') });
  const existing = useQuery({ queryKey: ['provider', id], queryFn: () => get(`/services/provider/${id}`), enabled: Boolean(id) });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { phone: myPhone || '', categoryId: '' } });
  const e = form.formState.errors;

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    form.reset({
      businessName: p.businessName,
      categoryId: p.category.id,
      description: p.description || '',
      phone: p.phone.slice(-10),
      whatsapp: p.whatsapp?.slice(-10) || '',
      location: p.location,
      priceFrom: p.priceFrom ?? '',
    });
    setPhotos(p.photos || []);
  }, [existing.data, form]);

  const submit = form.handleSubmit(async (v) => {
    setSaving(true);
    try {
      const body = { ...v, whatsapp: v.whatsapp || null, priceFrom: v.priceFrom === '' ? null : v.priceFrom, photos };
      const saved = id ? await put(`/services/${id}`, body) : await post('/services', body);
      qc.invalidateQueries({ queryKey: ['my-services'] });
      toast.success(saved.status === 'APPROVED' ? 'Listing saved' : 'Submitted! Your listing goes live after a quick review.');
      navigate(`/services/provider/${saved.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <PageHeader eyebrow="Wedding services" title={id ? 'सेवा संपादित करा' : 'आपली सेवा नोंदवा'} subtitle="Reach families planning weddings across the community. Listings are reviewed before going live." icon="tent" />
      <form onSubmit={submit} className="container-page max-w-3xl py-8">
        <div className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
          <Field label="Business name *" error={e.businessName?.message} {...form.register('businessName')} className="sm:col-span-2" />
          <Field as="select" label="Category *" error={e.categoryId?.message} {...form.register('categoryId')}>
            <option value="">Choose…</option>
            {cats.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Field>
          <Field label="Starting price (₹)" type="number" inputMode="numeric" placeholder="e.g. 25000" {...form.register('priceFrom')} />
          <Field label="Location served *" placeholder="e.g. Palghar, Boisar" error={e.location?.message} {...form.register('location')} className="sm:col-span-2" />
          <Field label="Phone *" inputMode="numeric" error={e.phone?.message} {...form.register('phone')} />
          <Field label="WhatsApp" inputMode="numeric" placeholder="Same as phone if empty" error={e.whatsapp?.message} {...form.register('whatsapp')} />
          <Field as="textarea" label="Description" placeholder="What do you offer? Experience, capacity, specialities…" {...form.register('description')} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <span className="field-label">Photos — add as many as you like</span>
            <PhotoUploader value={photos} onChange={setPhotos} endpoint="/services/upload" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : <><Icon name="check" size={17} /> {id ? 'Save changes' : 'Submit for review'}</>}
          </button>
        </div>
      </form>
    </>
  );
}
