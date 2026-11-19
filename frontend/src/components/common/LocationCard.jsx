import { useState } from 'react';
import { directionsLink, mapsEmbed, mapsLink } from '../../lib/utils';
import { Icon } from '../ui';

/** A tappable address: opens the place in Google Maps (new tab). */
export function MapAddress({ address, mapUrl, className = '' }) {
  if (!address) return null;
  return (
    <a href={mapsLink(address, mapUrl)} target="_blank" rel="noreferrer noopener" className={`group flex items-start gap-1.5 text-sm text-muted hover:text-primary ${className}`} title="Open in Google Maps">
      <Icon name="map" size={15} className="mt-0.5 shrink-0" />
      <span className="underline-offset-2 group-hover:underline">{address}</span>
    </a>
  );
}

/** The "Location" section of a listing: the address, a map, and one-tap Google Maps / Directions buttons. */
export function LocationCard({ address, mapUrl, title = 'Location' }) {
  const [showMap, setShowMap] = useState(false);
  if (!address) return null;
  return (
    <section className="card p-4 sm:p-6" aria-label={title}>
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-[#4b4641]">
        <Icon name="map" size={16} className="mt-0.5 shrink-0 text-primary" /> {address}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={mapsLink(address, mapUrl)} target="_blank" rel="noreferrer noopener" className="btn btn-primary btn-sm">
          <Icon name="map" size={15} /> Open in Google Maps
        </a>
        <a href={directionsLink(address)} target="_blank" rel="noreferrer noopener" className="btn btn-outline btn-sm">
          <Icon name="arrow" size={15} /> Get directions
        </a>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-sand">
        {showMap ? (
          <iframe title={`Map: ${address}`} src={mapsEmbed(address)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-56 w-full border-0 sm:h-64" />
        ) : (
          <button type="button" onClick={() => setShowMap(true)} className="grid h-24 w-full place-items-center text-sm font-semibold text-primary hover:bg-primary-soft">
            <span className="flex items-center gap-2">
              <Icon name="map" size={18} /> Show map here
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
