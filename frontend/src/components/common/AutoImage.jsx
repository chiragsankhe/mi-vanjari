import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn, thumb } from '../../lib/utils';
import { Img } from '../ui';

const CHANGE_MS = 3000;

/**
 * Card photo that changes by itself every 3 seconds when there is more than one photo (cross-fade).
 * Only runs while the card is on screen, and stays still for people who prefer reduced motion.
 * Fills its parent (the parent must be `relative` with a fixed height) — it never intercepts clicks, so it works inside links.
 */
export default function AutoImage({ photos = [], alt = '', fallbackIcon = 'image', className }) {
  const list = (photos || []).filter(Boolean);
  const n = list.length;
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (n < 2 || !visible || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // a little random delay so a whole grid of cards does not flip at the same moment
    const id = setTimeout(() => setI((x) => (x + 1) % n), CHANGE_MS + Math.random() * 600);
    return () => clearTimeout(id);
  }, [n, visible, i]);

  const current = list[i % Math.max(n, 1)];
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div key={current || 'none'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0">
          <Img src={thumb(current)} alt={alt} fallbackIcon={fallbackIcon} className={cn('size-full object-cover', className)} />
        </motion.div>
      </AnimatePresence>
      {n > 1 && (
        <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1" aria-hidden="true">
          {list.slice(0, 6).map((u, k) => (
            <span key={u} className={cn('h-1 rounded-full bg-white/80 shadow transition-all', k === i % n ? 'w-3' : 'w-1 opacity-60')} />
          ))}
        </span>
      )}
    </div>
  );
}
