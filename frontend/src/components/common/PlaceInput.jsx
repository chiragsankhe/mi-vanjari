import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { useDebounce } from '../../hooks';
import { get } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Icon, Spinner } from '../ui';

/**
 * Place search for the whole of India (village / taluka level). Type 2+ letters → pick from the list.
 * A place you pick carries exact coordinates and time zone; anything you type without picking is still
 * accepted (the server looks it up).  onChange(text, place | null)
 */
export function PlaceInput({ label = 'Place of birth', value, onChange, placeholder = 'Village, town or city — e.g. Varangaon', hint, className, required }) {
  const id = useId();
  const box = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState(false); // the current text came from a suggestion
  const q = useDebounce(value?.trim() || '', 250);
  const enabled = open && q.length >= 2 && !picked;
  const { data = [], isFetching } = useQuery({ queryKey: ['places', q.toLowerCase()], queryFn: () => get('/astrology/places', { q }), enabled, staleTime: 3600_000 });

  useEffect(() => {
    const close = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  useEffect(() => setActive(-1), [q]);

  const choose = (p) => {
    setPicked(true);
    setOpen(false);
    onChange(p.label, p);
  };
  const onKey = (e) => {
    if (!open || !data.length) return;
    if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, data.length - 1)));
    else if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
    else if (e.key === 'Enter' && active >= 0) (e.preventDefault(), choose(data[active]));
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className={cn('relative block', className)} ref={box}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && ' *'}
      </label>
      <div className="relative">
        <Icon name="map" size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input
          id={id}
          className="field pl-10"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open && data.length > 0}
          aria-controls={`${id}-list`}
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => {
            setPicked(false);
            setOpen(true);
            onChange(e.target.value, null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
        />
        {isFetching && <Spinner size={15} className="absolute top-1/2 right-3.5 -translate-y-1/2 text-primary" />}
      </div>
      {open && q.length >= 2 && !picked && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-[min(320px,45vh)] w-full overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-[var(--shadow-lift)]"
        >
          {data.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault() /* keep focus so the tap registers on phones */}
                onClick={() => choose(p)}
                onMouseEnter={() => setActive(i)}
                className={cn('flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition', i === active ? 'bg-primary-soft' : 'hover:bg-sand')}
              >
                <Icon name="map" size={15} className="mt-0.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <b className="block truncate text-sm">{p.name}</b>
                  <small className="block truncate text-xs text-muted">{[p.taluka !== p.name && p.taluka, p.district, p.state, p.country !== 'India' && p.country].filter(Boolean).join(' · ') || 'India'}</small>
                </span>
              </button>
            </li>
          ))}
          {!isFetching && data.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted">No exact match. You can keep what you typed. We’ll use the nearest place we find.</li>
          )}
        </ul>
      )}
      {hint && <small className="mt-1 block text-[11px] text-muted">{hint}</small>}
    </div>
  );
}
