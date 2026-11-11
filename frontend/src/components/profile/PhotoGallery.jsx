import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { Icon, Img } from '../ui';

const AUTOPLAY_MS = 3000;
const SWIPE_PX = 50;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Viewer-name watermark over photos (privacy deterrence). */
export function Watermark({ text, className }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 grid grid-cols-2 place-items-center overflow-hidden opacity-[0.16] select-none', className)} aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="-rotate-[28deg] text-[11px] font-bold tracking-widest whitespace-nowrap text-white">
          {text}
        </span>
      ))}
    </div>
  );
}

/** Horizontal swipe on any element (pointer events — works with mouse and touch). */
function useSwipe(onLeft, onRight) {
  const start = useRef(null);
  const moved = useRef(false);
  return {
    moved,
    handlers: {
      onPointerDown: (e) => {
        start.current = { x: e.clientX, y: e.clientY };
        moved.current = false;
      },
      onPointerMove: (e) => {
        if (start.current && Math.abs(e.clientX - start.current.x) > 8) moved.current = true;
      },
      onPointerUp: (e) => {
        if (!start.current) return;
        const dx = e.clientX - start.current.x;
        const dy = e.clientY - start.current.y;
        start.current = null;
        // some devices send no move events during a quick flick — judge by the total distance too
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved.current = true;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? onLeft : onRight)();
      },
      onPointerCancel: () => (start.current = null),
    },
  };
}

/** Full-screen photo viewer: arrows, swipe, keyboard (← → Esc), counter and thumbnails. */
function Lightbox({ photos, index, setIndex, onClose, alt, watermark }) {
  const n = photos.length;
  const next = useCallback(() => setIndex((i) => (i + 1) % n), [n, setIndex]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + n) % n), [n, setIndex]);
  const [dir, setDir] = useState(1);
  const go = (d) => {
    setDir(d);
    d > 0 ? next() : prev();
  };
  const { handlers, moved } = useSwipe(
    () => go(1),
    () => go(-1),
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') (setDir(1), next());
      if (e.key === 'ArrowLeft') (setDir(-1), prev());
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [next, prev, onClose]);

  return createPortal(
    <motion.div
      className="protected privacy-portal fixed inset-0 z-[120] flex flex-col bg-[rgba(12,6,3,0.96)] text-white select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — photo ${index + 1} of ${n}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tabular-nums">
          {index + 1} / {n}
        </span>
        <span className="hidden truncate px-4 text-sm text-white/70 sm:block">{alt}</span>
        <button onClick={onClose} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close photos">
          <Icon name="close" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden px-2 sm:px-16" {...handlers} onClick={(e) => e.target === e.currentTarget && !moved.current && onClose()}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            custom={dir}
            variants={{ enter: (d) => ({ x: d * 80, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d) => ({ x: d * -80, opacity: 0 }) }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-full"
          >
            <img src={photos[index]?.url} alt={`${alt} — photo ${index + 1}`} draggable={false} className="max-h-[calc(100dvh-190px)] max-w-full rounded-lg object-contain shadow-2xl sm:max-h-[calc(100dvh-170px)]" />
            {watermark && <Watermark text={watermark} className="rounded-lg" />}
          </motion.div>
        </AnimatePresence>
        {n > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-2 hidden size-12 place-items-center rounded-full bg-white/10 hover:bg-white/25 sm:grid sm:left-4" aria-label="Previous photo">
              <Icon name="chevron-left" size={26} />
            </button>
            <button onClick={() => go(1)} className="absolute right-2 hidden size-12 place-items-center rounded-full bg-white/10 hover:bg-white/25 sm:grid sm:right-4" aria-label="Next photo">
              <Icon name="chevron-right" size={26} />
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4">
          {photos.map((ph, i) => (
            <button
              key={ph.id || i}
              onClick={() => (setDir(i > index ? 1 : -1), setIndex(i))}
              className={cn('size-14 shrink-0 overflow-hidden rounded-md border-2 transition first:ml-auto last:mr-auto sm:size-16', i === index ? 'border-[#f1bf76] opacity-100' : 'border-transparent opacity-50 hover:opacity-80')}
              aria-label={`Show photo ${i + 1}`}
            >
              <img src={ph.url} alt="" draggable={false} className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <p className="pb-3 text-center text-[11px] text-white/45 sm:hidden">Swipe left or right · tap outside to close</p>
    </motion.div>,
    document.body,
  );
}

/**
 * Profile photo carousel.
 *  • Shows "2 / 4" and story-style progress bars when there are several photos
 *  • Auto-advances every 3 s; pauses on hover, keyboard focus, touch, and while the viewer is open
 *  • Swipe or arrows to change; click opens the full-screen viewer
 */
export function PhotoGallery({ photos, locked, alt, watermark, children }) {
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [cycle, setCycle] = useState(0); // restarts the progress bar
  const n = photos.length;
  const multi = n > 1 && !locked;
  const paused = hover || open || reducedMotion();

  const goTo = useCallback(
    (i) => {
      setIndex(((i % n) + n) % n);
      setCycle((c) => c + 1);
    },
    [n],
  );

  useEffect(() => {
    if (!multi || paused) return;
    const t = setTimeout(() => goTo(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [multi, paused, index, cycle, goTo]);

  useEffect(() => {
    if (index >= n) setIndex(0);
  }, [n, index]);

  const { handlers, moved } = useSwipe(
    () => multi && goTo(index + 1),
    () => multi && goTo(index - 1),
  );

  return (
    <>
      <div
        className={cn('group relative aspect-[4/5] touch-pan-y overflow-hidden rounded-lg bg-sand', !locked && 'cursor-zoom-in')}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        onTouchStart={() => setHover(true)}
        onTouchEnd={() => setTimeout(() => setHover(false), 2500)}
        {...handlers}
        onClick={() => !locked && !moved.current && setOpen(true)}
        role={locked ? undefined : 'button'}
        tabIndex={locked ? undefined : 0}
        onKeyDown={(e) => {
          if (locked) return;
          if (e.key === 'Enter' || e.key === ' ') (e.preventDefault(), setOpen(true));
          if (e.key === 'ArrowRight' && multi) goTo(index + 1);
          if (e.key === 'ArrowLeft' && multi) goTo(index - 1);
        }}
        aria-label={locked ? undefined : `${alt} — photo ${index + 1} of ${n}. Open full screen`}
      >
        <AnimatePresence initial={false}>
          <motion.div key={index} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0">
            <Img src={photos[index]?.url} alt={alt} fallbackIcon="user" className="size-full object-cover object-top" />
          </motion.div>
        </AnimatePresence>
        {watermark && <Watermark text={watermark} />}

        {multi && (
          <>
            {/* story-style progress bars */}
            <div className="absolute inset-x-3 top-2 z-10 flex gap-1">
              {photos.map((_, i) => (
                <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                  {i < index && <span className="block h-full w-full bg-white" />}
                  {i === index && (
                    <motion.span
                      key={`${index}-${cycle}-${paused}`}
                      className="block h-full bg-white"
                      initial={{ width: paused ? '100%' : '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: paused ? 0 : AUTOPLAY_MS / 1000, ease: 'linear' }}
                    />
                  )}
                </span>
              ))}
            </div>
            {/* arrows (visible on hover / always on touch screens) */}
            <button
              onClick={(e) => (e.stopPropagation(), goTo(index - 1))}
              className="absolute top-1/2 left-2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white opacity-100 backdrop-blur transition hover:bg-black/55 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Previous photo"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              onClick={(e) => (e.stopPropagation(), goTo(index + 1))}
              className="absolute top-1/2 right-2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white opacity-100 backdrop-blur transition hover:bg-black/55 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Next photo"
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </>
        )}

        {/* photo count */}
        {!locked && n > 0 && photos[0]?.url && (
          <span className="absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <Icon name="camera" size={13} /> {multi ? `${index + 1} / ${n}` : '1 photo'}
            {hover && multi && <span className="ml-1 text-[10px] font-normal text-white/75">· paused</span>}
          </span>
        )}
        {children}
      </div>

      {multi && (
        <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
          {photos.map((ph, i) => (
            <button
              key={ph.id || i}
              onClick={() => goTo(i)}
              className={cn('relative size-14 shrink-0 overflow-hidden rounded-md border-2 transition', i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100')}
              aria-label={`Show photo ${i + 1}`}
            >
              <img src={ph.url} alt="" className="size-full object-cover" />
            </button>
          ))}
          <span className="ml-auto self-center pl-2 text-[11px] whitespace-nowrap text-muted">{n} photos</span>
        </div>
      )}

      <AnimatePresence>{open && <Lightbox photos={photos} index={index} setIndex={(f) => setIndex(f)} onClose={() => setOpen(false)} alt={alt} watermark={watermark} />}</AnimatePresence>
    </>
  );
}
