import { useState } from 'react';
import { directionsLink, mapsEmbed, mapsLink } from '../../lib/utils';
import { Icon } from '../ui';

/* Location always uses its own blue-teal colour, so it is easy to spot among the warm red/orange sections. */
const TEAL = '#1f6f8b';

/** A tappable address: opens the place in Google Maps (new tab). */
export function MapAddress({ address, mapUrl, className = '' }) {
  if (!address) return null;
  return (
    <a href={mapsLink(address, mapUrl)} target="_blank" rel="noreferrer noopener" className={`group flex items-start gap-2 rounded-xl bg-[#e8f3f7] px-2.5 py-2 text-[13px] leading-snug text-[#1f5d78] transition hover:bg-[#d9ecf3] ${className}`} title="Open in Google Maps">
      <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full text-white" style={{ background: TEAL }}>
        <Icon name="map" size={13} />
      </span>
      <span className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{address}</span>
      <span className="mt-0.5 shrink-0 text-[11px] font-semibold underline-offset-2 group-hover:underline">Map ›</span>
    </a>
  );
}

/** The "Location" section of a listing: the address, a map, and one-tap Google Maps / Directions buttons. */
export function LocationCard({ address, mapUrl, title = 'Location' }) {
  const [showMap, setShowMap] = useState(false);
  if (!address) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-[#b9dbe8] bg-[#f3fafc] shadow-[0_4px_18px_rgba(31,111,139,0.08)]" aria-label={title}>
      <div className="flex items-center gap-2.5 border-b border-[#cfe6ef] bg-[#e1f1f7] px-4 py-2.5">
        <span className="grid size-8 place-items-center rounded-xl text-white" style={{ background: TEAL }}>
          <Icon name="map" size={17} />
        </span>
        <h2 className="font-serif text-[17px] font-semibold text-[#17506a]">{title}</h2>
      </div>
      <div className="p-4">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-[#2c4651]">
          <Icon name="map" size={16} className="mt-0.5 shrink-0" style={{ color: TEAL }} />
          <span className="[overflow-wrap:anywhere]">{address}</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={mapsLink(address, mapUrl)} target="_blank" rel="noreferrer noopener" className="btn btn-sm min-h-10 !border-0 !text-white shadow-[0_6px_16px_rgba(31,111,139,0.25)] hover:!brightness-110" style={{ background: TEAL }}>
            <Icon name="map" size={15} /> Open in Maps
          </a>
          <a href={directionsLink(address)} target="_blank" rel="noreferrer noopener" className="btn btn-sm min-h-10 !border-[#1f6f8b]/40 !bg-white !text-[#17506a] hover:!bg-[#e8f3f7]">
            <Icon name="arrow" size={15} /> Directions
          </a>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-[#cfe6ef] bg-white">
          {showMap ? (
            <iframe title={`Map: ${address}`} src={mapsEmbed(address)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-52 w-full border-0 sm:h-64" />
          ) : (
            <button type="button" onClick={() => setShowMap(true)} className="grid h-14 w-full place-items-center text-sm font-semibold hover:bg-[#e8f3f7]" style={{ color: TEAL }}>
              <span className="flex items-center gap-2">
                <Icon name="map" size={18} /> Show map here
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
