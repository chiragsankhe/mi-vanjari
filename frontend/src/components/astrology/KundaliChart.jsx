/**
 * North Indian Janma Kundali (birth chart).
 * Houses are fixed in place: house 1 (Lagna) is the top diamond, then counter-clockwise.
 * The small number in each house is its rashi number (1 = Mesh … 12 = Meen); planets sit inside their house.
 */
const W = 400;

// [planet-label centre x, y, rashi-number x, y] for houses 1–12 (viewBox 400 × 400)
const SPOTS = {
  1: [200, 92, 200, 178],
  2: [100, 36, 100, 82],
  3: [36, 100, 82, 100],
  4: [100, 192, 178, 200],
  5: [36, 300, 82, 300],
  6: [100, 362, 100, 318],
  7: [200, 300, 200, 222],
  8: [300, 362, 300, 318],
  9: [364, 300, 318, 300],
  10: [300, 192, 222, 200],
  11: [364, 100, 318, 100],
  12: [300, 36, 300, 82],
};
// triangles are narrow: fewer labels per line
const PER_LINE = { 1: 3, 4: 3, 7: 3, 10: 3 };

const SHORT_MR = { Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु', Jupiter: 'गु', Venus: 'शु', Saturn: 'श', Rahu: 'रा', Ketu: 'के' };

export function planetLabel(p, lang) {
  const base = lang === 'mr' ? SHORT_MR[p.key] : p.short;
  return p.retrograde && p.key !== 'Rahu' && p.key !== 'Ketu' ? `${base}℞` : base;
}

export function KundaliChart({ data, lang = 'en', className, colors = {} }) {
  const line = colors.line || '#9e2e0f';
  const ink = colors.ink || '#2b211b';
  const num = colors.number || '#b86b2d';
  const asc = colors.asc || '#c8411a';
  const bg = colors.bg || '#fffaf3';
  const byKey = Object.fromEntries(data.planets.map((p) => [p.key, p]));

  return (
    <svg viewBox={`0 0 ${W} ${W}`} className={className} role="img" aria-label={`${data.chartType === 'LAGNA' ? 'Lagna' : 'Chandra'} kundali chart`}>
      <rect x="1" y="1" width={W - 2} height={W - 2} fill={bg} stroke={line} strokeWidth="2.5" rx="4" />
      <g stroke={line} strokeWidth="1.6" fill="none">
        <line x1="0" y1="0" x2={W} y2={W} />
        <line x1={W} y1="0" x2="0" y2={W} />
        <polygon points={`${W / 2},1 ${W - 1},${W / 2} ${W / 2},${W - 1} 1,${W / 2}`} />
      </g>
      {data.houses.map((h) => {
        const [px, py, nx, ny] = SPOTS[h.house];
        const labels = [
          ...(h.house === 1 && data.chartType === 'LAGNA' ? [{ text: lang === 'mr' ? 'लग्न' : 'Asc', asc: true }] : []),
          ...h.planets.map((k) => ({ text: planetLabel(byKey[k], lang) })),
        ];
        const per = PER_LINE[h.house] || 2;
        const rows = [];
        for (let i = 0; i < labels.length; i += per) rows.push(labels.slice(i, i + per));
        const lineH = 17;
        const top = py - ((rows.length - 1) * lineH) / 2;
        return (
          <g key={h.house}>
            <text x={nx} y={ny} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="600" fill={num} fontFamily="Inter, sans-serif">
              {h.rashiNumber}
            </text>
            {rows.map((row, r) => (
              <text key={r} x={px} y={top + r * lineH} textAnchor="middle" dominantBaseline="central" fontSize="15" fontFamily="Inter, 'Noto Serif Devanagari', sans-serif">
                {row.map((l, i) => (
                  <tspan key={i} fill={l.asc ? asc : ink} fontWeight={l.asc ? 700 : 600}>
                    {i > 0 ? ' ' : ''}
                    {l.text}
                  </tspan>
                ))}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

const fmtDeg = (d) => {
  const whole = Math.floor(d);
  return `${whole}°${String(Math.round((d - whole) * 60)).padStart(2, '0')}′`;
};

/** Table of the nine grahas (and Lagna). */
export function PlanetTable({ data, lang = 'en' }) {
  const rows = [...(data.lagna ? [{ key: 'Lagna', name: 'Lagna (Ascendant)', nameMr: 'लग्न', ...data.lagna, house: 1 }] : []), ...data.planets];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="text-[11px] tracking-[0.1em] text-muted uppercase">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-semibold">Planet</th>
            <th className="py-2 pr-3 font-semibold">Rashi</th>
            <th className="py-2 pr-3 font-semibold">Degree</th>
            <th className="py-2 pr-3 font-semibold">Nakshatra</th>
            <th className="py-2 font-semibold">House</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.key} className="border-b border-line/70 last:border-0">
              <td className="py-2 pr-3 font-semibold">
                {lang === 'mr' ? p.nameMr : p.name}
                {p.retrograde && p.key !== 'Rahu' && p.key !== 'Ketu' && <span className="ml-1 text-xs font-normal text-primary">℞ retro</span>}
              </td>
              <td className="py-2 pr-3">
                {lang === 'mr' ? p.rashiMr : p.rashi} <span className="text-xs text-muted">({p.rashiNumber})</span>
              </td>
              <td className="py-2 pr-3 tabular-nums">{fmtDeg(p.degree)}</td>
              <td className="py-2 pr-3">
                {p.nakshatra} <span className="text-xs text-muted">· {p.pada}</span>
              </td>
              <td className="py-2 tabular-nums">{p.house}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Fixed-width card for the PNG download. */
export function BirthChartShareCard({ data, name }) {
  return (
    <div style={{ width: 760 }} className="bg-[#fdf6ec] p-10 font-sans text-[#2b211b]">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[13px] font-bold tracking-[0.18em] text-[#c8411a] uppercase">{data.chartType === 'LAGNA' ? 'Janma Kundali · जन्म कुंडली' : 'Chandra Kundali · चंद्र कुंडली'}</p>
          <h2 className="mt-1 font-serif text-[32px] font-semibold">{name || 'Birth chart'}</h2>
          <p className="mt-1 text-sm text-[#6f675f]">
            {data.input.dob}
            {data.input.tob ? ` · ${data.input.tob} IST` : ''} · {data.place.name}
          </p>
        </div>
        <div className="text-right text-sm">
          {data.lagna && (
            <p>
              Lagna: <b>{data.lagna.rashi} ({data.lagna.rashiMr})</b>
            </p>
          )}
          <p>
            Rashi: <b>{data.moonRashi} ({data.moonRashiMr})</b>
          </p>
          <p>
            Nakshatra: <b>{data.nakshatra}</b> · Pada {data.pada}
          </p>
        </div>
      </div>
      <KundaliChart data={data} className="mx-auto mt-6 block w-[520px]" />
      <p className="mt-6 text-center text-[11px] text-[#6f675f]">Sidereal (Lahiri) · whole-sign houses · mivanjari.com · Made by Chirag Sankhe</p>
    </div>
  );
}
