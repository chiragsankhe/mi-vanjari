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
import { cn } from '../../lib/utils';
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

const NEW = '__new';

/** Category picker: all categories + "+ Add new category", and the subcategories of the chosen one (multi-select, can add new). */
function CategoryPicker({ form, cats, subIds, setSubIds }) {
  const qc = useQueryClient();
  const categoryId = form.watch('categoryId');
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = cats.find((c) => c.id === categoryId);
  const err = form.formState.errors.categoryId?.message;

  const refresh = () => qc.invalidateQueries({ queryKey: ['service-categories'] });
  const addCategory = async () => {
    if (newCat.trim().length < 2) return toast.error('Type the category name');
    setBusy(true);
    try {
      const c = await post('/services/categories', { name: newCat.trim() });
      await refresh();
      form.setValue('categoryId', c.id, { shouldValidate: true });
      setSubIds([]);
      setNewCat('');
      toast.success(c.existed ? `“${c.name}” already exists — selected it for you` : c.isApproved ? 'Category added' : 'New category added — it becomes visible to everyone when you publish your service');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const addSubcategory = async () => {
    if (newSub.trim().length < 2) return toast.error('Type the name');
    setBusy(true);
    try {
      const s = await post(`/services/categories/${categoryId}/subcategories`, { name: newSub.trim() });
      await refresh();
      setSubIds((ids) => (ids.includes(s.id) ? ids : [...ids, s.id]));
      setNewSub('');
      setAddingSub(false);
      toast.success(s.existed ? `“${s.name}” already exists — selected it for you` : s.isApproved ? 'Option added' : 'New option added — it becomes visible to everyone when you publish your service');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const toggle = (id) => setSubIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const sel = form.register('categoryId');

  return (
    <div className="space-y-4 sm:col-span-2">
      <Field
        as="select"
        label="Category *"
        error={err}
        {...sel}
        value={categoryId || ''}
        onChange={(e) => {
          sel.onChange(e);
          setSubIds([]);
          setAddingSub(false);
        }}
      >
        <option value="">Choose…</option>
        {cats.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.isApproved === false ? ' (awaiting approval)' : ''}
          </option>
        ))}
        <option value={NEW}>+ Add new category</option>
      </Field>

      {categoryId === NEW && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-white p-3">
          <span className="field-label">Name of the new category</span>
          <div className="flex gap-2">
            <input className="field" placeholder="e.g. Tent & Shamiyana" value={newCat} maxLength={60} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())} />
            <button type="button" className="btn btn-primary btn-sm shrink-0" disabled={busy} onClick={addCategory}>
              {busy ? <Spinner size={15} /> : 'Add'}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted">If a category with this name already exists, we pick it for you. New categories appear for other providers once you publish your service.</p>
        </div>
      )}

      {current && (
        <div>
          <span className="field-label">What exactly do you offer? (choose all that apply)</span>
          <div className="flex flex-wrap gap-2">
            {current.subcategories?.map((s) => {
              const on = subIds.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggle(s.id)} aria-pressed={on} className={cn('rounded-full border px-3 py-1.5 text-[13px] transition', on ? 'border-primary bg-primary text-white' : 'border-line bg-white text-[#4b4641] hover:border-primary')}>
                  {on && <Icon name="check" size={12} className="mr-1 inline" />}
                  {s.name}
                  {s.isApproved === false && <i className="ml-1 text-[10px] opacity-80">(new)</i>}
                </button>
              );
            })}
            {!addingSub && (
              <button type="button" onClick={() => setAddingSub(true)} className="rounded-full border border-dashed border-primary/50 px-3 py-1.5 text-[13px] font-semibold text-primary hover:bg-primary-soft">
                + Add new
              </button>
            )}
          </div>
          {addingSub && (
            <div className="mt-2 flex gap-2">
              <input autoFocus className="field" placeholder="Name of the service" value={newSub} maxLength={60} onChange={(e) => setNewSub(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubcategory())} />
              <button type="button" className="btn btn-primary btn-sm shrink-0" disabled={busy} onClick={addSubcategory}>
                {busy ? <Spinner size={15} /> : 'Add'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => setAddingSub(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ServiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const myPhone = useAuth((s) => s.user?.phone?.slice(-10));
  const [photos, setPhotos] = useState([]);
  const [subIds, setSubIds] = useState([]);
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
    setSubIds((p.subcategories || []).map((s) => s.id));
  }, [existing.data, form]);

  const submit = form.handleSubmit(async (v) => {
    setSaving(true);
    try {
      if (v.categoryId === NEW) throw new Error('Add the new category first (type its name and press Add)');
      const body = { ...v, whatsapp: v.whatsapp || null, priceFrom: v.priceFrom === '' ? null : v.priceFrom, photos, subcategoryIds: subIds };
      const saved = id ? await put(`/services/${id}`, body) : await post('/services', body);
      qc.invalidateQueries({ queryKey: ['my-services'] });
      toast.success(saved.status === 'APPROVED' ? 'Listing saved' : 'Submitted! Your listing is awaiting approval.');
      navigate(`/services/provider/${saved.id}`, { state: { justSaved: !id } });
    } catch (err) {
      toast.error(err instanceof Error && !err.response ? err.message : errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <PageHeader eyebrow="Wedding services" title={id ? 'सेवा संपादित करा' : 'आपली सेवा नोंदवा'} subtitle="Reach families planning weddings across the community. Your listing goes live as soon as you save it." icon="tent" />
      <form onSubmit={submit} className="container-page max-w-3xl py-8">
        <div className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
          <Field label="Business name *" error={e.businessName?.message} {...form.register('businessName')} className="sm:col-span-2" />
          <CategoryPicker form={form} cats={cats.data ?? []} subIds={subIds} setSubIds={setSubIds} />
          <Field label="Starting price (₹)" type="number" inputMode="numeric" placeholder="e.g. 25000" {...form.register('priceFrom')} />
          <Field label="Location served *" placeholder="e.g. Palghar, Boisar" error={e.location?.message} {...form.register('location')} />
          <Field label="Phone *" inputMode="numeric" error={e.phone?.message} {...form.register('phone')} />
          <Field label="WhatsApp" inputMode="numeric" placeholder="Same as phone if empty" error={e.whatsapp?.message} {...form.register('whatsapp')} />
          <Field as="textarea" label="Description" placeholder="What do you offer? Experience, capacity, specialities…" {...form.register('description')} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <span className="field-label">Photos — add as many as you like</span>
            <PhotoUploader value={photos} onChange={setPhotos} endpoint="/services/upload" />
          </div>
          <p className="rounded-lg bg-sand px-4 py-3 text-xs text-[#5b534d] sm:col-span-2">
            <b>Next:</b> after saving, add your <b>packages</b> (name, price, photos, what is included) on your listing page.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : <><Icon name="check" size={17} /> {id ? 'Save changes' : 'Publish my service'}</>}
          </button>
        </div>
      </form>
    </>
  );
}
