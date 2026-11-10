import { MADE_BY } from '../../lib/credits';
import { NAKSHATRA_INFO, RASHI_INFO } from '../../lib/rashiInfo';

/**
 * Fixed-width (760px) cards used only for PNG downloads (see DownloadCard.jsx).
 * No animation, no responsive classes — what you see is exactly what gets saved.
 */

const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

function CardShell({ eyebrow, children }) {
  return (
    <div style={{ width: 760 }} className="overflow-hidden rounded-[28px] bg-[#fdf6ec] font-sans text-ink">
      <div className="flex items-center justify-between bg-[linear-gradient(120deg,#9e2e0f,#c8411a_55%,#d4a017)] px-9 py-6 text-white">
        <div className="flex items-center gap-3">
          <span className="heading-deva grid size-12 place-items-center rounded-full bg-white text-2xl font-bold text-primary">मि</span>
          <div>
            <b className="heading-deva block text-xl leading-tight">मी वंजारी</b>
            <small className="text-[12px] text-white/80">आपली माणसं, आपलं जग</small>
          </div>
        </div>
        <span className="rounded-full border border-white/40 px-4 py-1.5 text-[12px] font-semibold tracking-[0.14em] uppercase">{eyebrow}</span>
      </div>
      <div className="px-9 py-8">{children}</div>
      <div className="flex justify-between border-t border-line px-9 py-4 text-[11px] text-muted">
        <span>Moon sign &amp; nakshatra · Lahiri ayanamsa · Indian Standard Time</span>
        <span>
          Generated {today()} · Mi Vanjari · {MADE_BY}
        </span>
      </div>
    </div>
  );
}

const STATUS = {
  good: { label: 'Good', cls: 'bg-leaf-soft text-leaf' },
  average: { label: 'Average', cls: 'bg-[#fff5da] text-[#8c6100]' },
  concern: { label: 'Concern', cls: 'bg-primary-soft text-primary' },
};

export function KundaliShareCard({ result, boyName, girlName }) {
  const p = result.people;
  return (
    <CardShell eyebrow="Kundali match · कुंडली जुळणी">
      <div className="flex items-center gap-8">
        <div className="grid size-[150px] shrink-0 place-items-center rounded-full border-[10px] border-[#f1e6da] bg-white text-center" style={{ borderTopColor: '#c8411a', borderRightColor: result.total / result.max > 0.5 ? '#d4a017' : '#f1e6da' }}>
          <div>
            <b className="block font-serif text-5xl">{result.total}</b>
            <small className="text-xs text-muted">of {result.max} gunas</small>
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-serif text-[28px] leading-tight font-semibold">
            {boyName} <span className="text-primary">♥</span> {girlName}
          </p>
          <p className="heading-deva mt-2 text-2xl font-semibold text-primary">{result.verdict.mr}</p>
          <p className="text-sm font-semibold">{result.verdict.label}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{result.summary}</p>
        </div>
      </div>

      {p && (
        <table className="mt-7 w-full overflow-hidden rounded-2xl border border-line bg-white text-[13px]">
          <thead>
            <tr className="bg-sand text-left text-[11px] tracking-wider text-muted uppercase">
              <th className="px-4 py-2.5 font-semibold" />
              <th className="px-4 py-2.5 font-semibold">Groom · {boyName}</th>
              <th className="px-4 py-2.5 font-semibold">Bride · {girlName}</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Rashi', `${p.boy.symbol} ${p.boy.rashi} · ${p.boy.rashiMr}`, `${p.girl.symbol} ${p.girl.rashi} · ${p.girl.rashiMr}`],
              ['Nakshatra', `${p.boy.nakshatra}${p.boy.pada ? ` (pada ${p.boy.pada})` : ''}`, `${p.girl.nakshatra}${p.girl.pada ? ` (pada ${p.girl.pada})` : ''}`],
              ['Gana · Nadi', `${p.boy.gana} · ${p.boy.nadi}`, `${p.girl.gana} · ${p.girl.nadi}`],
              ['Rashi lord', p.boy.lord, p.girl.lord],
            ].map(([k, a, b]) => (
              <tr key={k} className="border-t border-line">
                <td className="px-4 py-2 text-muted">{k}</td>
                <td className="px-4 py-2 font-medium">{a}</td>
                <td className="px-4 py-2 font-medium">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1.5">
        {result.kootas.map((k) => (
          <div key={k.key} className="flex items-center gap-3 border-b border-line/70 py-1.5 text-[13px]">
            <span className="w-28 shrink-0 font-semibold">
              {k.name} <span className="heading-deva text-[11px] font-normal text-muted">{k.mr}</span>
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f1e6da]">
              <span className={`block h-full rounded-full ${k.level === 'good' ? 'bg-leaf' : k.level === 'average' ? 'bg-gold' : 'bg-primary/50'}`} style={{ width: `${(k.score / k.max) * 100}%` }} />
            </span>
            <b className="w-11 text-right font-serif">
              {k.score}/{k.max}
            </b>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-leaf-soft p-5">
          <b className="text-sm text-leaf">✓ What’s good · जमेची बाजू</b>
          <ul className="mt-2 space-y-2 text-[12.5px] leading-snug">
            {result.strengths.length ? result.strengths.map((s) => <li key={s.key}><b>{s.title.split(' · ')[0]}:</b> {s.text}</li>) : <li className="text-muted">No koota scored strongly.</li>}
          </ul>
        </div>
        <div className="rounded-2xl bg-primary-soft p-5">
          <b className="text-sm text-primary">! Things to consider · विचार करावा</b>
          <ul className="mt-2 space-y-2 text-[12.5px] leading-snug">
            {result.concerns.length ? (
              result.concerns.map((s) => (
                <li key={s.key}>
                  <b>{s.title.split(' · ')[0]}{s.mitigated ? ' (mitigated)' : ''}:</b> {s.text}
                </li>
              ))
            ) : (
              <li className="text-muted">No major concerns — no Nadi or Bhakoot dosha.</li>
            )}
          </ul>
        </div>
      </div>
      <p className="mt-5 text-center text-[11px] text-muted">Guna Milan is one traditional input — please consult your family priest or a trusted jyotishi for important decisions.</p>
    </CardShell>
  );
}

export function RashiShareCard({ rashi, nakshatra, pada, name }) {
  const r = RASHI_INFO[rashi];
  const n = NAKSHATRA_INFO[nakshatra];
  if (!r) return null;
  return (
    <CardShell eyebrow="Rashi report · राशी">
      <div className="flex items-center gap-8">
        <div className="grid size-[140px] shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#c8411a,#9e2e0f)] text-7xl text-white ring-8 ring-gold-soft">{r.symbol}</div>
        <div>
          {name && <p className="text-[12px] font-semibold tracking-[0.14em] text-primary uppercase">{name}’s rashi</p>}
          <p className="heading-deva mt-1 text-5xl leading-[1.35] font-bold">{r.mr}</p>
          <p className="mt-1 font-serif text-xl text-muted">
            {rashi} · {r.en}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.traits.map((t) => (
              <span key={t} className="rounded-full bg-white px-3 py-1 text-[12px] font-medium shadow-sm">{t}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-6 text-[14px] leading-relaxed">{r.overview}</p>

      <div className="mt-6 grid grid-cols-4 gap-3">
        {[
          ['Nakshatra', n ? `${nakshatra}${pada ? ` · pada ${pada}` : ''}` : '—'],
          ['Ruling planet', `${r.lord} · ${r.lordMr}`],
          ['Element', `${r.element} · ${r.quality.split(' ')[0]}`],
          ['Lucky day', r.lucky.day.split(' · ')[0]],
          ['Lucky numbers', r.lucky.numbers],
          ['Lucky colour', r.lucky.colour],
          ['Gemstone', r.lucky.gem.split(' — ')[0]],
          ['Deity', r.lucky.deity],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white p-3">
            <small className="text-[10px] tracking-[0.12em] text-muted uppercase">{k}</small>
            <b className="mt-0.5 block text-[13px] leading-snug">{v}</b>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-leaf-soft p-5">
          <b className="text-sm text-leaf">✓ Strengths · गुण</b>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px]">{r.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="rounded-2xl bg-primary-soft p-5">
          <b className="text-sm text-primary">! Watch out for · काळजी</b>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px]">{r.challenges.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
        <div className="rounded-2xl bg-white p-5">
          <b className="text-sm">Career · करिअर</b>
          <p className="mt-1.5 text-muted">{r.career.join(' · ')}</p>
          <b className="mt-3 block text-sm">Health · आरोग्य</b>
          <p className="mt-1.5 text-muted">{r.health}</p>
        </div>
        <div className="rounded-2xl bg-white p-5">
          <b className="text-sm">Love &amp; marriage · विवाह</b>
          <p className="mt-1.5 text-muted">{r.love}</p>
          <p className="mt-2">
            <b>Best matches:</b> {r.bestMatches.map((m) => `${RASHI_INFO[m].mr} (${m})`).join(', ')}
          </p>
        </div>
      </div>

      {n && (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-gold-soft/60 p-5 text-[13px]">
          <b className="text-sm">
            Nakshatra: {nakshatra} · <span className="heading-deva">{n.mr}</span>
          </b>
          <p className="mt-1 text-muted">
            Deity {n.deity} · Symbol {n.symbol} · Lord {n.lord} · {n.nature} · Gana {n.gana} · Nadi {n.nadi} · Yoni {n.yoni}
          </p>
          <p className="mt-1">{n.trait}</p>
        </div>
      )}
      <p className="heading-deva mt-5 text-center text-lg text-primary">{r.mantra}</p>
    </CardShell>
  );
}
