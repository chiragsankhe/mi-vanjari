import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';
import { cn } from '../../lib/utils';

const u = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=70`;

/** An Indian-wedding photo that shows at a glance what the category is (food, hall, music…). `pos` = where the picture is anchored when cropped. */
const IMAGES = {
  'wedding-halls': [u('1587271407850-8d438ca9fdf2'), 'center 60%'], // grand Indian wedding hall with mandap
  'dj-music': [u('1774438357438-d3f5e0ef9c46'), 'center 60%'], // dhol-tasha team in orange kurtas
  'pandit-rituals': ['/img/services/pandit-rituals.webp', 'center 50%'], // pandit performing a havan with the couple
  catering: [u('1742281258189-3b933879867a'), 'center'], // Indian thali
  photography: [u('1630526720753-aa4e71acf67d'), 'center 30%'], // couple in traditional attire by a river
  decoration: [u('1587271636175-90d58cdad458'), 'center 35%'], // flower mandap
  makeup: [u('1610173827043-9db50e0d8ef9'), 'center 35%'], // Indian bridal makeup
  'clothes-jewellery': ['/img/services/clothes-jewellery.webp', 'center 28%'], // bride in kundan jewellery and red lehenga
  transportation: [u('1665398417651-a7d10040b26c'), 'center'], // decorated wedding buggy with white horses
  'invitations-printing': [u('1740511349064-bc118321de0c'), 'center'], // traditional wedding card with bangles
  'planning-management': [u('1772127822525-7eda37383b9f'), 'center 55%'], // draped outdoor wedding reception set-up
  'other-services': [u('1771992226177-759e116e72f4'), 'center'], // henna hands with marigold
};

/**
 * Category card with a photo background: icon on top, name at the bottom over a dark gradient so the text is always readable.
 * Categories without a photo (e.g. new ones added by providers) fall back to a warm gradient.
 */
export default function CategoryTile({ c, index, className }) {
  const [image, pos = 'center'] = IMAGES[c.slug] || [];
  const [failed, setFailed] = useState(false);
  return (
    <Link
      to={`/services/category/${c.slug}`}
      className={cn('group relative isolate block overflow-hidden rounded-xl bg-gradient-to-br from-primary-dark to-primary text-white shadow-[var(--shadow-card)]', className)}
      aria-label={`${c.name}${c.providerCount ? `, ${c.providerCount} listed` : ''}`}
    >
      {image && !failed && (
        <img src={image} alt="" loading="lazy" onError={() => setFailed(true)} style={{ objectPosition: pos }} className="absolute inset-0 -z-10 size-full object-cover transition duration-700 group-hover:scale-110" />
      )}
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-black/15" />

      <div className="flex h-full flex-col justify-between p-3 md:p-4">
        <div className="flex items-start justify-between">
          <motion.span whileHover={{ rotate: -8, scale: 1.1 }} className="grid size-9 place-items-center rounded-full bg-white/90 text-primary shadow-sm md:size-10">
            <Icon name={c.icon} size={19} />
          </motion.span>
          {index != null && <span className="font-serif text-[12px] text-white/70 italic">{String(index + 1).padStart(2, '0')}</span>}
        </div>
        <div>
          <b className="block font-serif text-[14.5px] leading-snug font-semibold [text-shadow:0_1px_6px_rgba(0,0,0,0.5)] md:text-[17px]">{c.name}</b>
          <small className="heading-deva mt-0.5 line-clamp-1 block text-[11px] text-white/85 md:text-xs">{c.nameMr}</small>
          <span className="mt-1.5 flex items-center justify-between text-[10.5px] text-white/80">
            <span className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">{c.providerCount ? `${c.providerCount} listed` : 'View services'}</span>
            <span className="grid size-6 place-items-center rounded-full bg-white/20 transition group-hover:translate-x-0.5 group-hover:bg-white group-hover:text-primary">
              <Icon name="arrow" size={13} />
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
