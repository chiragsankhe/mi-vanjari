import { useQuery } from '@tanstack/react-query';
import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CountUp, ease, Icon, Img, Reveal, Stagger, StaggerItem, VerifiedDot, WarliBand } from '../components/ui';
import { useT } from '../i18n/useT';
import { get } from '../lib/api';
import { cn, formatINR } from '../lib/utils';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';

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
            <Link to={m.to} className="group card card-hover relative block h-full min-h-[220px] overflow-hidden p-6">
              <motion.span whileHover={{ rotate: -8, scale: 1.08 }} className={cn('mb-5 grid size-[52px] place-items-center rounded-full', m.tone)}>
                <Icon name={m.icon} size={26} />
              </motion.span>
              <span className="absolute top-5 right-5 font-serif text-[15px] text-[#c7bcb0] italic">0{i + 1}</span>
              <b className="heading-deva block text-[19px] font-semibold">{m.title}</b>
              <strong className="mt-1 mb-3 block text-[11px] tracking-[0.07em] text-primary uppercase">{m.en}</strong>
              <small className="block max-w-[220px] text-xs leading-relaxed text-muted">{m.desc}</small>
              <span className="absolute right-5 bottom-5 grid size-8 place-items-center rounded-full text-primary transition group-hover:bg-primary group-hover:text-white">
                <Icon name="arrow" size={16} />
              </span>
              <span className="pointer-events-none absolute -right-10 -bottom-10 size-32 rounded-full bg-primary/[0.03] transition-transform duration-500 group-hover:scale-150" />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
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
    ['phone', 'Verify your mobile', 'Sign in with a one-time code. No passwords, no fake accounts.'],
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
      <MatchSection />
      <HowItWorks />
      <ComboBanner />
    </>
  );
}
