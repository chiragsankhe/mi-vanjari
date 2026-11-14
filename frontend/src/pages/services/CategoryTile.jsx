import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';
import { cn } from '../../lib/utils';

/** An Indian-wedding photo that shows at a glance what the category is (food, hall, music…). `pos` = where the picture is anchored when cropped. */
const L = (name) => `/img/services/${name}.webp`;
const IMAGES = {
  'wedding-halls': [L('wedding-halls'), 'center 60%'], // grand Indian wedding hall with mandap
  'dj-music': [L('dj-music'), 'center 60%'], // dhol-tasha team
  'pandit-rituals': [L('pandit-rituals'), 'center 50%'], // pandit performing a havan with the couple
  catering: [L('catering'), 'center'], // Indian thali
  photography: [L('photography'), 'center 30%'], // couple in traditional attire by a river
  decoration: [L('decoration'), 'center 35%'], // flower mandap
  makeup: [L('makeup'), 'center 35%'], // Indian bridal makeup
  'clothes-jewellery': [L('clothes-jewellery'), 'center 28%'], // bride in kundan jewellery
  transportation: [L('transportation'), 'center'], // decorated wedding buggy
  'invitations-printing': [L('invitations-printing'), 'center'], // traditional wedding card
  'planning-management': [L('planning-management'), 'center 55%'], // draped outdoor reception
  'other-services': [L('other-services'), 'center'], // henna hands with marigold
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
