import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { PhotoUploader } from '../../components/common/Listing';
import { Field, Icon, Img, Modal, Spinner } from '../../components/ui';
import { del, errorMessage, post, put } from '../../lib/api';
import { cn, formatINR, telLink, whatsappLink } from '../../lib/utils';

const EMPTY = { name: '', price: '', description: '', duration: '', details: '', includesText: '' };

/** Add / edit one package (provider only). Photos upload straight away; services included are one per line. */
function PackageEditor({ providerId, pkg, onClose }) {
  const qc = useQueryClient();
  const [v, setV] = useState(pkg ? { name: pkg.name, price: pkg.price, description: pkg.description || '', duration: pkg.duration || '', details: pkg.details || '', includesText: (pkg.includes || []).join('\n') } : EMPTY);
  const [photos, setPhotos] = useState(pkg?.photos || []);
  const [err, setErr] = useState({});
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: v.name,
        price: v.price,
        description: v.description,
        duration: v.duration,
        details: v.details,
        photos,
        includes: v.includesText.split('\n').map((x) => x.trim()).filter(Boolean),
      };
      return pkg ? put(`/services/packages/${pkg.id}`, body) : post(`/services/provider/${providerId}/packages`, body);
    },
    onSuccess: () => {
      toast.success(pkg ? 'Package updated' : 'Package added');
      qc.invalidateQueries({ queryKey: ['provider', providerId] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (v.name.trim().length < 2) next.name = 'Give the package a name';
    if (v.price === '' || Number(v.price) < 0 || Number.isNaN(Number(v.price))) next.price = 'Enter the price in ₹';
    setErr(next);
    if (!Object.keys(next).length) save.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
      <h3 className="font-serif text-xl font-semibold">{pkg ? 'Edit package' : 'Add a package'}</h3>
      <Field label="Package name *" placeholder="e.g. Bridal Makeup Package" value={v.name} onChange={set('name')} error={err.name} maxLength={100} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price (₹) *" type="number" inputMode="numeric" min="0" placeholder="e.g. 15000" value={v.price} onChange={set('price')} error={err.price} />
        <Field label="Duration (optional)" placeholder="e.g. 3 hours" value={v.duration} onChange={set('duration')} maxLength={60} />
      </div>
      <Field as="textarea" label="Description" rows={3} placeholder="What makes this package special?" value={v.description} onChange={set('description')} maxLength={1500} />
      <Field as="textarea" label="Services included" rows={4} placeholder={'One per line, e.g.\nHD makeup\nHairstyle\nSaree draping'} hint="Write each service on a new line." value={v.includesText} onChange={set('includesText')} />
      <Field as="textarea" label="Additional details (optional)" rows={2} placeholder="Travel charges, advance booking, trial makeup…" value={v.details} onChange={set('details')} maxLength={1500} />
      <div>
        <span className="field-label">Package photos</span>
        <PhotoUploader value={photos} onChange={setPhotos} endpoint="/services/upload" />
      </div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={save.isPending}>
          {save.isPending ? <Spinner size={16} /> : <><Icon name="check" size={17} /> {pkg ? 'Save package' : 'Add package'}</>}
        </button>
      </div>
    </form>
  );
}

function PackageCard({ pkg, provider, authed, onLogin, onEdit, onDelete }) {
  const [img, setImg] = useState(0);
  const photos = pkg.photos || [];
  const message = `Namaskar! I'm interested in the "${pkg.name}" package (${formatINR(pkg.price)}) from ${provider.businessName} that I saw on Mi Vanjari.`;
  return (
    <article className="card overflow-hidden p-2.5">
      {photos.length > 0 && (
        <div>
          <div className="aspect-[16/10] overflow-hidden rounded-lg bg-sand">
            <Img src={photos[img]} alt={pkg.name} fallbackIcon={provider.category.icon} className="size-full object-cover" />
          </div>
          {photos.length > 1 && (
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
              {photos.map((u, i) => (
                <button key={u} type="button" onClick={() => setImg(i)} className={cn('size-14 shrink-0 overflow-hidden rounded-md border-2', i === img ? 'border-primary' : 'border-transparent opacity-70')} aria-label={`Photo ${i + 1}`}>
                  <img src={u} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 className="font-serif text-lg leading-snug font-semibold">{pkg.name}</h3>
          <b className="font-serif text-xl text-primary">{formatINR(pkg.price)}</b>
        </div>
        {pkg.duration && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <Icon name="calendar" size={13} /> {pkg.duration}
          </p>
        )}
        {pkg.description && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-[#4b4641]">{pkg.description}</p>}
        {pkg.includes?.length > 0 && (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {pkg.includes.map((x) => (
              <li key={x} className="flex items-start gap-2 text-[13px]">
                <Icon name="check" size={15} className="mt-0.5 shrink-0 text-leaf" /> <span>{x}</span>
              </li>
            ))}
          </ul>
        )}
        {pkg.details && <p className="mt-3 rounded-lg bg-sand px-3 py-2 text-xs leading-relaxed whitespace-pre-line text-[#5b534d]">{pkg.details}</p>}

        {provider.isOwner ? (
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn btn-outline btn-sm flex-1" onClick={() => onEdit(pkg)}>
              <Icon name="edit" size={15} /> Edit
            </button>
            <button type="button" className="btn btn-ghost btn-sm text-primary" onClick={() => onDelete(pkg)} aria-label={`Delete ${pkg.name}`}>
              <Icon name="trash" size={15} /> Delete
            </button>
          </div>
        ) : provider.isSample ? null : authed && provider.phone ? (
          <div className="mt-4 flex gap-2">
            <a href={telLink(provider.phone)} className="btn btn-primary btn-sm flex-1">
              <Icon name="phone" size={16} /> Call
            </a>
            <a href={whatsappLink(provider.whatsapp || provider.phone, message)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm flex-1">
              <Icon name="whatsapp" size={16} /> WhatsApp
            </a>
          </div>
        ) : (
          <button type="button" className="btn btn-outline btn-sm mt-4 w-full" onClick={onLogin}>
            <Icon name="lock" size={15} /> Log in to enquire
          </button>
        )}
      </div>
    </article>
  );
}

/** Packages of a provider — visitors browse and enquire; the owner adds, edits and deletes. */
export default function PackagesSection({ provider, authed, onLogin }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // null | 'new' | package
  const packages = provider.servicePackages || [];
  const remove = useMutation({
    mutationFn: (pk) => del(`/services/packages/${pk.id}`),
    onSuccess: () => {
      toast.success('Package deleted');
      qc.invalidateQueries({ queryKey: ['provider', provider.id] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const confirmDelete = (pk) => {
    if (window.confirm(`Delete the package "${pk.name}"? This cannot be undone.`)) remove.mutate(pk);
  };

  if (!provider.isOwner && !packages.length) return null;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold">
          Packages <span className="text-sm font-normal text-muted">({packages.length})</span>
        </h2>
        {provider.isOwner && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} /> Add package
          </button>
        )}
      </div>
      {provider.isOwner && packages.length === 0 && (
        <div className="card p-5 text-sm text-[#4b4641]">
          <b>Add your packages.</b> Families love to compare — for example “Bridal Makeup Package”, “Engagement Package” or “Party Makeup Package”, each with its own price, photos and what is included.
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {packages.map((pk) => (
          <PackageCard key={pk.id} pkg={pk} provider={provider} authed={authed} onLogin={onLogin} onEdit={setEditing} onDelete={confirmDelete} />
        ))}
      </div>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} className="sm:w-[min(640px,100%)]" label="Package">
        {editing && <PackageEditor key={editing === 'new' ? 'new' : editing.id} providerId={provider.id} pkg={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      </Modal>
    </section>
  );
}
