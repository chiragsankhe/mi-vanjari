import { useQuery } from '@tanstack/react-query';
import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CountUp, ease, Icon, Img, Reveal, Stagger, StaggerItem, VerifiedDot, WarliBand } from '../components/ui';
import { useT } from '../i18n/useT';
import { get } from '../lib/api';
import { cn, formatINR } from '../lib/utils';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import CategoryTile from './services/CategoryTile';

const HERO = 'https://images.unsplash.com/photo-1774868701808-12c52546b346?auto=format&fit=crop&w=800&q=85';
const STACK = [
  'https://images.unsplash.com/photo-1673413348184-102e17df237c?auto=format&fit=crop&w=120&q=70',
  'https://images.unsplash.com/photo-1786299811172-618ec9e24b24?auto=format&fit=crop&w=120&q=70',
  'https://images.unsplash.com/photo-1763017707379-a7f0dacdb023?auto=format&fit=crop&w=120&q=70',
];

const MODULES = [
  { icon: 'heart', title: 'शुभविवाह', en: 'Matrimonial', desc: 'Find a life partner within our community', tone: 'bg-primary-soft text-primary', to: '/matrimonial' },
  { icon: 'history', title: 'आपला इतिहास', en: 'Community History', desc: 'Know our roots, stories and traditions', tone: 'bg-leaf-soft text-[#32634e]', to: '/community' },
  { icon: 'tent', title: 'लग्न सेवा', en: 'Wedding Services', desc: 'Halls, catering, DJ, makeup and more', tone: 'bg-gold-soft text-[#9c7000]', to: '/services' },
  { icon: 'briefcase', title: 'आपला व्यवसाय', en: 'Business Directory', desc: 'Discover and support Vanjari businesses', tone: 'bg-[#e4eff4] text-[#315c75]', to: '/business' },
  { icon: 'star', title: 'मानाचे तारे', en: 'Achievers', desc: 'Celebrate inspiring community stories', tone: 'bg-[#eee7f4] text-[#6f4c7e]', to: '/achievers' },
  { icon: 'zodiac', title: 'राशी आणि कुंडली', en: 'Rashi & Kundali', desc: 'Traditional astrological guidance', tone: 'bg-[#f2e5e2] text-[#7b3025]', to: '/astrology' },
];

const modulePhoto = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=720&q=70`;
/** Photo behind each module card (and where the picture is anchored when cropped). */
const MODULE_IMAGES = {
  '/matrimonial': [modulePhoto('1754782921180-674165dec130'), 'center 40%'], // couple under a flower chandelier
  '/community': [modulePhoto('1712186870325-00427d06341a'), 'center 40%'], // Maharashtra hill fort
  '/services': [modulePhoto('1587271636175-90d58cdad458'), 'center 35%'], // flower mandap
  '/business': [modulePhoto('1763291966927-740c48e6afe5'), 'center'], // textile market stall
  '/achievers': [modulePhoto('1773212902287-94f6df597e6d'), 'center 30%'], // graduates with certificates and garlands
  '/astrology': [modulePhoto('1771775606126-1bdf21d19205'), 'center'], // zodiac clock
};

function Hero() {
  const t = useT();
  const openAuth = useUI((s) => s.openAuth);
  const authed = useAuth((s) => s.status === 'authed');
  const navigate = useNavigate();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => get('/community/stats'), staleTime: 300_000 });

  const statItems = [
    [stats?.members ?? 0, t('stat_members')],
    [stats?.connections ?? 0, t('stat_connections')],
    [stats?.businesses ?? 0, t('stat_businesses')],
  ];

  return (
    <section ref={ref} className="lattice relative overflow-hidden bg-[radial-gradient(circle_at_88%_20%,rgba(212,160,23,0.17),transparent_26%),linear-gradient(125deg,#fff9f0_0%,#f9eddd_100%)]">
      <div className="pointer-events-none absolute top-[6%] right-[6%] hidden size-[360px] rounded-full border border-primary/15 lg:block" />
      <div className="pointer-events-none absolute top-[10%] right-[8%] hidden size-[300px] animate-spin-slow rounded-full border border-dashed border-primary/15 lg:block" />

      <div className="container-page relative grid items-center gap-10 py-12 md:min-h-[640px] md:py-14 lg:grid-cols-[1.03fr_0.97fr]">
        <div className="relative z-10 text-center lg:text-left">
          <motion.p initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="eyebrow heading-deva mb-5 justify-center normal-case lg:justify-start">
            {t('hero_eyebrow')}
          </motion.p>
          <h1 className="heading-deva text-[46px] leading-[1.1] font-bold tracking-[-0.03em] sm:text-[60px] lg:text-[clamp(56px,6vw,84px)]">
            {['आपली माणसं.', 'आपलं जग.'].map((line, i) => (
              <motion.span key={line} className={cn('block', i === 1 && 'text-primary')} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 + i * 0.15, ease }}>
                {line}
              </motion.span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-3 mb-5 font-serif text-lg text-[#8a7a6d] md:text-xl">
            {t('hero_en')}
          </motion.p>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mx-auto max-w-[550px] text-sm leading-[1.8] text-muted md:text-[15px] lg:mx-0">
            {t('hero_sub')}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mx-auto mt-8 mb-10 flex w-full max-w-[320px] flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:justify-start">
            <button className="btn btn-primary group" onClick={() => (authed ? navigate('/matrimonial') : openAuth())}>
              {authed ? t('explore_profiles') : t('join_long')} <Icon name="arrow" size={18} className="transition group-hover:translate-x-1" />
            </button>
            <button className="btn btn-outline" onClick={() => document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })}>
              {t('explore')}
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="flex justify-center lg:justify-start">
            {statItems.map(([n, label], i) => (
              <div key={label} className={cn('px-4 sm:px-7', i === 0 && 'pl-0', i < 2 && 'border-r border-line', i === 2 && 'pr-0')}>
                <strong className="block font-serif text-xl sm:text-2xl">
                  <CountUp to={n} />
                  <sup className="text-sm text-primary">+</sup>
                </strong>
                <span className="text-[9px] tracking-[0.08em] text-muted uppercase sm:text-[10px]">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div style={{ y }} className="relative z-10 mx-auto grid h-[400px] w-full max-w-[520px] place-items-center sm:h-[520px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.2 }}
            className="relative h-[370px] w-[270px] rounded-[180px_180px_22px_22px] border border-primary/40 p-[11px] sm:h-[490px] sm:w-[360px]"
          >
            <img src={HERO} alt="Vanjari community member in traditional Maharashtrian attire" className="size-full rounded-[170px_170px_14px_14px] object-cover object-[center_25%] saturate-[0.85]" />
            <span className="absolute -top-2.5 -right-2.5 size-11 border-t-2 border-r-2 border-gold" />
            <span className="absolute -bottom-2.5 -left-2.5 size-11 border-b-2 border-l-2 border-gold" />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, duration: 0.6 }} className="absolute bottom-4 left-0 sm:bottom-14">
            <div className="flex animate-float items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3 shadow-[0_16px_40px_rgba(58,36,20,0.13)]">
              <span className="flex">
                {STACK.map((s, i) => (
                  <img key={s} src={s} alt="" className={cn('size-7 rounded-full border-2 border-white object-cover', i && '-ml-2')} />
                ))}
              </span>
              <span>
                <b className="block text-xs">{t('growing')}</b>
                <small className="text-[10px] text-muted">
                  {stats?.joinedThisMonth ?? 0}+ {t('joined_month')}
                </small>
              </span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.15, duration: 0.6 }} className="absolute top-12 right-0 sm:top-24 sm:-right-4">
            <div className="flex animate-float items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3 shadow-[0_16px_40px_rgba(58,36,20,0.13)] [animation-delay:1.5s]">
              <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon name="shield" size={17} />
              </span>
              <span>
                <b className="block text-xs">{t('trusted')}</b>
                <small className="text-[10px] text-muted">{t('phone_verified')}</small>
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Modules() {
  const t = useT();
  return (
    <section id="explore" className="container-page scroll-mt-24 py-14 md:py-20">
      <Reveal className="mb-9 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-4">{t('modules_eyebrow')}</p>
          <h2 className="heading-deva text-[28px] font-semibold md:text-[clamp(28px,3vw,40px)]">तुमच्यासाठी, आपल्या सगळ्यांसाठी</h2>
          <p className="mt-1 text-sm text-muted">{t('modules_sub')}</p>
        </div>
      </Reveal>
      <Stagger className="no-scrollbar -mr-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pr-4 pb-2 sm:mr-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pr-0 lg:grid-cols-3">
        {MODULES.map((m, i) => (
          <StaggerItem key={m.en} className="min-w-[250px] snap-start sm:min-w-0">
            <Link to={m.to} className="group relative isolate block h-full min-h-[230px] overflow-hidden rounded-xl bg-gradient-to-br from-primary-dark to-primary text-white shadow-[var(--shadow-card)] md:min-h-[250px]">
              {MODULE_IMAGES[m.to] && <img src={MODULE_IMAGES[m.to][0]} alt="" loading="lazy" style={{ objectPosition: MODULE_IMAGES[m.to][1] }} className="absolute inset-0 -z-10 size-full object-cover transition duration-700 group-hover:scale-110" />}
              <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />
              <div className="flex h-full min-h-[230px] flex-col justify-between p-5 md:min-h-[250px]">
                <div className="flex items-start justify-between">
                  <motion.span whileHover={{ rotate: -8, scale: 1.08 }} className="grid size-[46px] place-items-center rounded-full bg-white/90 text-primary shadow-sm">
                    <Icon name={m.icon} size={23} />
                  </motion.span>
                  <span className="font-serif text-[14px] text-white/70 italic">0{i + 1}</span>
                </div>
                <div>
                  <b className="heading-deva block text-[20px] font-semibold [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">{m.title}</b>
                  <strong className="mt-0.5 mb-2 block text-[11px] tracking-[0.07em] text-[#ffd98a] uppercase">{m.en}</strong>
                  <small className="block max-w-[230px] text-xs leading-relaxed text-white/90">{m.desc}</small>
                </div>
                <span className="absolute right-4 bottom-4 grid size-8 place-items-center rounded-full bg-white/20 text-white transition group-hover:bg-white group-hover:text-primary">
                  <Icon name="arrow" size={16} />
                </span>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/** All wedding-service categories in a carousel that glides continuously and loops (pauses while touched / hovered). */
function ServicesCarousel() {
  const { data: cats = [] } = useQuery({ queryKey: ['service-categories'], queryFn: () => get('/services/categories'), staleTime: 300_000 });
  const ref = useRef(null);
  const paused = useRef(false);
  const resume = useRef(0);
  const SPEED = 42; // pixels per second

  useEffect(() => {
    const el = ref.current;
    if (!el || cats.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = 0;
    let pos = el.scrollLeft;
    let visible = true;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => (visible = e.isIntersecting)) : null;
    io?.observe(el);
    const tick = (t) => {
      // the list is rendered twice; one loop = the distance from the first tile to the start of the copy
      const copy = el.lastElementChild;
      const half = copy && el.firstElementChild ? copy.offsetLeft - el.firstElementChild.offsetLeft : 0;
      const dt = last ? Math.min(t - last, 64) : 16;
      last = t;
      if (paused.current || !visible) {
        pos = el.scrollLeft; // follow manual scrolling, then continue from there
      } else {
        pos += (SPEED * dt) / 1000;
      }
      if (half > 0) {
        if (pos >= half) pos -= half;
        if (pos < 0) pos += half;
        if (!paused.current && visible) el.scrollLeft = pos;
        else if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [cats.length]);

  const hold = () => {
    paused.current = true;
    clearTimeout(resume.current);
  };
  const release = (delay = 1200) => {
    clearTimeout(resume.current);
    resume.current = setTimeout(() => (paused.current = false), delay);
  };
  const go = (dir) => {
    const el = ref.current;
    if (!el) return;
    hold();
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: 'smooth' });
    release(1600);
  };

  if (!cats.length) return null;
  const tile = (c, i, copy) => <CategoryTile key={`${copy}-${c.id}`} c={c} index={i} className="h-[170px] w-[44vw] max-w-[250px] min-w-[160px] shrink-0 sm:h-[190px] sm:w-[230px]" />;
  const allTile = (copy) => (
    <Link key={`${copy}-all`} to="/services" className="flex h-[170px] w-[44vw] max-w-[250px] min-w-[160px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl bg-primary p-4 text-center text-[13px] font-bold text-white shadow-[var(--shadow-cta)] sm:h-[190px] sm:w-[230px]">
      All services <Icon name="arrow" size={18} />
    </Link>
  );
  return (
    <section className="bg-[#fbf7f1] py-10 md:py-14" aria-label="Wedding services">
      <div className="container-page">
        <Reveal className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">लग्न सेवा · Wedding services</p>
            <h2 className="heading-deva text-[24px] font-semibold md:text-[clamp(26px,3vw,36px)]">लग्नाची प्रत्येक सेवा, एकाच ठिकाणी</h2>
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button type="button" onClick={() => go(-1)} className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink transition hover:border-primary hover:text-primary" aria-label="Previous services">
              <Icon name="chevron-left" size={18} />
            </button>
            <button type="button" onClick={() => go(1)} className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink transition hover:border-primary hover:text-primary" aria-label="Next services">
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        </Reveal>
        <div
          ref={ref}
          onMouseEnter={hold}
          onMouseLeave={() => release(400)}
          onTouchStart={hold}
          onTouchEnd={() => release(1500)}
          onFocus={hold}
          onBlur={() => release(400)}
          className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        >
          {cats.map((c, i) => tile(c, i, 'a'))}
          {allTile('a')}
          {/* second copy makes the loop seamless; hidden from screen readers and the tab order */}
          <div className="flex shrink-0 gap-3" aria-hidden="true" inert="">
            {cats.map((c, i) => tile(c, i, 'b'))}
            {allTile('b')}
          </div>
        </div>
      </div>
    </section>
  );
}

function MatchSection() {
  const t = useT();
  const authed = useAuth((s) => s.status === 'authed');
  const openAuth = useUI((s) => s.openAuth);
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({ queryKey: ['featured-profiles'], queryFn: () => get('/matrimonial/featured') });
  const go = (to) => (authed ? navigate(to) : openAuth(to));

  return (
    <section className="relative overflow-hidden bg-primary-dark text-white">
      <span className="pointer-events-none absolute -bottom-24 -left-20 size-60 rounded-full border border-white/10" />
      <span className="pointer-events-none absolute -top-16 right-10 size-40 rounded-full border border-white/5" />
      <div className="container-page grid gap-10 py-14 md:py-[70px] lg:grid-cols-[0.72fr_1.5fr] lg:gap-[5vw]">
        <Reveal>
          <p className="eyebrow eyebrow-light mb-4">{t('match_eyebrow')}</p>
          <h2 className="heading-deva text-[37px] leading-[1.2] font-semibold md:text-[44px]">
            शोधा तुमचा
            <br />
            जीवनसाथी
          </h2>
          <p className="mt-4 text-sm leading-[1.7] text-[#e1c7bd]">{t('match_sub')}</p>
          <ul className="mt-5 space-y-2 text-[13px] text-[#f1d9cf]">
            {['Private profiles stay blurred until you approve', 'Chat only after an accepted follow', 'Kundali (Guna Milan) score on every match'].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <Icon name="check" size={15} className="text-gold" /> {x}
              </li>
            ))}
          </ul>
          <button className="btn btn-cream mt-7" onClick={() => go('/matrimonial')}>
            {t('explore_profiles')} <Icon name="arrow" size={17} />
          </button>
        </Reveal>
        <Stagger className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {(isLoading ? Array.from({ length: 3 }) : data.slice(0, 3)).map((p, i) => (
            <StaggerItem key={p?.userId || i} className="min-w-[220px] sm:min-w-0">
              {p ? (
                <motion.button whileHover={{ y: -6 }} onClick={() => go(`/profile/${p.userId}`)} className="relative block w-full overflow-hidden rounded-xl bg-white text-left text-ink">
                  <Img src={p.photoUrl} alt={p.fullName} fallbackIcon="user" className="h-[250px] w-full object-cover object-top sm:h-[230px]" />
                  <span className="absolute top-2.5 left-2.5 rounded-full border border-[#e9c360] bg-[#fff5da] px-2.5 py-1 text-[10px] font-bold text-[#8c6100]">{p.matchScore}% match</span>
                  <div className="p-4">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      {p.fullName} {p.isVerified && <VerifiedDot />}
                    </h3>
                    <p className="mt-1 text-[11px] text-muted">
                      {p.age} yrs · {p.currentCity}
                    </p>
                    <small className="text-[11px] text-muted">{p.occupation || p.education}</small>
                  </div>
                </motion.button>
              ) : (
                <div className="h-[330px] rounded-xl bg-white/10" />
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function ComboBanner() {
  const t = useT();
  const { data = [] } = useQuery({ queryKey: ['combos'], queryFn: () => get('/services/combos') });
  const combo = data.find((c) => c.isFeatured) || data[0];
  if (!combo) return null;
  const saving = combo.originalPrice ? combo.originalPrice - combo.price : 0;
  return (
    <section className="container-page py-14 md:py-20">
      <Reveal>
        <div className="grid items-center gap-6 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)] md:grid-cols-[210px_1fr_auto] md:gap-8 md:px-10 md:py-6">
          <motion.div whileHover={{ scale: 1.03 }} className="flex h-[140px] flex-col items-center justify-center rounded-[100px_100px_10px_10px] bg-[#f4eadc] text-primary md:h-40">
            <Icon name="tent" size={54} />
            <span className="heading-deva mt-2 text-base font-bold">शुभ मंगल</span>
          </motion.div>
          <div>
            <span className="text-[10px] font-extrabold tracking-[0.16em] text-primary uppercase">{t('special_combo')}</span>
            <h2 className="my-2 font-serif text-2xl md:text-[28px]">{combo.title}</h2>
            <p className="text-xs text-muted">{combo.includes.join(' + ')} · Trusted community providers</p>
            <div className="mt-3.5 flex flex-wrap items-center gap-3">
              <strong className="font-serif text-[22px] font-bold">{formatINR(combo.price)}</strong>
              {combo.originalPrice && <del className="text-xs text-[#999]">{formatINR(combo.originalPrice)}</del>}
              {saving > 0 && <span className="rounded bg-leaf-soft px-2 py-1 text-[10px] font-bold text-leaf">SAVE {formatINR(saving)}</span>}
            </div>
          </div>
          <Link to="/services/combos" className="btn btn-primary w-full md:w-auto">
            {t('view_package')} <Icon name="arrow" size={17} />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ['phone', 'Sign up in a minute', 'Use Google, your email or mobile number. A one-time code, no passwords.'],
    ['user', 'Create your profile', 'Add family, education and preferences. Choose public or private.'],
    ['users', 'Connect with trust', 'Send follow requests, chat after approval, and involve your family.'],
  ];
  return (
    <section className="border-y border-line bg-[#fbf7f1]">
      <div className="container-page py-14 md:py-16">
        <Reveal className="mb-10 text-center">
          <p className="eyebrow mb-3 justify-center">Simple & safe</p>
          <h2 className="heading-deva text-[28px] font-semibold md:text-4xl">तीन सोप्या पायऱ्या</h2>
        </Reveal>
        <Stagger className="grid gap-5 md:grid-cols-3">
          {steps.map(([icon, title, desc], i) => (
            <StaggerItem key={title} className="relative rounded-xl bg-white p-6 text-center shadow-[var(--shadow-card)]">
              <span className="absolute top-4 left-5 font-serif text-4xl text-primary/10 italic">{i + 1}</span>
              <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary text-white shadow-[var(--shadow-cta)]">
                <Icon name={icon} size={24} />
              </span>
              <h3 className="font-serif text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{desc}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <WarliBand />
      <Modules />
      <ServicesCarousel />
      <MatchSection />
      <HowItWorks />
      <ComboBanner />
    </>
  );
}
