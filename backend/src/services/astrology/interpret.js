/**
 * Plain-language explanation of a Guna Milan result:
 *   • what each koota means for this couple (good / average / concern),
 *   • the strengths and the things to consider,
 *   • Nadi / Bhakoot dosha with the traditional exceptions (parihar) and remedies.
 *
 * The wording is deliberately gentle — Guna Milan is one traditional input, not a verdict on people.
 */
import { GANA_NAMES, NADI_NAMES, NAKSHATRAS, PLANET_RELATIONS, RASHIS, VARNA_NAMES } from './tables.js';

const VASHYA_LABEL = { CHATUSHPAD: 'Chatushpad (quadruped)', MANAV: 'Manav (human)', JALCHAR: 'Jalchar (water)', VANCHAR: 'Vanchar (wild)', KEET: 'Keet (insect)' };

const levelOf = (score, max) => (score / max >= 0.75 ? 'good' : score / max >= 0.4 ? 'average' : 'concern');

const padaOf = (c) => c.pada ?? c.nakshatra?.pada ?? null;

const friendly = (a, b) => a === b || (PLANET_RELATIONS[a].friends.includes(b) && PLANET_RELATIONS[b].friends.includes(a));

/** Per-koota sentence for this couple. `k` comes from gunaMilan(). */
function explainKoota(k) {
  const { score, max, boy, girl } = k;
  switch (k.key) {
    case 'varna':
      return score
        ? `Groom's varna (${boy}) is equal to or higher than the bride's (${girl}) — values and sense of duty sit comfortably together.`
        : `Bride's varna (${girl}) is higher than the groom's (${boy}). Traditionally a small mismatch in priorities — it carries only 1 point.`;
    case 'vashya':
      if (score === max) return `Both belong to the same vashya group, ${VASHYA_LABEL[boy] || boy} — natural mutual attraction and influence.`;
      if (score >= 1) return `Groups ${VASHYA_LABEL[boy] || boy} and ${VASHYA_LABEL[girl] || girl} are compatible — attraction is good with some give-and-take.`;
      if (score > 0) return `Groups ${VASHYA_LABEL[boy] || boy} and ${VASHYA_LABEL[girl] || girl} are only partly compatible — influence on each other is moderate.`;
      return `Groups ${VASHYA_LABEL[boy] || boy} and ${VASHYA_LABEL[girl] || girl} don't influence each other easily — understanding has to be built consciously.`;
    case 'tara':
      if (score === max) return `Birth stars ${boy} and ${girl} are favourable to each other in both directions — supports health and good fortune.`;
      if (score > 0) return `Birth stars ${boy} and ${girl} are favourable in one direction only — a mixed result for well-being.`;
      return `Birth stars ${boy} and ${girl} are unfavourable in both directions — traditionally a caution about health and luck.`;
    case 'yoni':
      if (score === max) return `Same yoni (${boy}) — excellent physical and temperamental harmony.`;
      if (score > 0) return `Yonis ${boy} and ${girl} are neutral to each other — normal, comfortable compatibility.`;
      return `Yonis ${boy} and ${girl} are natural opponents — temperaments may clash; patience and space help.`;
    case 'maitri':
      if (score === max) return boy === girl ? `Both Moon signs are ruled by ${boy} — strong mental wavelength and friendship.` : `Moon-sign lords ${boy} and ${girl} are friends — strong mental compatibility.`;
      if (score >= 3) return `Moon-sign lords ${boy} and ${girl} are on neutral-to-friendly terms — thinking styles get along.`;
      return `Moon-sign lords ${boy} and ${girl} are not friendly — views may differ; open communication matters.`;
    case 'gana':
      if (score === max) return `Both are ${boy === girl ? `${boy} gana` : `${boy} and ${girl} gana`} — similar nature and temperament.`;
      if (score >= 5) return `${boy} (groom) and ${girl} (bride) gana go well together — temperaments are compatible.`;
      return `${boy} (groom) and ${girl} (bride) gana differ strongly — known as Gana dosha; adjustment in temperament is needed.`;
    case 'bhakoot':
      return score
        ? `Moon signs ${boy} and ${girl} sit in a favourable position to each other — supports family welfare and prosperity.`
        : `Moon signs ${boy} and ${girl} form a ${k.pair} position — Bhakoot dosha (${BHAKOOT_EFFECT[k.pair]}).`;
    case 'nadi':
      return score
        ? `Different nadis (${boy} and ${girl}) — the most important koota (8 points) is fully satisfied.`
        : `Both have ${boy} nadi — Nadi dosha, traditionally linked to health and progeny.`;
    default:
      return k.about;
  }
}

const BHAKOOT_EFFECT = {
  '2/12': 'traditionally associated with financial ups and downs',
  '6/8': 'traditionally associated with disagreements and health worries',
  '5/9': 'traditionally associated with concerns about children',
};

/** Traditional exceptions (parihar) — when they apply, the dosha is considered mitigated. */
function nadiParihar(boy, girl) {
  const sameRashi = boy.rashiIndex === girl.rashiIndex;
  const sameNak = boy.nakshatraIndex === girl.nakshatraIndex;
  const rb = RASHIS[boy.rashiIndex];
  const rg = RASHIS[girl.rashiIndex];
  if (sameRashi && !sameNak) return 'Same Moon sign but different nakshatras';
  if (sameNak && !sameRashi) return 'Same nakshatra but different Moon signs';
  if (sameNak && padaOf(boy) && padaOf(girl) && padaOf(boy) !== padaOf(girl)) return 'Same nakshatra but different padas (charans)';
  if (rb.lord === rg.lord) return `Both Moon signs are ruled by ${rb.lord}`;
  return null;
}

function bhakootParihar(boy, girl) {
  const a = RASHIS[boy.rashiIndex].lord;
  const b = RASHIS[girl.rashiIndex].lord;
  if (a === b) return `Both Moon signs are ruled by ${a}`;
  if (friendly(a, b)) return `Moon-sign lords ${a} and ${b} are mutual friends`;
  return null;
}

function personSummary(c) {
  const r = RASHIS[c.rashiIndex];
  const n = NAKSHATRAS[c.nakshatraIndex];
  return {
    rashi: r.name,
    rashiMr: r.mr,
    rashiEn: r.en,
    symbol: r.symbol,
    lord: r.lord,
    nakshatra: n.name,
    nakshatraMr: n.mr,
    pada: padaOf(c),
    gana: GANA_NAMES[n.gana],
    nadi: NADI_NAMES[n.nadi],
    yoni: n.yoni,
    varna: VARNA_NAMES[r.varna],
  };
}

/**
 * @param {object} result output of gunaMilan()
 * @param {{rashiIndex:number,nakshatraIndex:number,pada?:number}} boy
 * @param {{rashiIndex:number,nakshatraIndex:number,pada?:number}} girl
 */
export function explainMatch(result, boy, girl) {
  const kootas = result.kootas.map((k) => ({ ...k, level: levelOf(k.score, k.max), detail: explainKoota(k) }));

  const nadiCancel = result.doshas.nadi ? nadiParihar(boy, girl) : null;
  const bhakootCancel = result.doshas.bhakoot ? bhakootParihar(boy, girl) : null;
  const doshaList = [];
  if (result.doshas.nadi)
    doshaList.push({
      key: 'nadi',
      name: 'Nadi dosha',
      mr: 'नाडी दोष',
      cancelled: Boolean(nadiCancel),
      exception: nadiCancel,
      about: 'Both partners share the same nadi. It is the most weighted koota (8 points), traditionally linked to health and progeny.',
      remedy: nadiCancel
        ? 'A traditional exception applies, so most panchang readers consider this dosha mitigated.'
        : 'Families traditionally perform Nadi dosha nivaran puja or Mahamrityunjaya jaap. Please consult your family priest or a trusted jyotishi.',
    });
  if (result.doshas.bhakoot)
    doshaList.push({
      key: 'bhakoot',
      name: 'Bhakoot dosha',
      mr: 'भकूट दोष',
      cancelled: Boolean(bhakootCancel),
      exception: bhakootCancel,
      about: `The Moon signs form a ${kootas.find((k) => k.key === 'bhakoot').pair} position, ${BHAKOOT_EFFECT[kootas.find((k) => k.key === 'bhakoot').pair]}.`,
      remedy: bhakootCancel
        ? 'A traditional exception applies, so this dosha is usually considered mitigated.'
        : 'Often weighed together with the overall score; a jyotishi can advise on remedies such as worship of the Moon-sign lords.',
    });
  const gana = kootas.find((k) => k.key === 'gana');
  if (gana.score <= 1)
    doshaList.push({
      key: 'gana',
      name: 'Gana dosha',
      mr: 'गण दोष',
      cancelled: false,
      exception: null,
      about: `Groom is ${gana.boy} gana and bride is ${gana.girl} gana — very different temperaments.`,
      remedy: 'Considered less serious when Graha Maitri and Bhakoot are good. Mutual respect for each other’s nature goes a long way.',
    });

  const strengths = kootas.filter((k) => k.level === 'good').map((k) => ({ key: k.key, title: `${k.name} · ${k.mr}`, text: k.detail }));
  const concerns = [
    ...kootas.filter((k) => k.level === 'concern' && !['nadi', 'bhakoot'].includes(k.key)).map((k) => ({ key: k.key, title: `${k.name} · ${k.mr}`, text: k.detail })),
    ...doshaList.map((d) => ({ key: d.key, title: `${d.name} · ${d.mr}`, text: d.cancelled ? `${d.about} Exception: ${d.exception}.` : d.about, mitigated: d.cancelled })),
  ];
  const average = kootas.filter((k) => k.level === 'average').map((k) => ({ key: k.key, title: `${k.name} · ${k.mr}`, text: k.detail }));

  const openDoshas = doshaList.filter((d) => !d.cancelled && d.key !== 'gana');
  const favourable = kootas.filter((k) => k.level === 'good').length;
  let summary = `${favourable} of 8 kootas are favourable, with ${result.total} of 36 gunas. `;
  if (result.total >= 18 && !openDoshas.length) summary += 'Traditionally this is a suitable match.';
  else if (result.total >= 18) summary += `The score is acceptable, but ${openDoshas.map((d) => d.name).join(' and ')} should be discussed with a jyotishi.`;
  else summary += 'Traditionally a score below 18 is not recommended without further consultation.';

  return {
    ...result,
    kootas,
    strengths,
    average,
    concerns,
    doshaDetails: doshaList,
    summary,
    people: { boy: personSummary(boy), girl: personSummary(girl) },
  };
}
