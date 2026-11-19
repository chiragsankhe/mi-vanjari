import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, inBatches, upload } from '../../lib/api';
import { cn, formatINR, formatPhone, telLink, whatsappLink } from '../../lib/utils';
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
    <Link to={`/services/provider/${p.id}`} className="group card card-hover flex min-w-0 gap-3 overflow-hidden p-2 sm:block sm:p-2.5">
      <div className="relative h-[108px] w-[112px] shrink-0 overflow-hidden rounded-xl sm:h-44 sm:w-auto">
        <AutoImage photos={p.photos} alt={p.businessName} fallbackIcon={p.category?.icon || 'tent'} className="transition duration-700 group-hover:scale-105" />
        {p.priceFrom != null && <span className="absolute bottom-2.5 left-2.5 hidden rounded-md bg-white px-2.5 py-1.5 text-[11px] font-bold sm:block">From {formatINR(p.priceFrom)}</span>}
        {p.isFeatured && (
          <Badge className="absolute top-1.5 left-1.5 !px-1.5 !py-0.5 !text-[9px] sm:top-2.5 sm:left-2.5 sm:!px-2.5 sm:!py-1 sm:!text-[11px]">
            <Icon name="star" size={10} filled /> <span className="hidden sm:inline">Featured</span>
          </Badge>
        )}
        {p.isSample && <SampleTag className="absolute right-1.5 bottom-1.5 bg-white !px-1.5 !py-0 !text-[8px] sm:top-2.5 sm:right-2.5 sm:bottom-auto sm:!px-2 sm:!py-0.5 sm:!text-[10px]" />}
      </div>
      <div className="min-w-0 flex-1 py-0.5 sm:p-2.5 sm:pt-3.5">
        <span className="block truncate text-[10px] font-bold tracking-[0.08em] text-primary uppercase">{p.category?.name}</span>
        <h3 className="mt-0.5 line-clamp-2 font-serif text-[15px] leading-snug font-semibold sm:mt-1 sm:text-[17px]">{p.businessName}</h3>
        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-[#1f5d78] sm:text-xs">
          <Icon name="map" size={12} className="shrink-0 text-[#1f6f8b]" /> <span className="truncate">{p.location}</span>
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs sm:mt-2.5 sm:gap-2">
          <Stars value={p.ratingAvg} size={12} />
          <b>{p.ratingAvg ? p.ratingAvg.toFixed(1) : 'New'}</b>
          {p.ratingCount > 0 && <span className="text-muted">({p.ratingCount})</span>}
          {p.priceFrom != null && <b className="ml-auto text-[12px] text-ink sm:hidden">{formatINR(p.priceFrom)}<small className="font-normal text-muted"> onwards</small></b>}
          {!p.isSample && <ChatWithOwner type="SERVICE" id={p.id} ownerId={p.userId} variant="icon" className="ml-auto hidden sm:inline-flex" />}
        </div>
      </div>
    </Link>
  );
}

/** Chat · Call · WhatsApp for a listing. `chat` = { type: 'BUSINESS'|'SERVICE', id, ownerId } */
export function ContactButtons({ phone, contactName, extraContacts = [], whatsapp, name, className, chat, sample = false }) {
  if (sample) return <SampleNotice className={className} />;
  // every number with the name of the person who answers it (the name may be empty)
  const numbers = [{ phone, name: contactName }, ...extraContacts].filter((c) => c.phone);
  return (
    <div className={cn('space-y-2', className)}>
      {/* The number itself is always shown: "Call" only works on a phone, so on a computer people can read or copy it */}
      {numbers.length > 0 && (
        <div className="rounded-xl border border-line bg-[#fffaf5] px-2.5 py-1.5">
          <ul className="divide-y divide-line">
            {numbers.map((c) => (
              <PhoneRow key={c.phone} number={c.phone} person={c.name} />
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {chat ? <ChatWithOwner {...chat} label="Chat" className="w-full" /> : <span />}
        <a href={whatsappLink(whatsapp || phone, `Namaskar! I found ${name} on Mi Vanjari.`)} target="_blank" rel="noreferrer" className={cn('btn btn-outline min-h-10 !bg-[#f1faf4] !text-[#1f7a4d] !border-[#1f7a4d]/30', !chat && 'col-span-2')}>
          <Icon name="whatsapp" size={17} /> WhatsApp
        </a>
      </div>
    </div>
  );
}

/** One phone number: shown in full, with Call (opens the dialler on a phone) and Copy (for computers). */
export function PhoneRow({ number, person }) {
  const [copied, setCopied] = useState(false);
  const shown = formatPhone(number);
  const copy = async () => {
    const digits = String(number).replace(/\D/g, '').slice(-10);
    try {
      await navigator.clipboard.writeText(digits);
    } catch {
      // older browsers / blocked clipboard: fall back to a hidden text box
      const box = document.createElement('textarea');
      box.value = digits;
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.appendChild(box);
      box.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      box.remove();
    }
    setCopied(true);
    toast.success('Number copied');
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <span className="min-w-0">
        {person && <small className="block truncate text-[12px] font-medium text-muted">{person}</small>}
        <a href={telLink(number)} className="block truncate text-[15px] font-semibold tabular-nums hover:text-primary">
          {shown}
        </a>
      </span>
      <span className="flex shrink-0 gap-1.5">
        <button type="button" onClick={copy} className="btn btn-ghost btn-sm h-8 !px-2.5" aria-label={`Copy ${shown}`}>
          <Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? 'Copied' : 'Copy'}
        </button>
        <a href={telLink(number)} className="btn btn-primary btn-sm h-8 !px-3" aria-label={`Call ${shown}`}>
          <Icon name="phone" size={14} /> Call
        </a>
      </span>
    </li>
  );
}

/** Photo picker that uploads immediately and returns URLs. */
/** Listing photos (business, wedding services) — no limit on count or size; uploads a few at a time. */
export function PhotoUploader({ value = [], onChange, endpoint }) {
  const [progress, setProgress] = useState(null); // { done, total } while uploading
  const [drag, setDrag] = useState(null); // index being dragged (computers); phones use the arrow buttons
  const [over, setOver] = useState(null);
  const busy = Boolean(progress);
  const move = (from, to) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  };
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
    <div>
      {value.length > 1 && (
        <p className="mb-2 text-xs text-muted">
          <b className="text-ink">Arrange your photos:</b> drag a photo (computer) or tap the arrows. The first photo is the cover shown on the card.
        </p>
      )}
    <div className="flex flex-wrap gap-3">
      {value.map((url, i) => (
        <motion.div
          key={`${url}-${i}`}
          layout
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          draggable
          onDragStart={() => setDrag(i)}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(i);
          }}
          onDragLeave={() => setOver((o) => (o === i ? null : o))}
          onDrop={(e) => {
            e.preventDefault();
            if (drag != null) move(drag, i);
            setDrag(null);
            setOver(null);
          }}
          onDragEnd={() => (setDrag(null), setOver(null))}
          className={`relative size-24 cursor-grab overflow-hidden rounded-lg bg-sand ${drag === i ? 'opacity-40' : ''} ${over === i && drag !== i ? 'ring-2 ring-primary' : ''}`}
        >
          {/* the whole photo is shown, so you see what the card will show */}
          <img src={url} alt={`Photo ${i + 1}`} draggable={false} className="size-full object-contain" />
          {i === 0 && <span className="absolute top-1 left-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">Cover</span>}
          <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-ink/85 text-white" aria-label="Remove photo">
            <Icon name="close" size={12} />
          </button>
          {value.length > 1 && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1">
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} className="grid size-7 place-items-center rounded-full bg-white/90 text-ink disabled:opacity-30" aria-label={`Move photo ${i + 1} left`}>
                <Icon name="chevron-left" size={14} />
              </button>
              <button type="button" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} className="grid size-7 place-items-center rounded-full bg-white/90 text-ink disabled:opacity-30" aria-label={`Move photo ${i + 1} right`}>
                <Icon name="chevron-right" size={14} />
              </button>
            </div>
          )}
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
    </div>
  );
}
