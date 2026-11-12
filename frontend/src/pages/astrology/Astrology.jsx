import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BirthChartShareCard, KundaliChart, PlanetTable } from '../../components/astrology/KundaliChart';
import { DownloadCardButton } from '../../components/common/DownloadCard';
import { MuhuratPlanner } from '../../components/astrology/MuhuratPlanner';
import { PlaceInput } from '../../components/common/PlaceInput';
import { KundaliResult } from '../../components/common/KundaliResult';
import { RashiDetails, RashiDownloadButton } from '../../components/common/RashiReport';
import { Badge, Field, Icon, PageHeader, Reveal, Spinner, Tabs } from '../../components/ui';
import { errorMessage, post } from '../../lib/api';
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
      <PlaceInput value={value.place} onChange={(text, pl) => onChange({ ...value, place: text, geo: pl ? { lat: pl.lat, lon: pl.lon, tz: pl.tz } : undefined })} hint="Search any village, taluka or city in India" />
    </fieldset>
  );
}

const fileName = (name) => `kundali-${(name || 'birth-chart').toLowerCase().replace(/\s+/g, '-')}.png`;

/** Janma Kundali: North Indian chart with Lagna, nine grahas and houses. */
function BirthChart() {
  const me = useAuth((s) => s.user?.profile);
  const lang = useUI((s) => s.lang);
  const [v, setV] = useState({ name: me?.fullName || '', dob: me?.dateOfBirth || '', tob: me?.timeOfBirth || '', place: me?.placeOfBirth || '' });
  const m = useMutation({ mutationFn: () => post('/astrology/kundali', { dob: v.dob, tob: v.tob || undefined, place: v.place || undefined, ...v.geo }), onError: (e) => toast.error(errorMessage(e)) });
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
  const m = useMutation({ mutationFn: () => post('/astrology/rashi', { dob: v.dob, tob: v.tob || undefined, place: v.place || undefined, ...v.geo }), onError: (e) => toast.error(errorMessage(e)) });
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
              note={`Moon at ${r.degreeInSign}° in ${r.rashi.name} (sidereal, Lahiri). Nadi: ${r.nakshatra.nadiName} · Yoni: ${r.nakshatra.yoni}`}
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
              Moon at {r.degreeInSign}° in {r.rashi.name} (sidereal, Lahiri). Nadi: {r.nakshatra.nadiName} · Yoni: {r.nakshatra.yoni}{r.place?.matched ? ` · Born at ${r.place.name}` : ''}
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

/** Birth details for the API: time left out when empty, chosen place coordinates flattened in. */
const withGeo = ({ geo, ...v }) => ({ ...v, tob: v.tob || undefined, place: v.place || undefined, ...geo });

function KundaliMatch() {
  const empty = { name: '', dob: '', tob: '', place: '' };
  const [boy, setBoy] = useState(empty);
  const [girl, setGirl] = useState(empty);
  const m = useMutation({
    mutationFn: () => post('/astrology/match', { boy: withGeo(boy), girl: withGeo(girl) }),
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
            {tab === 'muhurat' && <MuhuratPlanner />}
          </Reveal>
        </div>
      </div>
    </>
  );
}
