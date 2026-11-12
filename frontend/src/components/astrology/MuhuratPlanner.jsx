import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { get } from '../../lib/api';
import { cn } from '../../lib/utils';
import { PlaceInput } from '../common/PlaceInput';
import { Icon, Segment, Spinner } from '../ui';

// ── formatting ───────────────────────────────────────────────────────────────
/** minutes since local midnight → "6:42 AM" (values past 24:00 belong to the next morning) */
export function clock(min) {
  const next = min >= 1440;
  const m = Math.round(((min % 1440) + 1440) % 1440);
  const h24 = Math.floor(m / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}${next ? ' (next day)' : ''}`;
}
const range = (a, b) => `${clock(a)} – ${clock(b)}`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = [
  ['S', 'र'],
  ['M', 'सो'],
  ['T', 'मं'],
  ['W', 'बु'],
  ['T', 'गु'],
  ['F', 'शु'],
  ['S', 'श'],
];

const STATUS = {
  best: { label: 'Very good', mr: 'उत्तम', cell: 'bg-leaf text-white border-leaf', chip: 'bg-leaf text-white' },
  good: { label: 'Good', mr: 'शुभ', cell: 'bg-leaf-soft text-[#27573f] border-leaf/40', chip: 'bg-leaf-soft text-[#27573f]' },
  possible: { label: 'Panchang ok, timing needs care', mr: 'पंचांग शुभ, वेळ पाहा', cell: 'bg-gold-soft text-[#7c5f35] border-gold/50', chip: 'bg-gold-soft text-[#7c5f35]' },
  blocked: { label: 'Not suitable', mr: 'वर्ज्य', cell: 'bg-sand/70 text-muted border-transparent', chip: 'bg-sand text-muted' },
  none: { label: 'No suitable time', mr: 'योग नाही', cell: 'bg-white text-ink border-line', chip: 'bg-sand text-muted' },
};
const CHOG = { good: 'bg-leaf/80 text-white', neutral: 'bg-gold/60 text-[#4b3a14]', bad: 'bg-primary/80 text-white' };

// ── the 24-hour bar ──────────────────────────────────────────────────────────
function Bar({ rows, sunrise, sunset }) {
  const pct = (m) => `${Math.max(0, Math.min(100, (m / 1440) * 100))}%`;
  return (
    <div className="space-y-1.5">
      <div className="relative ml-[74px] h-4 text-[10px] text-muted sm:ml-24">
        {[0, 6, 12, 18, 24].map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: `${(h / 24) * 100}%` }}>
            {h === 0 || h === 24 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="w-[66px] shrink-0 text-[11px] font-semibold text-[#5b534d] sm:w-[88px]">{row.label}</span>
          <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-sand/80">
            {row.bands.map((b, i) => (
              <div
                key={i}
                title={b.title}
                className={cn('absolute inset-y-0 grid place-items-center overflow-hidden text-[9px] leading-none font-bold sm:text-[10px]', b.className)}
                style={{ left: pct(b.start), width: `calc(${pct(Math.min(b.end, 1440))} - ${pct(b.start)})` }}
              >
                {b.text}
              </div>
            ))}
            {[sunrise, sunset].map((m, i) => (
              <span key={i} className="absolute inset-y-0 w-px bg-ink/40" style={{ left: pct(m) }} />
            ))}
          </div>
        </div>
      ))}
      <div className="relative ml-[74px] h-4 text-[10px] text-muted sm:ml-24">
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pct(sunrise) }}>
          ☀ {clock(sunrise)}
        </span>
      </div>
    </div>
  );
}

const Row = ({ label, children }) => (
  <div className="grid grid-cols-[92px_1fr] gap-3 border-b border-line py-2.5 text-sm last:border-0 sm:grid-cols-[120px_1fr]">
    <dt className="text-muted">{label}</dt>
    <dd className="font-medium">{children}</dd>
  </div>
);

/** "Pratipada until 9:12 AM, then Dwitiya" for one panchang element */
function Changes({ segs, name }) {
  return (
    <span className="space-y-0.5">
      {segs.map((s, i) => (
        <span key={i} className="block">
          <span className={cn(s.bad && 'text-primary', s.good && 'text-leaf')}>{name(s)}</span>
          <span className="text-muted">
            {' '}
            {i === 0 && segs.length > 1 ? `until ${clock(s.endMin)}` : i > 0 && i < segs.length - 1 ? `${clock(s.startMin)} – ${clock(s.endMin)}` : i > 0 ? `from ${clock(s.startMin)}` : 'all day'}
          </span>
        </span>
      ))}
    </span>
  );
}

function DayDetail({ day, purpose }) {
  const st = STATUS[day.status];
  const bar = [
    { label: 'Best time', bands: [...day.panchangWindows.map((w) => ({ start: w.startMin, end: w.endMin, className: 'bg-gold/60', title: `Panchang favourable: ${range(w.startMin, w.endMin)}` })), ...day.windows.map((w) => ({ start: w.startMin, end: w.endMin, className: w.strong ? 'bg-leaf text-white' : 'bg-leaf/70 text-white', text: w.strong ? '★' : '', title: `Good time: ${range(w.startMin, w.endMin)}` }))] },
    { label: 'Avoid', bands: day.avoid.map((a) => ({ start: a.startMin, end: a.endMin, className: 'bg-primary/80 text-white', text: a.key === 'rahu' ? 'Rahu' : a.key === 'yamaganda' ? 'Yama' : 'Gul', title: `${a.en}: ${range(a.startMin, a.endMin)}` })) },
    { label: 'Choghadiya', bands: day.choghadiya.map((c) => ({ start: c.startMin, end: c.endMin, className: CHOG[c.quality], text: c.mr, title: `${c.name} (${c.quality}): ${range(c.startMin, c.endMin)}` })) },
    { label: 'Nakshatra', bands: day.panchang.nakshatra.map((n) => ({ start: n.startMin, end: n.endMin, className: n.good ? 'bg-leaf-soft text-[#27573f]' : 'bg-white text-[#5b534d] border-x border-line', text: n.name.split(' ').pop().slice(0, 7), title: `${n.name}: ${range(n.startMin, n.endMin)}` })) },
    { label: 'Tithi', bands: day.panchang.tithi.map((t) => ({ start: t.startMin, end: t.endMin, className: 'bg-white text-[#5b534d] border-x border-line', text: t.name.slice(0, 7), title: `${t.paksha} ${t.name}: ${range(t.startMin, t.endMin)}` })) },
  ];
  const night = day.choghadiya.filter((c) => c.night);
  const dayCh = day.choghadiya.filter((c) => !c.night);
  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">
              {day.weekday.en} · {day.weekday.mr}
            </p>
            <h3 className="font-serif text-xl font-semibold sm:text-2xl">
              {new Date(`${day.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <p className="mt-0.5 text-sm text-muted">
              {day.month.en}
              {day.month.adhik ? ' (Adhik)' : ''} · {day.tithi.paksha} {day.tithi.name} · <span className="heading-deva">{day.tithi.pakshaMr} {day.tithi.nameMr}</span>
            </p>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-bold', st.chip)}>
            {st.label} · <span className="heading-deva">{st.mr}</span>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-sand px-3 py-1.5">☀ Sunrise {clock(day.sunrise)}</span>
          <span className="rounded-full bg-sand px-3 py-1.5">🌇 Sunset {clock(day.sunset)}</span>
          <span className="rounded-full bg-sand px-3 py-1.5">Nakshatra at sunrise: {day.nakshatraAtSunrise}</span>
        </div>
        {day.notes.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-lg bg-primary-soft/70 p-3 text-sm text-primary-dark">
            {day.notes.map((n) => (
              <li key={n.key} className="flex gap-2">
                <Icon name="info" size={16} className="mt-0.5 shrink-0" /> {n.en} · <span className="heading-deva">{n.mr}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4 sm:p-5">
        <h4 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold">
          <Icon name="check" size={18} className="text-leaf" /> {purpose === 'vivah' ? 'Best times for the wedding' : 'Best times for a new beginning'}
        </h4>
        {day.windows.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {day.windows.map((w, i) => (
              <li key={i} className={cn('flex items-center justify-between gap-3 rounded-xl border px-4 py-3', w.strong ? 'border-leaf bg-leaf-soft' : 'border-leaf/30 bg-white')}>
                <b className="text-[15px]">{range(w.startMin, w.endMin)}</b>
                <span className="text-xs font-semibold text-[#27573f]">{w.strong ? '★ Very good' : 'Good'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-sand/70 p-4 text-sm text-[#5b534d]">
            {day.status === 'blocked'
              ? 'This day is not recommended (see the reason above).'
              : day.status === 'possible'
                ? 'The panchang is favourable, but every favourable moment overlaps Rahu Kaal, Yamaganda, Gulika or a bad Choghadiya. Ask your priest for the exact time.'
                : purpose === 'vivah'
                  ? 'No suitable wedding time on this day: the nakshatra, tithi or yoga is not favourable. Try the green days in the calendar.'
                  : 'No clear good time on this day.'}
          </p>
        )}
        <p className="mt-3 text-[11px] text-muted">Green = good, ★ = very good (good Choghadiya, favourable tithi and weekday). Amber = panchang favourable but the time overlaps an avoid period.</p>
      </div>

      <div className="card p-4 sm:p-5">
        <h4 className="mb-3 font-serif text-lg font-semibold">Timeline of the day · दिवसाचा आलेख</h4>
        <Bar rows={bar} sunrise={day.sunrise} sunset={day.sunset} />
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-leaf" /> good</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-gold/60" /> panchang ok</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-primary/80" /> avoid / bad</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-leaf-soft" /> good nakshatra</span>
          <span>│ sunrise / sunset</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 sm:p-5">
          <h4 className="mb-1 font-serif text-lg font-semibold">Avoid · वर्ज्य काळ</h4>
          <dl>
            {day.avoid.map((a) => (
              <Row key={a.key} label={a.en}>
                {range(a.startMin, a.endMin)} <span className="heading-deva block text-xs font-normal text-muted">{a.mr}</span>
              </Row>
            ))}
          </dl>
          <h4 className="mt-4 mb-1 font-serif text-lg font-semibold">Favourable · शुभ काळ</h4>
          <dl>
            {day.favourable.map((a) => (
              <Row key={a.key} label={a.en}>
                {range(a.startMin, a.endMin)} <span className="heading-deva block text-xs font-normal text-muted">{a.mr}</span>
              </Row>
            ))}
          </dl>
        </div>
        <div className="card p-4 sm:p-5">
          <h4 className="mb-1 font-serif text-lg font-semibold">Panchang · पंचांग</h4>
          <dl>
            <Row label="Tithi">
              <Changes segs={day.panchang.tithi} name={(s) => `${s.paksha} ${s.name}`} />
            </Row>
            <Row label="Nakshatra">
              <Changes segs={day.panchang.nakshatra} name={(s) => s.name} />
            </Row>
            <Row label="Yoga">
              <Changes segs={day.panchang.yoga} name={(s) => s.name} />
            </Row>
            <Row label="Karana">
              <Changes segs={day.panchang.karana} name={(s) => s.name} />
            </Row>
          </dl>
          <p className="mt-2 text-[11px] text-muted">Green nakshatra = favourable for weddings. Red = avoided (Vyatipata, Vaidhriti yoga; Vishti karana).</p>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <h4 className="mb-3 font-serif text-lg font-semibold">Choghadiya · चौघडिया</h4>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['Day', dayCh],
            ['Night', night],
          ].map(([title, list]) => (
            <div key={title}>
              <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-primary uppercase">{title}</p>
              <ul className="space-y-1.5">
                {list.map((c, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <span className={cn('grid h-7 w-[74px] shrink-0 place-items-center rounded-md text-[11px] font-bold', CHOG[c.quality])}>{c.name}</span>
                    <span className="text-[13px]">{range(c.startMin, c.endMin)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── the planner ──────────────────────────────────────────────────────────────
export function MuhuratPlanner() {
  const today = new Date();
  const [purpose, setPurpose] = useState('vivah');
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 });
  const [selected, setSelected] = useState(iso(today));
  const [placeText, setPlaceText] = useState('Palghar');
  const [geo, setGeo] = useState(null);
  const [typed, setTyped] = useState('Palghar');
  const detailRef = useRef(null);

  // typed text (without picking a suggestion) is applied after a short pause
  useEffect(() => {
    const t = setTimeout(() => setTyped(placeText.trim() || 'Palghar'), 700);
    return () => clearTimeout(t);
  }, [placeText]);
  const where = useMemo(() => (geo ? { lat: geo.lat, lon: geo.lon, tz: geo.tz } : { place: typed }), [geo, typed]);

  const month = useQuery({ queryKey: ['muhurat-month', cursor.y, cursor.m, purpose, where], queryFn: () => get('/astrology/muhurat/month', { year: cursor.y, month: cursor.m, purpose, ...where }), staleTime: 3600_000, placeholderData: (p) => p });
  const day = useQuery({ queryKey: ['muhurat-day', selected, purpose, where], queryFn: () => get('/astrology/muhurat/day', { date: selected, purpose, ...where }), staleTime: 3600_000, placeholderData: (p) => p });

  const first = new Date(cursor.y, cursor.m - 1, 1).getDay();
  const cells = [...Array(first).fill(null), ...(month.data?.days || [])];
  const move = (d) => setCursor((c) => {
    const n = new Date(c.y, c.m - 1 + d, 1);
    return { y: n.getFullYear(), m: n.getMonth() + 1 };
  });
  const pick = (date) => {
    setSelected(date);
    // on phones the day timeline is below the calendar: bring it into view
    if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const suitable = (month.data?.days || []).filter((d) => d.status === 'best' || d.status === 'good').length;

  return (
    <div className="space-y-5 py-6">
      <div className="card grid gap-4 p-4 sm:p-5 md:grid-cols-2 md:items-end">
        <div>
          <span className="field-label">What is it for?</span>
          <Segment
            id="muhurat-purpose"
            value={purpose}
            onChange={setPurpose}
            options={[
              { value: 'vivah', label: 'Vivah · विवाह' },
              { value: 'general', label: 'Any shubh kaam' },
            ]}
          />
        </div>
        <PlaceInput
          label="Place (sunrise & timings)"
          value={placeText}
          onChange={(text, pl) => {
            setPlaceText(text);
            setGeo(pl ? { lat: pl.lat, lon: pl.lon, tz: pl.tz } : null);
          }}
          placeholder="Village, town or city"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,430px)_1fr] lg:items-start">
        <div className="card p-4 sm:p-5 lg:sticky lg:top-24">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => move(-1)} className="grid size-10 place-items-center rounded-full border border-line bg-white hover:bg-sand" aria-label="Previous month">
              <Icon name="arrow" size={16} className="rotate-180" />
            </button>
            <div className="text-center">
              <b className="block font-serif text-lg font-semibold">
                {MONTHS[cursor.m - 1]} {cursor.y}
              </b>
              <small className="text-[11px] text-muted">{month.isFetching && !month.data ? 'Calculating…' : purpose === 'vivah' ? `${suitable} suitable ${suitable === 1 ? 'day' : 'days'}` : 'Tap a day'}</small>
            </div>
            <button type="button" onClick={() => move(1)} className="grid size-10 place-items-center rounded-full border border-line bg-white hover:bg-sand" aria-label="Next month">
              <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted">
            {WEEK.map(([e, m], i) => (
              <span key={i}>
                {e} <span className="heading-deva">{m}</span>
              </span>
            ))}
          </div>
          <div className={cn('mt-1.5 grid grid-cols-7 gap-1 transition-opacity', month.isFetching && 'opacity-60')}>
            {cells.map((d, i) =>
              d ? (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => pick(d.date)}
                  aria-label={`${d.date}: ${STATUS[d.status].label}`}
                  className={cn(
                    'relative flex aspect-[1/1.05] min-h-[46px] flex-col items-center justify-center rounded-lg border text-center transition active:scale-95 sm:min-h-[54px]',
                    STATUS[d.status].cell,
                    selected === d.date && 'ring-2 ring-primary ring-offset-1',
                    d.date === iso(today) && 'outline-2 outline-offset-1 outline-primary/50',
                  )}
                >
                  <b className="text-[15px] leading-none">{Number(d.date.slice(8))}</b>
                  <small className="mt-0.5 text-[8px] leading-none opacity-80 sm:text-[9px]">
                    <span className="heading-deva">{d.tithi.paksha === 'Shukla' ? 'शु' : 'कृ'}{d.tithi.inPaksha}</span>
                  </small>
                  {(d.purnima || d.amavasya) && <span className="absolute top-0.5 right-1 text-[9px]">{d.purnima ? '○' : '●'}</span>}
                  {d.ekadashi && <span className="absolute top-0.5 left-1 text-[8px] font-bold">ए</span>}
                </button>
              ) : (
                <span key={`e${i}`} />
              ),
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted">
            {['best', 'good', 'possible', 'blocked'].map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <i className={cn('size-3 rounded-sm border', STATUS[k].cell)} /> {STATUS[k].label.split(',')[0]}
              </span>
            ))}
            <span>○ Purnima · ● Amavasya · ए Ekadashi</span>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Calculated from the sky for {month.data?.place?.name || 'your place'}: tithi, nakshatra, yoga, karana, sunrise and sunset. Classical rules (Chaturmas, Kharmas, Guru/Shukra asta, Adhik maas) are applied. For a wedding, please confirm the date and Lagna time with your family priest.
          </p>
        </div>

        <div ref={detailRef} className="scroll-mt-24">
          {day.isLoading || !day.data ? (
            <div className="card grid h-56 place-items-center text-primary">
              <Spinner />
            </div>
          ) : day.isError ? (
            <div className="card p-6 text-sm text-primary">Could not calculate this day. Please try another place or date.</div>
          ) : (
            <div className={cn('transition-opacity', day.isFetching && 'opacity-60')}>
              <DayDetail day={day.data} purpose={purpose} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
