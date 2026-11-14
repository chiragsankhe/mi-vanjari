import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, inBatches, upload } from '../../lib/api';
import { cn, formatINR, telLink, whatsappLink } from '../../lib/utils';
import { ChatWithOwner } from '../chat/ChatWithOwner';
import AutoImage from './AutoImage';
import { Badge, Icon, Img, SampleNotice, SampleTag, Spinner } from '../ui';

export function Stars({ value = 0, size = 14, className }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-gold', className)} aria-label={`${value.toFixed?.(1) ?? value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} filled={i <= Math.round(value)} strokeWidth={1.5} />
      ))}
    </span>
  );
}

export function ProviderCard({ p }) {
  return (
    <Link to={`/services/provider/${p.id}`} className="group card card-hover block overflow-hidden p-2.5">
      <div className="relative h-44 overflow-hidden rounded-lg">
        <AutoImage photos={p.photos} alt={p.businessName} fallbackIcon={p.category?.icon || 'tent'} className="transition duration-700 group-hover:scale-105" />
        {p.priceFrom != null && <span className="absolute bottom-2.5 left-2.5 rounded-md bg-white px-2.5 py-1.5 text-[11px] font-bold">From {formatINR(p.priceFrom)}</span>}
        {p.isFeatured && (
          <Badge className="absolute top-2.5 left-2.5">
            <Icon name="star" size={11} filled /> Featured
          </Badge>
        )}
        {p.isSample && <SampleTag className="absolute top-2.5 right-2.5 bg-white" />}
      </div>
      <div className="p-2.5 pt-3.5">
        <span className="text-[10px] font-bold tracking-[0.1em] text-primary uppercase">{p.category?.name}</span>
        <h3 className="mt-1 font-serif text-[17px] font-semibold">{p.businessName}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <Icon name="map" size={13} /> {p.location}
        </p>
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          <Stars value={p.ratingAvg} size={13} />
          <b>{p.ratingAvg ? p.ratingAvg.toFixed(1) : 'New'}</b>
          {p.ratingCount > 0 && <span className="text-muted">({p.ratingCount})</span>}
          {!p.isSample && <ChatWithOwner type="SERVICE" id={p.id} ownerId={p.userId} variant="icon" className="ml-auto" />}
        </div>
      </div>
    </Link>
  );
}

/** Chat · Call · WhatsApp for a listing. `chat` = { type: 'BUSINESS'|'SERVICE', id, ownerId } */
export function ContactButtons({ phone, whatsapp, name, className, chat, sample = false }) {
  if (sample) return <SampleNotice className={className} />;
  return (
    <div className={cn('space-y-2', className)}>
      {chat && <ChatWithOwner {...chat} label="Chat with owner" className="w-full" />}
      <div className="flex gap-2">
      <a href={telLink(phone)} className={cn('btn flex-1', chat ? 'btn-outline' : 'btn-primary')}>
        <Icon name="phone" size={17} /> Call
      </a>
      <a href={whatsappLink(whatsapp || phone, `Namaskar! I found ${name} on Mi Vanjari.`)} target="_blank" rel="noreferrer" className="btn btn-outline flex-1">
        <Icon name="whatsapp" size={17} /> WhatsApp
      </a>
      </div>
    </div>
  );
}

/** Photo picker that uploads immediately and returns URLs. */
/** Listing photos (business, wedding services) — no limit on count or size; uploads a few at a time. */
export function PhotoUploader({ value = [], onChange, endpoint }) {
  const [progress, setProgress] = useState(null); // { done, total } while uploading
  const busy = Boolean(progress);
  const pick = async (files) => {
    const list = [...files];
    if (!list.length) return;
    let urls = [...value];
    setProgress({ done: 0, total: list.length });
    try {
      for (const batch of inBatches(list)) {
        const res = await upload(endpoint, batch);
        urls = [...urls, ...res.urls];
        onChange(urls); // show each batch as soon as it is ready
        setProgress((p) => ({ ...p, done: p.done + batch.length }));
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProgress(null);
    }
  };
  return (
    <div className="flex flex-wrap gap-3">
      {value.map((url) => (
        <motion.div key={url} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative size-24">
          <img src={url} alt="" className="size-full rounded-lg object-cover" />
          <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink text-white" aria-label="Remove photo">
            <Icon name="close" size={12} />
          </button>
        </motion.div>
      ))}
      <label className="grid size-24 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-line text-center text-muted transition hover:border-primary hover:text-primary">
        {busy ? (
          <span className="text-[11px]">
            <Spinner className="mx-auto mb-1" />
            {progress.done}/{progress.total}
          </span>
        ) : (
          <span className="text-[11px]">
            <Icon name="plus" size={24} className="mx-auto" />
            Add photos
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={busy}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = ''; // allow choosing the same file again
          }}
        />
      </label>
    </div>
  );
}
