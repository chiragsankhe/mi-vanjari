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
  const [open, setOpen] = useState(false);
  const photos = pkg.photos || [];
  const includes = pkg.includes || [];
  const message = `Namaskar! I'm interested in the "${pkg.name}" package (${formatINR(pkg.price)}) from ${provider.businessName} that I saw on Mi Vanjari.`;
  const hasMore = (pkg.description || '').length > 90 || includes.length > 4 || Boolean(pkg.details);
  const shown = open ? includes : includes.slice(0, 4);
  return (
    <article className="card p-2.5">
      <div className="flex gap-3">
        {photos.length > 0 && (
          <button type="button" onClick={() => setImg((i) => (i + 1) % photos.length)} className="relative size-[84px] shrink-0 overflow-hidden rounded-lg bg-sand sm:size-24" aria-label={photos.length > 1 ? 'Next photo' : pkg.name}>
            <Img src={photos[img]} alt={pkg.name} fallbackIcon={provider.category.icon} className="size-full object-cover" />
            {photos.length > 1 && <span className="absolute right-1 bottom-1 rounded-full bg-black/60 px-1.5 text-[9px] font-semibold text-white">{img + 1}/{photos.length}</span>}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-[14.5px] leading-snug font-semibold">{pkg.name}</h3>
            <b className="shrink-0 font-serif text-[15px] text-primary">{formatINR(pkg.price)}</b>
          </div>
          {pkg.duration && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
              <Icon name="calendar" size={11} /> {pkg.duration}
            </p>
          )}
          {pkg.description && <p className={cn('mt-1 text-[12.5px] leading-snug text-[#4b4641]', !open && 'line-clamp-2')}>{pkg.description}</p>}
        </div>
      </div>

      {includes.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {shown.map((x) => (
            <li key={x} className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[11px] text-[#4b4641]">
              <Icon name="check" size={11} className="text-leaf" /> {x}
            </li>
          ))}
          {!open && includes.length > 4 && <li className="rounded-full px-1.5 py-0.5 text-[11px] text-muted">+{includes.length - 4} more</li>}
        </ul>
      )}
      {open && pkg.details && <p className="mt-2 rounded-lg bg-sand px-2.5 py-1.5 text-[11.5px] leading-snug whitespace-pre-line text-[#5b534d]">{pkg.details}</p>}
      {hasMore && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1.5 text-[11.5px] font-semibold text-primary">
          {open ? 'Show less' : 'Show more'}
        </button>
      )}

      {provider.isOwner ? (
        <div className="mt-2 flex gap-2">
          <button type="button" className="btn btn-outline btn-sm h-8 flex-1 text-xs" onClick={() => onEdit(pkg)}>
            <Icon name="edit" size={14} /> Edit
          </button>
          <button type="button" className="btn btn-ghost btn-sm h-8 text-xs text-primary" onClick={() => onDelete(pkg)} aria-label={`Delete ${pkg.name}`}>
            <Icon name="trash" size={14} /> Delete
          </button>
        </div>
      ) : provider.isSample ? null : authed && provider.phone ? (
        <div className="mt-2 flex gap-2">
          <a href={telLink(provider.phone)} className="btn btn-primary btn-sm h-8 flex-1 text-xs">
            <Icon name="phone" size={14} /> Call
          </a>
          <a href={whatsappLink(provider.whatsapp || provider.phone, message)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm h-8 flex-1 text-xs">
            <Icon name="whatsapp" size={14} /> WhatsApp
          </a>
        </div>
      ) : (
        <button type="button" className="btn btn-outline btn-sm mt-2 h-8 w-full text-xs" onClick={onLogin}>
          <Icon name="lock" size={14} /> Log in to enquire
        </button>
      )}
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
      <div className="grid gap-2.5 xl:grid-cols-2">
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
