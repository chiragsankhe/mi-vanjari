import { AnimatePresence, animate, motion, useInView } from 'motion/react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInView as useIOInView } from 'react-intersection-observer';
import { cn, initials } from '../../lib/utils';
import { Icon } from './Icon';

export { Icon };

// ── Motion helpers ───────────────────────────────────────────────────────────

export const ease = [0.22, 1, 0.36, 1];

/** Fade-and-rise when scrolled into view. */
export function Reveal({ children, delay = 0, y = 24, className, as = 'div', once = true }) {
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </Comp>
  );
}

/** Staggered children (wrap items in <StaggerItem>). */
export function Stagger({ children, className, delay = 0, gap = 0.07 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export const StaggerItem = forwardRef(function StaggerItem({ children, className, as = 'div', ...rest }, ref) {
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      ref={ref}
      className={className}
      variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } } }}
      {...rest}
    >
      {children}
    </Comp>
  );
});

/** Animated number counter. */
export function CountUp({ to = 0, duration = 1.6, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    // Keep halves (e.g. 24.5 gunas) — rounding to whole numbers would show the wrong score
    const step = Number.isInteger(to) ? 1 : 0.5;
    const controls = animate(0, to, { duration, ease, onUpdate: (v) => setVal(Math.round(v / step) * step) });
    return () => controls.stop();
  }, [inView, to, duration]);
  return (
    <span ref={ref} className={className}>
      {val.toLocaleString('en-IN')}
    </span>
  );
}

// ── Brand ────────────────────────────────────────────────────────────────────

export function BrandMark({ size = 42, inverse = false }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center bg-primary text-white"
      style={{
        width: size,
        height: size,
        borderRadius: '50% 50% 45% 45%',
        boxShadow: `inset 0 0 0 3px ${inverse ? '#241d18' : '#fff'}, inset 0 0 0 4px var(--color-gold)`,
      }}
    >
      <span className="heading-deva font-bold" style={{ fontSize: size * 0.45 }}>
        मि
      </span>
      <span
        className="absolute -bottom-[5px] border-[5px] border-t-[7px] border-transparent"
        style={{ borderTopColor: 'var(--color-primary)' }}
      />
    </span>
  );
}

/** Decorative diamond band from the design (animated marquee). */
export function WarliBand({ className }) {
  const items = Array.from({ length: 24 });
  return (
    <div className={cn('relative h-8 overflow-hidden bg-primary-dark md:h-9', className)} aria-hidden="true">
      <div className="flex h-full w-max animate-marquee items-center">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center">
            {items.map((_, i) => (
              <span key={i} className="flex items-center gap-2 px-6 opacity-75">
                <i className="block size-3 rotate-45 border border-[#f3c871]" />
                <b className="block size-[5px] rounded-full bg-[#f3c871]" />
                <i className="block size-3 rotate-45 border border-[#f3c871]" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Basics ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 20, className }) {
  return (
    <svg className={cn('animate-spin', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-primary">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4">
        <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>
          <BrandMark size={52} />
        </motion.div>
        <Spinner />
      </motion.div>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function VerifiedDot({ size = 16 }) {
  return (
    <span className="verified-dot" style={{ width: size, height: size }} title="Phone verified">
      <Icon name="check" size={size * 0.62} strokeWidth={3} />
    </span>
  );
}

const avatarTones = ['bg-primary-soft text-primary', 'bg-leaf-soft text-leaf', 'bg-gold-soft text-[#9c7000]', 'bg-[#e4eff4] text-[#315c75]', 'bg-[#eee7f4] text-[#6f4c7e]'];

export function Avatar({ src, name = '', size = 44, className, blur = false, ring = false }) {
  const [broken, setBroken] = useState(false);
  const tone = avatarTones[(name.charCodeAt(0) || 0) % avatarTones.length];
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold', tone, ring && 'ring-2 ring-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src && !broken ? (
        <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className={cn('size-full object-cover', blur && 'scale-110 blur-md')} />
      ) : (
        initials(name) || <Icon name="user" size={size * 0.5} />
      )}
    </span>
  );
}

export function Badge({ children, tone = 'gold', className }) {
  const tones = {
    gold: 'bg-[#fff5da] text-[#8c6100] border-[#e9c360]',
    green: 'bg-leaf-soft text-leaf border-leaf/20',
    red: 'bg-primary-soft text-primary border-primary/20',
    gray: 'bg-sand text-muted border-line',
    blue: 'bg-[#e4eff4] text-[#315c75] border-[#315c75]/20',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold', tones[tone], className)}>{children}</span>;
}

/** Marks sample content (added by the admin to show how the site looks). Never shown for real members. */
export function SampleTag({ className }) {
  return (
    <span title="A sample entry that shows how the site looks. Not a real member." className={cn('inline-flex shrink-0 items-center rounded-full border border-[#c9b8f0] bg-[#f1ebff] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#5b3fa0] uppercase', className)}>
      Sample
    </span>
  );
}

export function SampleNotice({ children, className }) {
  return (
    <p className={cn('rounded-lg border border-[#c9b8f0] bg-[#f1ebff] px-4 py-3 text-center text-xs leading-relaxed text-[#5b3fa0]', className)}>
      <b>Sample entry.</b> {children || 'It shows how this section looks and is not a real member, so contact is switched off.'}
    </p>
  );
}

export function EmptyState({ icon = 'star', title, children, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon name={icon} size={28} />
      </span>
      <h3 className="font-serif text-xl font-semibold">{title}</h3>
      {children && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState icon="info" title="Couldn’t load this" action={onRetry && <button className="btn btn-outline btn-sm" onClick={onRetry}>Try again</button>}>
      {error?.response?.data?.error?.message || 'Please check your connection and try again.'}
    </EmptyState>
  );
}

/** Page title band — matches the design's `.page-title` with circular title art. */
export function PageHeader({ eyebrow, title, subtitle, icon, children }) {
  return (
    <section className="lattice relative overflow-hidden border-b border-line bg-[linear-gradient(120deg,#f9eddd,#fff9ef)]">
      <div className="container-page relative flex min-h-[200px] items-center justify-between gap-6 py-10 md:min-h-[240px] md:py-12">
        <div className="max-w-2xl text-center md:text-left">
          {eyebrow && (
            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="eyebrow mb-3 justify-center md:justify-start">
              {eyebrow}
            </motion.p>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.05 }}
            className="heading-deva text-[30px] leading-tight font-semibold md:text-[42px]"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2 text-sm text-muted md:text-[15px]">
              {subtitle}
            </motion.p>
          )}
          {children && <div className="mt-5 flex flex-wrap justify-center gap-3 md:justify-start">{children}</div>}
        </div>
        {icon && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease }}
            className="relative hidden size-[110px] shrink-0 place-items-center rounded-full border border-primary/25 text-primary md:grid"
          >
            <span className="absolute inset-2 animate-spin-slow rounded-full border border-dashed border-primary/25" />
            <Icon name={icon} size={44} />
          </motion.div>
        )}
      </div>
    </section>
  );
}

export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full p-[3px] transition-colors', checked ? 'bg-primary' : 'bg-[#c9c0b7]')}
    >
      <motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={cn('block size-[18px] rounded-full bg-white shadow', checked && 'ml-auto')} />
    </button>
  );
}

/** Underlined tabs with a sliding indicator. */
export function Tabs({ tabs, value, onChange, className, id = 'tabs' }) {
  return (
    <div className={cn('no-scrollbar flex gap-6 overflow-x-auto border-b border-line', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn('relative shrink-0 py-3.5 text-[13px] whitespace-nowrap transition-colors', value === t.value ? 'font-bold text-primary' : 'text-muted hover:text-ink')}
        >
          {t.label}
          {t.count ? <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-white">{t.count}</span> : null}
          {value === t.value && <motion.span layoutId={`${id}-underline`} className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
        </button>
      ))}
    </div>
  );
}

/** Pill segmented control (design `.segment`). */
export function Segment({ options, value, onChange, className, id = 'seg' }) {
  return (
    <div className={cn('grid rounded-lg bg-[#f5eee6] p-[3px]', className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn('relative rounded-md px-3 py-2 text-xs transition-colors', value === o.value ? 'font-bold text-primary' : 'text-muted')}>
          {value === o.value && <motion.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-md bg-white shadow-[0_2px_6px_#d8cbbd]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * One bar, two handles: pick a min–max range (e.g. age 21–30).
 * value = [min, max]; format(v) renders a value for labels and screen readers.
 */
export function RangeSlider({ min, max, step = 1, value, onChange, label, format = String }) {
  const [lo, hi] = value;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  // When both handles sit at the far right, the min handle must be on top or it can never be dragged back
  const loOnTop = lo > max - (max - min) * 0.1;
  return (
    <div>
      <span className="field-label flex justify-between">
        {label}
        <span className="text-primary tabular-nums">
          {format(lo)} – {format(hi)}
        </span>
      </span>
      <div className="range-dual">
        <span className="track" />
        <span className="fill" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          aria-label={`Minimum ${label.toLowerCase()}`}
          aria-valuetext={format(lo)}
          style={{ zIndex: loOnTop ? 3 : 2 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          aria-label={`Maximum ${label.toLowerCase()}`}
          aria-valuetext={format(hi)}
          style={{ zIndex: 2 }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-[#9b9189]">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ── Form fields ──────────────────────────────────────────────────────────────

export const Field = forwardRef(function Field({ label, error, hint, className, as = 'input', children, ...props }, ref) {
  const Comp = as;
  return (
    <label className={cn('block', className)}>
      {label && <span className="field-label">{label}</span>}
      {as === 'select' ? (
        <select ref={ref} className="field appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236f675f%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_12px_center] bg-no-repeat pr-9" {...props}>
          {children}
        </select>
      ) : (
        <Comp ref={ref} className="field" {...props} />
      )}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
});

// ── Overlays ─────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, children, className, label = 'Dialog' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-end bg-[rgba(35,25,20,0.6)] backdrop-blur-[4px] sm:place-items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn('relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[#fffaf3] shadow-[0_30px_80px_rgba(0,0,0,0.3)] sm:w-[min(460px,100%)] sm:rounded-2xl', className)}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {onClose && (
              <button onClick={onClose} className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-white/85 text-[#7d726a] shadow-sm backdrop-blur hover:bg-sand" aria-label="Close">
                <Icon name="close" />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = 'Confirm', danger, loading }) {
  return (
    <Modal open={open} onClose={onClose} label={title}>
      <div className="p-7">
        <h2 className="pr-8 font-serif text-2xl font-semibold">{title}</h2>
        <div className="mt-3 text-sm leading-relaxed text-muted">{children}</div>
        <div className="mt-7 flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className={cn('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm} disabled={loading}>
            {loading && <Spinner size={16} />} {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Invisible sentinel that triggers `onVisible` (infinite scroll). */
export function LoadMoreSentinel({ onVisible, hasMore, loading }) {
  const { ref, inView } = useIOInView({ rootMargin: '400px' });
  useEffect(() => {
    if (inView && hasMore && !loading) onVisible();
  }, [inView, hasMore, loading, onVisible]);
  if (!hasMore) return null;
  return (
    <div ref={ref} className="flex justify-center py-8 text-primary">
      {loading && <Spinner />}
    </div>
  );
}

/** Image with graceful fallback. */
export function Img({ src, alt = '', className, fallbackIcon = 'image', ...rest }) {
  const [broken, setBroken] = useState(!src);
  useEffect(() => setBroken(!src), [src]);
  if (broken)
    return (
      <div className={cn('grid place-items-center bg-[linear-gradient(135deg,#f4eadc,#fbe7de)] text-primary/60', className)}>
        <Icon name={fallbackIcon} size={36} />
      </div>
    );
  return <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className={className} {...rest} />;
}
