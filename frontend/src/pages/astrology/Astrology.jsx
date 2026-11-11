import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BirthChartShareCard, KundaliChart, PlanetTable } from '../../components/astrology/KundaliChart';
import { DownloadCardButton } from '../../components/common/DownloadCard';
import { KundaliResult } from '../../components/common/KundaliResult';
import { RashiDetails, RashiDownloadButton } from '../../components/common/RashiReport';
import { Badge, Field, Icon, PageHeader, Reveal, Spinner, Tabs } from '../../components/ui';
import { errorMessage, get, post } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';

function BirthFields({ value, onChange, title }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <fieldset className="space-y-3">
      {title && <legend className="mb-2 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">{title}</legend>}
      <Field label="Name (optional)" value={value.name} onChange={set('name')} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth *" type="date" required value={value.dob} onChange={set('dob')} />
        <Field label="Time of birth" type="time" value={value.tob} onChange={set('tob')} />
      </div>
      <Field label="Place of birth" placeholder="e.g. Boisar, Palghar" list="mv-birth-places" autoComplete="off" value={value.place} onChange={set('place')} />
      <PlaceList />
    </fieldset>
  );
}

/** Birthplace suggestions (Palghar district first). */
function PlaceList() {
  const { data = [] } = useQuery({ queryKey: ['birth-places'], queryFn: () => get('/astrology/places'), staleTime: Infinity });
  return (
    <datalist id="mv-birth-places">
      {data.map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
  );
}

const fileName = (name) => `kundali-${(name || 'birth-chart').toLowerCase().replace(/\s+/g, '-')}.png`;

/** Janma Kundali: North Indian chart with Lagna, nine grahas and houses. */
function BirthChart() {
  const me = useAuth((s) => s.user?.profile);
  const lang = useUI((s) => s.lang);
  const [v, setV] = useState({ name: me?.fullName || '', dob: me?.dateOfBirth || '', tob: me?.timeOfBirth || '', place: me?.placeOfBirth || '' });
  const m = useMutation({ mutationFn: () => post('/astrology/kundali', { dob: v.dob, tob: v.tob || undefined, place: v.place || undefined }), onError: (e) => toast.error(errorMessage(e)) });
  const r = m.data;
  return (
    <div className="grid gap-6 py-8 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
        className="card h-max p-6"
      >
        <h2 className="mb-1 font-serif text-xl font-semibold">Janma Kundali · जन्म कुंडली</h2>
        <p className="mb-5 text-xs text-muted">Your birth chart in the North Indian style: Lagna, the nine grahas and the twelve houses.</p>
        <BirthFields value={v} onChange={setV} />
        <button className="btn btn-primary mt-5 w-full" disabled={!v.dob || m.isPending}>
          {m.isPending ? <Spinner size={16} /> : <>Make my Kundali <Icon name="zodiac" size={17} /></>}
        </button>
        <p className="mt-3 text-[11px] text-muted">Time is Indian Standard Time. The exact birth time and place decide the Lagna. Without a time you get a Chandra Kundali (Moon sign as house 1).</p>
      </form>

      <AnimatePresence mode="wait">
        {r ? (
          <motion.div key={`${r.input.dob}-${r.input.tob}-${r.place.name}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="min-w-0 space-y-5">
            <div className="card p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">{r.chartType === 'LAGNA' ? 'Lagna Kundali' : 'Chandra Kundali'}</p>
                  <h3 className="font-serif text-xl font-semibold">{v.name || 'Birth chart'}</h3>
                  <p className="text-xs text-muted">
                    {r.input.dob}
                    {r.input.tob ? ` · ${r.input.tob} IST` : ' · time not given'} · {r.place.name}
                    {v.place && !r.place.matched && ' (place not found, using Palghar)'}
                  </p>
                </div>
                <DownloadCardButton filename={fileName(v.name)} card={() => <BirthChartShareCard data={r} name={v.name} />} />
              </div>
              <div className="grid gap-5 md:grid-cols-[minmax(0,420px)_1fr] md:items-start">
                <KundaliChart data={r} lang={lang} className="mx-auto w-full max-w-[420px]" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
                  {[
                    ['Lagna', r.lagna ? `${r.lagna.rashi} · ${r.lagna.rashiMr}` : 'Add birth time', r.lagna ? `${Math.floor(r.lagna.degree)}° · ${r.lagna.nakshatra}` : 'needed for the Lagna'],
                    ['Rashi (Moon)', `${r.moonRashi} · ${r.moonRashiMr}`, 'Chandra rashi'],
                    ['Nakshatra', r.nakshatra, `Pada ${r.pada}`],
                    ['Ayanamsa', `Lahiri ${r.ayanamsa.toFixed(2)}°`, 'sidereal zodiac'],
                  ].map(([k, a, b]) => (
                    <div key={k} className="rounded-xl bg-sand/70 p-3">
                      <small className="text-[10px] tracking-[0.12em] text-primary uppercase">{k}</small>
                      <b className="mt-0.5 block text-[15px]">{a}</b>
                      <small className="text-[11px] text-muted">{b}</small>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-[11px] text-muted">
                Numbers inside the houses are rashi numbers (1 Mesh … 12 Meen). ℞ = retrograde.{' '}
                {lang === 'mr' ? 'सू सूर्य · चं चंद्र · मं मंगळ · बु बुध · गु गुरु · शु शुक्र · श शनि · रा राहू · के केतू' : 'Su Sun · Mo Moon · Ma Mars · Me Mercury · Ju Jupiter · Ve Venus · Sa Saturn · Ra Rahu · Ke Ketu'}
              </p>
            </div>
            <div className="card p-5 sm:p-6">
              <h3 className="mb-3 font-serif text-lg font-semibold">Planet positions · ग्रहस्थिती</h3>
              <PlanetTable data={r} lang={lang} />
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid place-items-center rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
            <div>
              <svg viewBox="0 0 100 100" className="mx-auto size-28 text-primary/50" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="96" height="96" />
                <path d="M2 2 98 98M98 2 2 98M50 2 98 50 50 98 2 50Z" />
              </svg>
              <p className="heading-deva mt-5 text-xl">तुमची जन्म कुंडली</p>
              <p className="mt-1 text-sm text-muted">Enter date, time and place of birth to draw your Kundali.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RashiCalculator() {
  const me = useAuth((s) => s.user?.profile);
  const [v, setV] = useState({ name: me?.fullName || '', dob: me?.dateOfBirth || '', tob: me?.timeOfBirth || '', place: me?.placeOfBirth || '' });
  const m = useMutation({ mutationFn: () => post('/astrology/rashi', { dob: v.dob, tob: v.tob || undefined, place: v.place || undefined }), onError: (e) => toast.error(errorMessage(e)) });
  const r = m.data;
  return (
    <div className="grid gap-6 py-8 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
        className="card h-max p-6"
      >
        <h2 className="mb-1 font-serif text-xl font-semibold">Find your Rashi</h2>
        <p className="mb-5 text-xs text-muted">Chandra Rashi (Moon sign) & Nakshatra — the way Marathi panchang reads it.</p>
        <BirthFields value={v} onChange={setV} />
        <button className="btn btn-primary mt-5 w-full" disabled={!v.dob || m.isPending}>
          {m.isPending ? <Spinner size={16} /> : <>Calculate <Icon name="zodiac" size={17} /></>}
        </button>
        <p className="mt-3 text-[11px] text-muted">Time is taken as Indian Standard Time. Without a birth time we assume 12:00 noon.</p>
      </form>

      <AnimatePresence mode="wait">
        {r ? (
          <motion.div key={r.moonLongitude} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="min-w-0 space-y-5">
          <div className="relative overflow-hidden rounded-2xl bg-primary-dark p-6 pt-16 text-white sm:p-10 sm:pt-14">
            <RashiDownloadButton
              rashi={r.rashi.name}
              nakshatra={r.nakshatra.name}
              pada={r.nakshatra.pada}
              name={v.name}
              className="absolute top-4 right-4 z-10 border-white/40 bg-white/10 text-white hover:bg-white/20"
            />
            <motion.div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full border border-white/10" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 60, ease: 'linear' }} />
            <div className="relative flex flex-col items-center gap-8 sm:flex-row">
              <motion.div initial={{ rotate: -90, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="grid size-36 shrink-0 place-items-center rounded-full border-2 border-gold/60 bg-white/10 text-7xl">
                {r.rashi.symbol}
              </motion.div>
              <div className="text-center sm:text-left">
                <p className="eyebrow eyebrow-light mb-2 justify-center sm:justify-start">{v.name ? `${v.name}’s rashi` : 'Your rashi'}</p>
                <h3 className="heading-deva text-5xl font-bold">{r.rashi.mr}</h3>
                <p className="mt-1 font-serif text-xl text-[#f1d9cf]">
                  {r.rashi.name} · {r.rashi.en}
                </p>
                {r.approximate && <Badge className="mt-3">Add birth time for accuracy — Moon changed nakshatra that day</Badge>}
              </div>
            </div>
            <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Nakshatra', `${r.nakshatra.mr}`, `${r.nakshatra.name} · Pada ${r.nakshatra.pada}`],
                ['Ruling planet', r.rashi.lord, `Nakshatra lord: ${r.nakshatra.lord}`],
                ['Element', r.rashi.element, `Varna: ${r.rashi.varnaName}`],
                ['Lucky colour', r.rashi.color, `Gana: ${r.nakshatra.ganaName}`],
              ].map(([k, a, b], i) => (
                <motion.div key={k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }} className="rounded-xl bg-white/10 p-4">
                  <small className="text-[10px] tracking-[0.12em] text-[#f1bf76] uppercase">{k}</small>
                  <b className="heading-deva mt-1 block text-lg">{a}</b>
                  <small className="text-[11px] text-[#e1c7bd]">{b}</small>
                </motion.div>
              ))}
            </div>
            <p className="relative mt-6 text-[11px] text-[#e1c7bd]">
              Moon at {r.degreeInSign}° in {r.rashi.name} (sidereal, Lahiri). Nadi: {r.nakshatra.nadiName} · Yoni: {r.nakshatra.yoni}
            </p>
          </div>
          <RashiDetails rashi={r.rashi.name} nakshatra={r.nakshatra.name} pada={r.nakshatra.pada} />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid place-items-center rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
            <div>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 40, ease: 'linear' }} className="mx-auto grid size-28 place-items-center rounded-full border border-dashed border-primary/30 text-primary">
                <Icon name="zodiac" size={48} />
              </motion.div>
              <p className="heading-deva mt-5 text-xl">तुमची राशी जाणून घ्या</p>
              <p className="mt-1 text-sm text-muted">Enter birth details to see your Rashi, Nakshatra and more.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KundaliMatch() {
  const empty = { name: '', dob: '', tob: '', place: '' };
  const [boy, setBoy] = useState(empty);
  const [girl, setGirl] = useState(empty);
  const m = useMutation({
    mutationFn: () => post('/astrology/match', { boy: { ...boy, tob: boy.tob || undefined }, girl: { ...girl, tob: girl.tob || undefined } }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="py-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
        className="card p-6"
      >
        <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr]">
          <BirthFields value={boy} onChange={setBoy} title="Groom · वर" />
          <div className="hidden place-items-center md:grid">
            <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon name="heart" />
            </span>
          </div>
          <BirthFields value={girl} onChange={setGirl} title="Bride · वधू" />
        </div>
        <button className="btn btn-primary mx-auto mt-6 flex w-full sm:w-auto" disabled={!boy.dob || !girl.dob || m.isPending}>
          {m.isPending ? <Spinner size={16} /> : <>Match Kundali <Icon name="zodiac" size={17} /></>}
        </button>
      </form>
      <AnimatePresence>
        {m.data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card mt-6 p-6 sm:p-8">
            <KundaliResult result={m.data} boyName={boy.name || 'Groom'} girlName={girl.name || 'Bride'} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TYPE_STYLE = { VIVAH: 'bg-primary text-white', GRIHA_PRAVESH: 'bg-leaf text-white', SAKHARPUDA: 'bg-gold text-white' };
const TYPE_LABEL = { VIVAH: 'Vivah', GRIHA_PRAVESH: 'Griha pravesh', SAKHARPUDA: 'Sakharpuda' };
const TYPE_INFO = {
  VIVAH: { mr: 'विवाह', about: 'Auspicious for weddings' },
  GRIHA_PRAVESH: { mr: 'गृहप्रवेश', about: 'Auspicious for moving into a new home' },
  SAKHARPUDA: { mr: 'साखरपुडा', about: 'Auspicious for engagement (sakharpuda)' },
};

/** Small marker under the date for special tithis. */
function TithiMark({ info, onColour }) {
  if (!info) return null;
  const i = info.tithi.index;
  if (i === 14) return <span className={cn('absolute bottom-1 size-1.5 rounded-full', onColour ? 'bg-white' : 'bg-gold')} title="Purnima" />;
  if (i === 29) return <span className={cn('absolute bottom-1 size-1.5 rounded-full border', onColour ? 'border-white' : 'border-ink/60')} title="Amavasya" />;
  if (info.observances.length) return <span className={cn('absolute bottom-1 size-1 rounded-full', onColour ? 'bg-white/80' : 'bg-primary/60')} />;
  return null;
}

/** Hover / tap card with the day's basic panchang and muhurat. */
function DayCard({ date, info, events, isToday }) {
  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-2 border-b border-line pb-2">
        <div>
          <b className="block text-sm">{date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
          {info && <span className="heading-deva text-xs text-muted">{info.weekdayMr}</span>}
        </div>
        {isToday && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Today</span>}
      </div>
      {info ? (
        <dl className="mt-2 space-y-1.5 text-xs">
          <div className="flex gap-2">
            <dt className="w-[72px] shrink-0 text-muted">Tithi</dt>
            <dd>
              <b>
                {info.paksha.name.split(' ')[0]} {info.tithi.name}
              </b>{' '}
              <span className="heading-deva text-muted">· {info.paksha.mr.split(' ')[0]} {info.tithi.mr}</span>
              <span className="block text-[10px] text-muted">{info.paksha.note}</span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-[72px] shrink-0 text-muted">Nakshatra</dt>
            <dd>
              <b>{info.nakshatra.name}</b> <span className="heading-deva text-muted">· {info.nakshatra.mr}</span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-[72px] shrink-0 text-muted">Moon in</dt>
            <dd>
              {info.moonRashi.symbol} <b>{info.moonRashi.name}</b> <span className="heading-deva text-muted">· {info.moonRashi.mr}</span>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-xs text-muted">Loading panchang…</p>
      )}
      {info?.observances.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {info.observances.map((o) => (
            <span key={o.name} className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-[#8c6100]">
              {o.name} · <span className="heading-deva">{o.mr}</span>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2.5 border-t border-line pt-2">
        {events?.length ? (
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-xs">
                <span className={cn('mt-0.5 size-2.5 shrink-0 rounded-sm', TYPE_STYLE[e.type] || 'bg-primary')} />
                <span>
                  <b>{e.title}</b>
                  <span className="block text-[11px] text-muted">
                    {TYPE_INFO[e.type]?.about || 'Shubh muhurat'}
                    {e.notes ? ` · ${e.notes}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted">No listed muhurat on this day.</p>
        )}
      </div>
      <p className="mt-2 text-[10px] text-muted">Panchang at sunrise (≈6:30 AM IST) — confirm timings with your priest.</p>
    </div>
  );
}

function MuhuratCalendar() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [active, setActive] = useState(null); // day number whose card is open
  const pointer = useRef('mouse');
  const gridRef = useRef(null);
  const { data = [], isLoading } = useQuery({ queryKey: ['muhurat', ym.y, ym.m], queryFn: () => get('/astrology/muhurat', { year: ym.y, month: ym.m + 1 }) });
  const { data: panchang = [] } = useQuery({
    queryKey: ['panchang', ym.y, ym.m],
    queryFn: () => get('/astrology/panchang', { year: ym.y, month: ym.m + 1 }),
    staleTime: Infinity,
  });
  const byDay = useMemo(() => {
    const map = {};
    data.forEach((d) => (map[Number(d.date.slice(8, 10))] ||= []).push(d));
    return map;
  }, [data]);
  const observances = panchang.filter((p) => p.observances.length);
  const first = new Date(ym.y, ym.m, 1).getDay();
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const shift = (n) => {
    setActive(null);
    setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));
  };

  // On touch screens the card opens on tap — close it when tapping anywhere outside the calendar
  useEffect(() => {
    if (active == null) return;
    const close = (e) => !gridRef.current?.contains(e.target) && setActive(null);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [active]);

  return (
    <div className="grid gap-6 py-8 lg:grid-cols-[1fr_320px]">
      <div className="card p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <button className="grid size-10 place-items-center rounded-full hover:bg-sand" onClick={() => shift(-1)} aria-label="Previous month">
            <Icon name="chevron-left" />
          </button>
          <AnimatePresence mode="wait">
            <motion.h3 key={`${ym.y}-${ym.m}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="font-serif text-xl font-semibold">
              {MONTHS[ym.m]} {ym.y}
            </motion.h3>
          </AnimatePresence>
          <button className="grid size-10 place-items-center rounded-full hover:bg-sand" onClick={() => shift(1)} aria-label="Next month">
            <Icon name="chevron-right" />
          </button>
        </div>
        <p className="-mt-3 mb-4 text-center text-[11px] text-muted">
          <span className="hidden sm:inline">Hover over</span>
          <span className="sm:hidden">Tap</span> any date for tithi, nakshatra and muhurat details
        </p>
        <div ref={gridRef} className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-wider text-muted uppercase sm:gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
          {Array.from({ length: first }).map((_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1;
            const ev = byDay[d];
            const info = panchang[i];
            const today = ym.y === now.getFullYear() && ym.m === now.getMonth() && d === now.getDate();
            const col = (first + i) % 7;
            const row = Math.floor((first + i) / 7);
            const open = active === d;
            return (
              <motion.div
                key={`${ym.y}-${ym.m}-${d}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.008 }}
                className={cn('relative', open && 'z-30')}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(d)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setActive((a) => (a === d ? null : a))}
              >
                <button
                  type="button"
                  onPointerDown={(e) => (pointer.current = e.pointerType)}
                  onClick={() => setActive((a) => (a === d && pointer.current !== 'mouse' ? null : d))}
                  onFocus={() => setActive(d)}
                  aria-expanded={open}
                  aria-label={`${d} ${MONTHS[ym.m]}${ev ? ` — ${ev.map((e) => e.title).join(', ')}` : ''}${info ? ` — ${info.paksha.name} ${info.tithi.name}` : ''}`}
                  className={cn(
                    'relative flex aspect-square w-full flex-col items-center justify-center rounded-lg text-sm font-normal normal-case transition',
                    ev ? `${TYPE_STYLE[ev[0].type]} font-bold shadow-sm` : 'text-ink hover:bg-sand',
                    today && !ev && 'ring-2 ring-primary/40',
                    open && 'ring-2 ring-primary ring-offset-1',
                  )}
                >
                  {d}
                  {ev?.length > 1 ? <span className="absolute bottom-1 size-1 rounded-full bg-white" /> : <TithiMark info={info} onColour={Boolean(ev)} />}
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      role="tooltip"
                      initial={{ opacity: 0, y: row <= 1 ? -6 : 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        'absolute z-30 w-64 rounded-xl border border-line bg-white p-3 font-normal tracking-normal text-ink normal-case shadow-[0_18px_40px_rgba(40,25,15,0.18)]',
                        row <= 1 ? 'top-full mt-2' : 'bottom-full mb-2',
                        col <= 1 ? 'left-0' : col >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2',
                      )}
                    >
                      <DayCard date={new Date(ym.y, ym.m, d)} info={info} events={ev} isToday={today} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {Object.entries(TYPE_LABEL).map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={cn('size-3 rounded', TYPE_STYLE[k])} /> {l}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-gold" /> Purnima
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full border border-ink/60" /> Amavasya
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-primary/60" /> Ekadashi / Chaturthi / Pradosh
          </span>
        </div>
      </div>
      <div className="space-y-5">
        <div className="card h-max p-5">
          <h3 className="font-serif text-lg font-semibold">Shubh dates this month</h3>
          {isLoading ? (
            <div className="py-8 text-center text-primary">
              <Spinner />
            </div>
          ) : data.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No listed muhurat dates this month.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg bg-sand/70 p-2.5">
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold', TYPE_STYLE[d.type])}>{Number(d.date.slice(8, 10))}</span>
                  <span className="text-sm">
                    <b className="block">{d.title}</b>
                    <small className="text-[11px] text-muted">{new Date(d.date).toLocaleDateString('en-IN', { weekday: 'long' })}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-muted">Dates are indicative and maintained by the Mi Vanjari team. Always confirm the exact muhurat time with your family priest or local panchang.</p>
        </div>
        {observances.length > 0 && (
          <div className="card h-max p-5">
            <h3 className="font-serif text-lg font-semibold">
              Vrat &amp; tithi <span className="heading-deva text-sm font-normal text-muted">· व्रत</span>
            </h3>
            <ul className="mt-3 space-y-1.5">
              {observances.map((p) => (
                <li key={p.date} className="flex items-center gap-3 text-sm">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gold-soft text-xs font-bold text-[#8c6100]">{Number(p.date.slice(8, 10))}</span>
                  <span className="min-w-0">
                    <b className="block truncate text-[13px]">{p.observances[0].name}</b>
                    <small className="heading-deva text-[11px] text-muted">
                      {p.observances[0].mr} · {p.weekdayMr}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const SECTIONS = [
  { value: 'rashi', icon: 'zodiac', mr: 'राशी शोधा', en: 'Rashi', desc: 'Moon sign & nakshatra' },
  { value: 'chart', icon: 'grid', mr: 'जन्म कुंडली', en: 'Birth chart', desc: 'Lagna & 9 grahas' },
  { value: 'kundali', icon: 'heart', mr: 'कुंडली जुळणी', en: 'Kundali match', desc: '36 guna milan' },
  { value: 'muhurat', icon: 'calendar', mr: 'मुहूर्त', en: 'Calendar', desc: 'Muhurat & panchang' },
];

export default function Astrology() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'rashi';
  const contentRef = useRef(null);
  const choose = (v, scroll = false) => {
    setParams({ tab: v }, { replace: true });
    // on phones the cards sit above the content: bring the chosen section into view
    if (scroll) requestAnimationFrame(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  return (
    <>
      <PageHeader eyebrow="Rashi & Kundali" title="राशी आणि कुंडली" subtitle="Traditional astrological guidance — calculated precisely, explained simply." icon="zodiac" />
      <div className="container-page">
        {/* Phones: all four sections as a 2 × 2 grid of cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 md:hidden" role="tablist" aria-label="Rashi & Kundali sections">
          {SECTIONS.map((x) => {
            const on = tab === x.value;
            return (
              <button
                key={x.value}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => choose(x.value, true)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition',
                  on ? 'border-primary bg-primary text-white shadow-[var(--shadow-cta)]' : 'border-line bg-white text-ink active:bg-sand',
                )}
              >
                <span className={cn('grid size-9 place-items-center rounded-full', on ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary')}>
                  <Icon name={x.icon} size={18} />
                </span>
                <span>
                  <b className="heading-deva block text-[15px] leading-tight">{x.mr}</b>
                  <span className={cn('block text-xs font-semibold', on ? 'text-white/90' : 'text-primary')}>{x.en}</span>
                  <small className={cn('mt-0.5 block text-[11px] leading-snug', on ? 'text-white/75' : 'text-muted')}>{x.desc}</small>
                </span>
              </button>
            );
          })}
        </div>
        {/* Tablets & computers: tabs */}
        <div className="mt-4 hidden md:block">
          <Tabs id="astro" value={tab} onChange={(v) => choose(v)} tabs={SECTIONS.map((x) => ({ value: x.value, label: `${x.mr} · ${x.en}` }))} />
        </div>
        <div ref={contentRef} className="scroll-mt-20">
          <Reveal key={tab} y={12}>
            {tab === 'rashi' && <RashiCalculator />}
            {tab === 'chart' && <BirthChart />}
            {tab === 'kundali' && <KundaliMatch />}
            {tab === 'muhurat' && <MuhuratCalendar />}
          </Reveal>
        </div>
      </div>
    </>
  );
}
