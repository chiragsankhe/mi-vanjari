import { motion } from 'motion/react';
import { useState } from 'react';
import { NAKSHATRA_INFO, RASHI_INFO } from '../../lib/rashiInfo';
import { cn } from '../../lib/utils';
import { Icon, Modal } from '../ui';
import { DownloadCardButton } from './DownloadCard';
import { RashiShareCard } from './ShareCards';

const slug = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my';

export function RashiDownloadButton({ rashi, nakshatra, pada, name, className, label = 'Download report' }) {
  return (
    <DownloadCardButton
      className={className}
      label={label}
      filename={`rashi-${slug(rashi)}${name ? `-${slug(name)}` : ''}.png`}
      card={() => <RashiShareCard rashi={rashi} nakshatra={nakshatra} pada={pada} name={name} />}
    />
  );
}

function Section({ icon, title, mr, tone = 'plain', children, delay = 0 }) {
  const tones = {
    plain: 'border-line bg-white',
    good: 'border-leaf/20 bg-leaf-soft/60',
    warn: 'border-primary/20 bg-primary-soft/50',
    gold: 'border-gold/40 bg-gold-soft/50',
  };
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className={cn('rounded-xl border p-5', tones[tone])}>
      <h4 className="mb-2.5 flex items-center gap-2 font-semibold">
        <Icon name={icon} size={17} className={tone === 'good' ? 'text-leaf' : tone === 'warn' ? 'text-primary' : 'text-[#b0876a]'} />
        {title} {mr && <span className="heading-deva text-sm font-normal text-muted">· {mr}</span>}
      </h4>
      {children}
    </motion.section>
  );
}

/** Detailed rashi + nakshatra reading. Works from names alone, so it can be shown for any profile. */
export function RashiDetails({ rashi, nakshatra, pada }) {
  const r = RASHI_INFO[rashi];
  const n = NAKSHATRA_INFO[nakshatra];
  if (!r) return null;
  return (
    <div className="space-y-4">
      <Section icon="sparkle" title={`About ${rashi}`} mr={r.mr}>
        <p className="text-sm leading-relaxed">{r.overview}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.traits.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section icon="check" title="Strengths" mr="गुण" tone="good" delay={0.05}>
          <ul className="space-y-1.5 text-sm">
            {r.strengths.map((s) => (
              <li key={s} className="flex gap-2"><span className="text-leaf">✓</span>{s}</li>
            ))}
          </ul>
        </Section>
        <Section icon="info" title="Watch out for" mr="काळजी" tone="warn" delay={0.1}>
          <ul className="space-y-1.5 text-sm">
            {r.challenges.map((s) => (
              <li key={s} className="flex gap-2"><span className="text-primary">•</span>{s}</li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section icon="briefcase" title="Career" mr="करिअर" delay={0.15}>
          <div className="flex flex-wrap gap-1.5">
            {r.career.map((c) => (
              <span key={c} className="rounded-md bg-sand px-2.5 py-1 text-xs">{c}</span>
            ))}
          </div>
          <h5 className="mt-4 mb-1 text-sm font-semibold">Health · <span className="heading-deva font-normal">आरोग्य</span></h5>
          <p className="text-sm text-muted">{r.health}</p>
        </Section>
        <Section icon="heart" title="Love & marriage" mr="विवाह" delay={0.2}>
          <p className="text-sm text-muted">{r.love}</p>
          <h5 className="mt-3 mb-1.5 text-xs font-semibold tracking-wider text-muted uppercase">Most compatible rashis</h5>
          <div className="flex flex-wrap gap-1.5">
            {r.bestMatches.map((m) => (
              <span key={m} className="flex items-center gap-1 rounded-full border border-primary/20 bg-white px-2.5 py-1 text-xs">
                <span>{RASHI_INFO[m].symbol}</span> <span className="heading-deva">{RASHI_INFO[m].mr}</span> · {m}
              </span>
            ))}
          </div>
        </Section>
      </div>

      <Section icon="star" title="Lucky for you" mr="शुभ गोष्टी" tone="gold" delay={0.25}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {[
            ['Ruling planet', `${r.lord} · ${r.lordMr}`],
            ['Element', r.element],
            ['Nature', r.quality],
            ['Direction', r.lucky.direction],
            ['Day', r.lucky.day],
            ['Numbers', r.lucky.numbers],
            ['Colour', r.lucky.colour],
            ['Deity', r.lucky.deity],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] tracking-[0.12em] text-muted uppercase">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm">
          <b>Gemstone:</b> {r.lucky.gem}
        </p>
        <p className="mt-2 text-sm">
          <b>Mantra:</b> <span className="heading-deva text-base text-primary">{r.mantra}</span>
        </p>
      </Section>

      {n && (
        <Section icon="moon" title={`Nakshatra: ${nakshatra}`} mr={n.mr} delay={0.3}>
          <p className="text-sm">{n.trait}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {[
              ['Deity', n.deity],
              ['Symbol', n.symbol],
              ['Lord', n.lord],
              ['Nature', n.nature],
              ['Gana', n.gana],
              ['Nadi', n.nadi],
              ['Yoni', n.yoni],
              ['Pada', pada || '—'],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[10px] tracking-[0.12em] text-muted uppercase">{k}</dt>
                <dd className="mt-0.5 text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] text-muted">Gana and Nadi are used in Kundali matching (Guna Milan).</p>
        </Section>
      )}
    </div>
  );
}

/**
 * The rashi name shown on a profile, as a button that opens the full report (with download).
 * Usage: <RashiLink rashi="Tula" nakshatra="Swati" name="Aditya" />
 */
export function RashiLink({ rashi, nakshatra, name, className }) {
  const [open, setOpen] = useState(false);
  const r = RASHI_INFO[rashi];
  if (!r) return <span className={className}>{rashi}</span>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn('inline-flex items-center gap-1 font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary', className)}>
        {r.symbol} {rashi} <Icon name="chevron-right" size={13} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="sm:w-[min(760px,100%)]" label={`${rashi} rashi report`}>
        <div>
          <div className="relative overflow-hidden bg-primary-dark p-6 text-white sm:p-8 sm:pr-16">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <span className="grid size-24 shrink-0 place-items-center rounded-full border-2 border-gold/60 bg-white/10 text-5xl">{r.symbol}</span>
              <div className="text-center sm:text-left">
                {name && <p className="eyebrow eyebrow-light mb-1 justify-center sm:justify-start">{name}’s rashi</p>}
                <h3 className="heading-deva text-4xl font-bold">{r.mr}</h3>
                <p className="font-serif text-lg text-[#f1d9cf]">
                  {rashi} · {r.en}
                  {nakshatra && ` · ${nakshatra}`}
                </p>
              </div>
              <RashiDownloadButton rashi={rashi} nakshatra={nakshatra} name={name} className="border-white/40 bg-white/10 text-white hover:bg-white/20 sm:ml-auto" />
            </div>
          </div>
          <div className="p-5 sm:p-7">
            <RashiDetails rashi={rashi} nakshatra={nakshatra} />
          </div>
        </div>
      </Modal>
    </>
  );
}
