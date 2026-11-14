import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { CountUp, Icon } from '../ui';
import { DownloadCardButton } from './DownloadCard';
import { KundaliShareCard } from './ShareCards';

const LEVEL = {
  excellent: 'text-leaf bg-leaf-soft border-leaf/20',
  good: 'text-leaf bg-leaf-soft border-leaf/20',
  average: 'text-[#8c6100] bg-[#fff5da] border-[#e9c360]',
  low: 'text-primary bg-primary-soft border-primary/20',
};

const KOOTA_STATUS = {
  good: { label: 'Good', icon: 'check', cls: 'bg-leaf-soft text-leaf', bar: 'bg-leaf' },
  average: { label: 'Average', icon: 'minus', cls: 'bg-[#fff5da] text-[#8c6100]', bar: 'bg-gold' },
  concern: { label: 'Concern', icon: 'info', cls: 'bg-primary-soft text-primary', bar: 'bg-primary/50' },
};

const slug = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

/** Guna Milan (Ashtakoota) report: score ring, what's good / to consider, doshas, koota-by-koota explanation. */
export function KundaliResult({ result, boyName = 'Groom', girlName = 'Bride' }) {
  const pct = result.total / result.max;
  const R = 54;
  const C = 2 * Math.PI * R;
  const p = result.people;

  return (
    <div className="space-y-6">
      {/* ── Score ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative size-[150px] shrink-0">
          <svg viewBox="0 0 128 128" className="size-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="#f1e6da" strokeWidth="10" />
            <motion.circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="url(#gunaGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - pct) }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
            <defs>
              <linearGradient id="gunaGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d4a017" />
                <stop offset="100%" stopColor="#c8411a" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <b className="block font-serif text-4xl">
                <CountUp to={result.total} duration={1.2} />
              </b>
              <span className="text-xs text-muted">of {result.max} gunas</span>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span className={cn('inline-block rounded-full border px-3 py-1 text-xs font-bold', LEVEL[result.verdict.level])}>{result.verdict.label}</span>
          <h3 className="heading-deva mt-2 text-2xl font-semibold">{result.verdict.mr}</h3>
          <p className="mt-1 text-sm text-muted">
            {boyName} &amp; {girlName}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {(result.doshaDetails || []).filter((d) => d.key !== 'gana').map((d) => (
              <span key={d.key} className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', d.cancelled ? 'bg-[#fff5da] text-[#8c6100]' : 'bg-primary-soft text-primary')}>
                {d.name} {d.cancelled ? '· mitigated' : 'present'}
              </span>
            ))}
            {!result.doshas.nadi && !result.doshas.bhakoot && (
              <span className="flex items-center gap-1 rounded-full bg-leaf-soft px-2.5 py-1 text-[11px] font-semibold text-leaf">
                <Icon name="check" size={12} /> No Nadi or Bhakoot dosha
              </span>
            )}
          </div>
        </div>
        <DownloadCardButton
          className="shrink-0"
          label="Download report"
          filename={`kundali-${slug(boyName)}-${slug(girlName)}.png`}
          card={() => <KundaliShareCard result={result} boyName={boyName} girlName={girlName} />}
        />
      </div>

      {result.summary && <p className="rounded-xl bg-sand/70 px-4 py-3 text-sm leading-relaxed">{result.summary}</p>}

      {/* ── Both charts side by side ──────────────────────── */}
      {p && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="bg-sand/60 text-left text-[11px] tracking-wider text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold" />
                <th className="px-4 py-2.5 font-semibold">Groom · वर</th>
                <th className="px-4 py-2.5 font-semibold">Bride · वधू</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Rashi', <><span className="mr-1">{p.boy.symbol}</span>{p.boy.rashi} · <span className="heading-deva">{p.boy.rashiMr}</span></>, <><span className="mr-1">{p.girl.symbol}</span>{p.girl.rashi} · <span className="heading-deva">{p.girl.rashiMr}</span></>],
                ['Nakshatra', `${p.boy.nakshatra}${p.boy.pada ? ` · pada ${p.boy.pada}` : ''}`, `${p.girl.nakshatra}${p.girl.pada ? ` · pada ${p.girl.pada}` : ''}`],
                ['Gana', p.boy.gana, p.girl.gana],
                ['Nadi', p.boy.nadi, p.girl.nadi],
                ['Yoni', p.boy.yoni, p.girl.yoni],
                ['Rashi lord', p.boy.lord, p.girl.lord],
              ].map(([k, a, b]) => (
                <tr key={k} className="border-t border-line">
                  <td className="px-4 py-2 text-xs text-muted">{k}</td>
                  <td className="px-4 py-2 font-medium">{a}</td>
                  <td className="px-4 py-2 font-medium">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Good vs. to consider ──────────────────────────── */}
      {result.strengths && (
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-leaf/20 bg-leaf-soft/60 p-5">
            <h4 className="flex items-center gap-2 font-semibold text-leaf">
              <span className="grid size-7 place-items-center rounded-full bg-leaf text-white"><Icon name="check" size={15} /></span>
              What’s good <span className="heading-deva text-sm font-normal">· जमेची बाजू</span>
            </h4>
            <ul className="mt-3 space-y-3">
              {result.strengths.length ? (
                result.strengths.map((s) => (
                  <li key={s.key} className="text-sm leading-snug">
                    <b className="block text-[13px]">{s.title}</b>
                    <span className="text-[#3f4a43]">{s.text}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted">None of the kootas scored strongly for this pair.</li>
              )}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-primary/20 bg-primary-soft/50 p-5">
            <h4 className="flex items-center gap-2 font-semibold text-primary">
              <span className="grid size-7 place-items-center rounded-full bg-primary text-white"><Icon name="info" size={15} /></span>
              Things to consider <span className="heading-deva text-sm font-normal">· विचार करावा</span>
            </h4>
            <ul className="mt-3 space-y-3">
              {result.concerns.length ? (
                result.concerns.map((s) => (
                  <li key={s.key} className="text-sm leading-snug">
                    <b className="block text-[13px]">
                      {s.title} {s.mitigated && <span className="ml-1 rounded-full bg-[#fff5da] px-2 py-0.5 text-[10px] font-bold text-[#8c6100]">mitigated</span>}
                    </b>
                    <span className="text-[#5a4a44]">{s.text}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted">No major concerns — no Nadi or Bhakoot dosha and no weak koota.</li>
              )}
            </ul>
          </motion.div>
        </div>
      )}

      {/* ── Doshas: exception & remedy ────────────────────── */}
      {result.doshaDetails?.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-serif text-lg font-semibold">Dosha details · दोष</h4>
          {result.doshaDetails.map((d) => (
            <div key={d.key} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <b>{d.name}</b> <span className="heading-deva text-sm text-muted">{d.mr}</span>
                <span className={cn('ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold', d.cancelled ? 'bg-[#fff5da] text-[#8c6100]' : 'bg-primary-soft text-primary')}>
                  {d.cancelled ? 'Exception applies' : 'Present'}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-muted">{d.about}</p>
              {d.exception && (
                <p className="mt-1.5 text-sm">
                  <b className="text-leaf">Exception (parihar):</b> {d.exception}.
                </p>
              )}
              <p className="mt-1.5 text-sm">
                <b>What families usually do:</b> {d.remedy}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Koota by koota ────────────────────────────────── */}
      <div>
        <h4 className="mb-3 font-serif text-lg font-semibold">Koota by koota · अष्टकूट</h4>
        <div className="divide-y divide-line rounded-xl border border-line bg-white">
          {result.kootas.map((k, i) => {
            const st = KOOTA_STATUS[k.level] || KOOTA_STATUS.average;
            return (
              <div key={k.key} className="px-4 py-3.5">
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[170px_1fr_auto]">
                  <div>
                    <b className="text-sm">{k.name}</b> <span className="heading-deva text-xs text-muted">{k.mr}</span>
                    <small className="block text-[11px] text-muted">{k.about}</small>
                  </div>
                  <div className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-[#f1e6da] sm:order-none sm:col-span-1">
                    <motion.div
                      className={cn('h-full rounded-full', st.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${(k.score / k.max) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06 }}
                    />
                  </div>
                  <span className="flex items-center gap-2 justify-self-end">
                    <span className={cn('hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-flex', st.cls)}>
                      <Icon name={st.icon} size={11} /> {st.label}
                    </span>
                    <b className="w-11 text-right font-serif text-sm">
                      {k.score}/{k.max}
                    </b>
                  </span>
                </div>
                {k.detail && <p className="mt-2 text-[13px] leading-snug text-[#5c544d]">{k.detail}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted">
        Calculated from Moon sign &amp; nakshatra (Lahiri ayanamsa, IST). Guna Milan is one traditional input — please consult your family priest or a trusted jyotishi for important decisions.
      </p>
    </div>
  );
}
