/**
 * "आपली गाथा" — the story of the Vanjari community of Palghar, as a 12-scene animated film.
 *
 * Content sources (kept deliberately modest — community tradition is labelled as such):
 *  • Origin in Chittorgarh (Mewar, Rajasthan) and a dialect with Rajasthani & Gujarati influence — community tradition,
 *    as recorded on the Wikipedia pages for Palghar and Boisar.
 *  • Name from Sanskrit "vanij" (merchant); 12th-century Rajasthan inscriptions mention Vanajaraka traders — Wikipedia "Vanjari caste".
 *  • Bullock caravans with rice, wheat & dried fish; routes to the Ghats, Konkan, Surat, Navsari, Kalyan, Nagpur, Jabalpur;
 *    24 villages; surnames Sankhe, Pimple, Patil, Vade, Bore; samaj hall at Boisar — Vanjari Samaj community pages.
 *  • Trade at Moradi port (today Murbe) until the railway (1853) — Wikipedia "Boisar".
 *  • Tarapur Atomic Power Station (India's first, 1969); Palghar district formed 2014.
 * Elders' corrections are welcome — edit the text here (captions) and in Admin → History (timeline).
 */
import {
  H,
  INK,
  W,
  bird,
  border,
  boat,
  bullock,
  circle,
  clamp,
  ease,
  fort,
  gradCap,
  hills,
  hut,
  industry,
  moon,
  paddy,
  person,
  rails,
  rain,
  seg,
  sun,
  train,
  tree,
  wall,
  waves,
  wrap,
} from './draw';
import { MADE_BY } from '../../../lib/credits';

export const VILLAGES = [
  'Bandhan', 'Boisar', 'Dapoli', 'Dedale', 'Dhuktan', 'Eklare', 'Gundavali', 'Kalovlee', 'Kambalgao', 'Kolgaon', 'Kolwade', 'Kondan',
  'Kumbhavali', 'Kurgaon', 'Manor-Ambhan', 'Maswan', 'Morekuran', 'Murabe', 'Pam', 'Parnali', 'Patharali', 'Tembhi', 'Uparale', 'Vengani',
];
export const SURNAMES = ['Sankhe', 'Pimple', 'Patil', 'Vade', 'Bore'];

const DEVA = '"Noto Serif Devanagari", serif';
const SANS = 'Inter, system-ui, sans-serif';

// ── Scenes ─────────────────────────────────────────────────────────────────
// Each: { id, chip, mr, en, dur, draw(ctx, lt, p) }  lt = seconds into scene, p = 0..1

const sceneTitle = {
  id: 'title',
  chip: 'आपली गाथा',
  mr: 'मी वंजारी',
  en: 'The story of the Vanjari community of Palghar',
  dur: 8,
  noCaption: true,
  draw(ctx, lt) {
    wall(ctx, '#9a4322', '#6e2b12');
    sun(ctx, W / 2, 118 + (1 - ease(lt / 3)) * 90, 44, lt * 0.15, ease(lt / 2));
    hills(ctx, 600, 26, 'rgba(60,15,0,0.35)', lt * 0.1);
    // circle of dancers around the title
    const n = 14;
    for (let i = 0; i < n; i++) {
      const an = (i / n) * Math.PI * 2 + lt * 0.18;
      const x = W / 2 + Math.cos(an) * 520;
      const y = 620 + Math.sin(an) * 34;
      person(ctx, x, y, 0.62, { pose: 'dance', phase: lt * 4 + i, alpha: clamp((lt - 0.3 - i * 0.05) * 2) * 0.9 });
    }
    border(ctx, 0.55);
    const a = ease((lt - 1) / 1.2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.font = `700 112px ${DEVA}`;
    ctx.fillText('मी वंजारी', W / 2, 290 + (1 - a) * 20);
    ctx.font = `600 38px ${DEVA}`;
    ctx.fillText('पालघरच्या वंजारी समाजाची गाथा', W / 2, 352);
    ctx.globalAlpha = ease((lt - 2.2) / 1);
    ctx.font = `500 22px ${SANS}`;
    ctx.fillText('The story of the Vanjari community of Palghar', W / 2, 394);
    ctx.font = `600 14px ${SANS}`;
    ctx.fillStyle = '#f1bf76';
    ctx.fillText('FROM MEWAR TO THE KONKAN COAST', W / 2, 426);
    ctx.restore();
  },
};

const sceneMewar = {
  id: 'mewar',
  chip: 'Roots · मुळे',
  mr: 'मेवाड, राजस्थान — आपली मुळे',
  en: 'Community tradition traces our roots to Chittorgarh in Mewar, Rajasthan — a land of forts, desert winds and trade.',
  dur: 10,
  draw(ctx, lt) {
    wall(ctx, '#b0582a', '#86401c');
    sun(ctx, 1040, 150, 54, lt * 0.12);
    for (let i = 0; i < 4; i++) bird(ctx, 300 + i * 60 + lt * 30, 140 + Math.sin(i) * 20, 1, lt * 8 + i);
    fort(ctx, 640, 470, 1.15, ease(lt / 2));
    hills(ctx, 520, 22, 'rgba(120,45,15,0.65)', 1 + lt * 0.05, 0.004);
    hills(ctx, 560, 18, 'rgba(95,32,8,0.75)', 2 + lt * 0.08, 0.005);
    // a camel walking along the dunes
    const cx = -100 + ((lt * 70) % (W + 200));
    camel(ctx, cx, 545, 0.9, lt * 5);
    person(ctx, cx - 70, 548, 0.7, { pose: 'herd', phase: lt * 5 });
  },
};

function camel(ctx, x, y, s, phase) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const a = Math.sin(phase) * 9;
  for (const [lx, d] of [[-30, a], [-18, -a], [22, -a], [34, a]]) {
    ctx.beginPath();
    ctx.moveTo(lx, -55);
    ctx.lineTo(lx + d, 0);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, -66, 46, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-26, -76);
  ctx.quadraticCurveTo(-4, -118, 18, -76);
  ctx.fill();
  ctx.beginPath(); // neck & head
  ctx.moveTo(40, -70);
  ctx.quadraticCurveTo(70, -80, 66, -112);
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(76, -114, 14, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const sceneName = {
  id: 'name',
  chip: '12th century',
  mr: '"वणिज" — व्यापारी',
  en: '"Vanjari" is usually traced to the Sanskrit vanij — merchant. 12th-century inscriptions in Rajasthan already mention Vanajaraka traders.',
  dur: 10,
  draw(ctx, lt) {
    wall(ctx, '#8f3f1f', '#6a2a12');
    // stone tablet
    ctx.save();
    ctx.fillStyle = 'rgba(40,12,2,0.45)';
    ctx.beginPath();
    ctx.roundRect(330, 90, 620, 340, [160, 160, 16, 16]);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    ctx.stroke();
    // inscription lines appear stroke by stroke
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const y = 190 + r * 32;
      const prog = clamp(lt * 1.3 - r * 0.6);
      let x = 380;
      let i = 0;
      while (x < 380 + 520 * prog) {
        const k = (r * 13 + i * 7) % 5;
        ctx.beginPath();
        if (k === 0) ctx.arc(x + 8, y, 8, 0, Math.PI * 1.6);
        else if (k === 1) {
          ctx.moveTo(x, y - 10);
          ctx.lineTo(x + 8, y + 10);
          ctx.lineTo(x + 16, y - 10);
        } else if (k === 2) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + 16, y);
          ctx.moveTo(x + 8, y - 10);
          ctx.lineTo(x + 8, y + 10);
        } else if (k === 3) {
          ctx.rect(x, y - 8, 14, 16);
        } else {
          ctx.moveTo(x, y + 8);
          ctx.quadraticCurveTo(x + 8, y - 16, x + 16, y + 8);
        }
        ctx.stroke();
        x += 28;
        i++;
      }
    }
    ctx.restore();
    // trader with goods & scales
    person(ctx, 200, 470, 1.15, { pose: 'stand' });
    scales(ctx, 1080, 470, Math.sin(lt * 2) * 0.12);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#e7c48d';
      circle(ctx, 1150 + (i % 3) * 26, 470 - Math.floor(i / 3) * 20, 10);
    }
  },
};

function scales(ctx, x, y, tilt) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 90);
  ctx.lineTo(x, y - 60);
  ctx.stroke();
  ctx.translate(x, y - 60);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.moveTo(-90, 0);
  ctx.lineTo(90, 0);
  ctx.stroke();
  for (const px of [-90, 90]) {
    ctx.save();
    ctx.translate(px, 0);
    ctx.rotate(-tilt);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-24, 50);
    ctx.moveTo(0, 0);
    ctx.lineTo(24, 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 52, 30, 8, 0, 0, Math.PI);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

const sceneCaravan = {
  id: 'caravan',
  chip: 'Tandas · तांडे',
  mr: 'बैलांचे तांडे',
  en: 'Caravans of hundreds — sometimes thousands — of pack-bullocks carried rice, wheat and dried fish from market to market.',
  dur: 11,
  draw(ctx, lt) {
    wall(ctx, '#a65028', '#7f3517');
    sun(ctx, 200, 140, 44, lt * 0.1, 0.9);
    hills(ctx, 330, 40, 'rgba(90,30,8,0.45)', 0.4, 0.004);
    hills(ctx, 400, 24, 'rgba(110,38,12,0.55)', 2.1, 0.007);
    // caravan walks left → right, looping
    const speed = 85;
    const spacing = 150;
    for (let i = 0; i < 12; i++) {
      const x = ((lt * speed + i * spacing) % (12 * spacing)) - 160;
      const isPerson = i % 4 === 0;
      if (isPerson) person(ctx, x, 478, 0.95, { pose: 'herd', phase: lt * 6 + i });
      else bullock(ctx, x, 482, 1, { phase: lt * 6 + i });
    }
    // second, smaller row further away
    for (let i = 0; i < 14; i++) {
      const x = ((lt * speed * 0.6 + i * 110) % (14 * 110)) - 120;
      bullock(ctx, x, 395, 0.55, { phase: lt * 5 + i, alpha: 0.7 });
    }
    // dust
    ctx.save();
    ctx.fillStyle = INK;
    for (let i = 0; i < 30; i++) {
      const k = (lt * 0.4 + i / 30) % 1;
      ctx.globalAlpha = 0.12 * (1 - k);
      circle(ctx, (i * 53 + lt * 60) % W, 488 - k * 40, 4 + k * 10);
    }
    ctx.restore();
  },
};

// geographic projection for the route map (lat/long → canvas)
const geo = (lat, lon) => [((lon - 69.5) / 11.5) * W, ((25.6 - lat) / 6.6) * 400 + 64];
const PLACES = {
  Chittorgarh: [24.88, 74.62],
  Surat: [21.17, 72.83],
  Navsari: [20.95, 72.92],
  'Moradi (Murbe)': [19.8, 72.72],
  Kalyan: [19.24, 73.13],
  Nagpur: [21.15, 79.09],
  Jabalpur: [23.18, 79.95],
};
const COAST = [[23.6, 68.6], [22.9, 70.0], [22.3, 72.3], [21.7, 72.6], [21.1, 72.65], [20.4, 72.75], [19.8, 72.65], [19.0, 72.8], [18.0, 73.2], [17.5, 73.25]];

const sceneRoutes = {
  id: 'routes',
  chip: 'Trade routes · वाटा',
  mr: 'घाट, कोकण, सुरत ते कल्याण',
  en: 'Routes ran down to the Konkan — Surat, Navsari, Kalyan — over the Sahyadri ghats, and inland as far as Nagpur and Jabalpur.',
  dur: 11,
  draw(ctx, lt) {
    wall(ctx, '#9b4724', '#743014');
    // sea to the west of the coastline
    ctx.save();
    ctx.fillStyle = 'rgba(40,12,2,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const [la, lo] of COAST) ctx.lineTo(...geo(la, lo));
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    COAST.forEach(([la, lo], i) => (i ? ctx.lineTo(...geo(la, lo)) : ctx.moveTo(...geo(la, lo))));
    ctx.stroke();
    ctx.restore();
    // Sahyadri ghats
    ctx.save();
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 6; i++) {
      const [x, y] = geo(21.4 - i * 0.38, 73.9 + (i % 2) * 0.12);
      ctx.beginPath();
      ctx.moveTo(x - 16, y + 12);
      ctx.lineTo(x, y - 14);
      ctx.lineTo(x + 16, y + 12);
      ctx.fill();
    }
    ctx.restore();
    // animated routes from Chittorgarh
    const from = geo(...PLACES.Chittorgarh);
    const legs = [
      ['Surat', 0.6], ['Navsari', 1.4], ['Moradi (Murbe)', 2.2], ['Kalyan', 3.0], ['Nagpur', 4.0], ['Jabalpur', 4.8],
    ];
    ctx.save();
    ctx.strokeStyle = '#f1bf76';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 9]);
    ctx.lineDashOffset = -lt * 30;
    for (const [name, start] of legs) {
      const k = ease((lt - start) / 1.4);
      if (k <= 0) continue;
      const to = geo(...PLACES[name]);
      const mid = [(from[0] + to[0]) / 2 + 40, (from[1] + to[1]) / 2];
      ctx.beginPath();
      ctx.moveTo(...from);
      // draw partial quadratic by sampling
      for (let s = 0; s <= k; s += 0.02) {
        const x = (1 - s) ** 2 * from[0] + 2 * (1 - s) * s * mid[0] + s * s * to[0];
        const y = (1 - s) ** 2 * from[1] + 2 * (1 - s) * s * mid[1] + s * s * to[1];
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // places
    ctx.save();
    ctx.font = `600 18px ${SANS}`;
    for (const [name, [la, lo]] of Object.entries(PLACES)) {
      const [x, y] = geo(la, lo);
      const start = name === 'Chittorgarh' ? 0 : legs.find((l) => l[0] === name)[1] + 1.2;
      const a = ease((lt - start) / 0.5);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = name === 'Moradi (Murbe)' || name === 'Chittorgarh' ? '#f1bf76' : INK;
      circle(ctx, x, y, name === 'Chittorgarh' ? 11 : 7);
      ctx.fillStyle = INK;
      if (name === 'Chittorgarh') {
        ctx.textAlign = 'center';
        ctx.fillText(name, x, y - 20);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(name, x - 16, y + 6);
      }
    }
    ctx.restore();
    // a tiny bullock travelling the Murbe route
    const k = ((lt - 2.2) / 6) % 1;
    if (lt > 2.2) {
      const to = geo(...PLACES['Moradi (Murbe)']);
      const mid = [(from[0] + to[0]) / 2 + 40, (from[1] + to[1]) / 2];
      const x = (1 - k) ** 2 * from[0] + 2 * (1 - k) * k * mid[0] + k * k * to[0];
      const y = (1 - k) ** 2 * from[1] + 2 * (1 - k) * k * mid[1] + k * k * to[1];
      bullock(ctx, x, y + 10, 0.35, { phase: lt * 8, load: true, dir: -1 });
    }
  },
};

const scenePort = {
  id: 'port',
  chip: 'Moradi · Murbe',
  mr: 'मोरडी बंदर — आजचे मुरबे',
  en: 'On the Konkan coast the caravans met the sea at Moradi port — today’s Murbe, near Boisar — where goods changed hands with sailing boats.',
  dur: 11,
  draw(ctx, lt) {
    wall(ctx, '#93421f', '#5f2410');
    sun(ctx, 980, 170, 50, lt * 0.1, 0.9);
    for (let i = 0; i < 5; i++) bird(ctx, 700 + i * 50 - lt * 20, 120 + (i % 2) * 24, 0.9, lt * 7 + i);
    // sea on the left, shore on the right
    ctx.save();
    ctx.fillStyle = 'rgba(30,8,2,0.35)';
    ctx.fillRect(0, 300, W, H - 300);
    ctx.restore();
    waves(ctx, 330, lt, 0.55, 5);
    boat(ctx, 260 + Math.sin(lt * 0.3) * 30, 370, 1, lt * 2);
    boat(ctx, 560 + Math.sin(lt * 0.25 + 1) * 40, 420, 0.7, lt * 2 + 1);
    // shore
    ctx.save();
    ctx.fillStyle = '#a95a2e';
    ctx.beginPath();
    ctx.moveTo(740, H);
    ctx.quadraticCurveTo(800, 400, W, 360);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // sacks piling up on the shore
    ctx.save();
    ctx.fillStyle = '#e7c48d';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    const n = Math.min(9, Math.floor(lt * 1.2));
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.roundRect(880 + (i % 3) * 34, 476 - Math.floor(i / 3) * 26, 30, 24, 6);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    bullock(ctx, 1110 - ease(lt / 4) * 60, 500, 1, { phase: lt * 5 * (lt < 4 ? 1 : 0.1), dir: -1 });
    person(ctx, 1010, 502, 0.95, { pose: lt % 3 < 1.5 ? 'farm' : 'stand', phase: lt * 4, pot: true });
    hut(ctx, 1210, 380, 0.8, 0.8);
  },
};

const sceneRail = {
  id: 'rail',
  chip: '1853',
  mr: 'आगगाडी आली, तांडे थांबले',
  en: 'From 1853 the railway came. Bullock caravans could not compete with trains, and the old long-distance trade slowly faded.',
  dur: 10,
  draw(ctx, lt) {
    wall(ctx, '#7e3618', '#55200b');
    moon(ctx, 1080, 140, 42, 0.9);
    hills(ctx, 340, 30, 'rgba(40,10,0,0.45)', 0.7, 0.005);
    rails(ctx, 410);
    train(ctx, -200 + lt * 175, 410, 1, lt);
    // bullocks resting, watching
    bullock(ctx, 820, 490, 0.75, { phase: 0, load: true });
    bullock(ctx, 1000, 494, 0.75, { phase: 0, load: true, dir: -1 });
    person(ctx, 910, 494, 0.8, { pose: 'stand' });
    ctx.save();
    ctx.fillStyle = '#f1bf76';
    ctx.font = `700 70px ${SANS}`;
    ctx.globalAlpha = ease((lt - 0.5) / 1) * 0.9;
    ctx.fillText('1853', 90, 170);
    ctx.restore();
  },
};

const sceneFarming = {
  id: 'farming',
  chip: 'Settling down · स्थिरावलो',
  mr: 'जमीन घेतली, शेतकरी झालो',
  en: 'Families bought land with their savings and settled for good — becoming hard-working farmers of paddy, vegetables and orchards.',
  dur: 11,
  draw(ctx, lt) {
    wall(ctx, '#8f4420', '#6b2d12');
    const raining = lt < 6;
    if (!raining) sun(ctx, 1060, 150, 52, lt * 0.1, ease((lt - 6) / 1.5));
    tree(ctx, 1130, 340, 1.1, ease(lt / 5), Math.sin(lt) * 2);
    tree(ctx, 1220, 350, 0.8, ease((lt - 0.5) / 5), Math.sin(lt + 1) * 2);
    hut(ctx, 980, 340, 1);
    hut(ctx, 880, 350, 0.8, 0.9);
    paddy(ctx, 380, 4, ease(lt / 8), lt);
    for (let i = 0; i < 5; i++) person(ctx, 120 + i * 120, 430 + (i % 2) * 34, 0.8, { pose: 'farm', phase: lt * 3 + i });
    bullock(ctx, 780 + Math.sin(lt * 0.4) * 60, 490, 1, { phase: lt * 4, load: false, plough: true, dir: 1 });
    if (raining) rain(ctx, lt, 0.4 * (1 - seg(lt, 4.5, 6)));
  },
};

const sceneVillages = {
  id: 'villages',
  chip: '24 villages · २४ गावे',
  mr: 'पालघर जिल्ह्यातील २४ गावे',
  en: 'Today the community lives in 24 villages of Palghar district, with Boisar at the heart.',
  dur: 13,
  draw(ctx, lt) {
    wall(ctx, '#934321', '#682b12');
    const cx = W / 2;
    const cy = 272;
    // center
    ctx.save();
    ctx.fillStyle = INK;
    circle(ctx, cx, cy, 44 * ease(lt / 0.8));
    ctx.fillStyle = '#8c3b1f';
    ctx.font = `700 19px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = ease(lt / 0.8);
    ctx.fillText('Boisar', cx, cy + 7);
    ctx.restore();
    const others = VILLAGES.filter((v) => v !== 'Boisar');
    others.forEach((name, i) => {
      const start = 0.6 + i * 0.36;
      const a = ease((lt - start) / 0.5);
      if (a <= 0) return;
      const ring = i % 2 ? 1 : 0;
      const an = (i / others.length) * Math.PI * 2 - Math.PI / 2;
      const rx = ring ? 520 : 350;
      const ry = ring ? 190 : 128;
      const x = cx + Math.cos(an) * rx * (0.6 + 0.4 * a);
      const y = cy + Math.sin(an) * ry * (0.6 + 0.4 * a);
      ctx.save();
      ctx.globalAlpha = a * 0.35;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = a;
      hut(ctx, x, y + 4, 0.32);
      ctx.fillStyle = INK;
      ctx.font = `600 16px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(name, x, y + 26);
      ctx.restore();
    });
    // counter
    const count = Math.min(24, 1 + Math.max(0, Math.floor((lt - 0.6) / 0.36) + 1));
    ctx.save();
    ctx.fillStyle = '#f1bf76';
    ctx.font = `700 54px ${SANS}`;
    ctx.fillText(String(count), 62, 150);
    ctx.font = `600 16px ${SANS}`;
    ctx.fillStyle = INK;
    ctx.fillText('VILLAGES', 64, 176);
    ctx.restore();
  },
};

const sceneFamilies = {
  id: 'families',
  chip: 'Our families · कुळे',
  mr: 'आपली आडनावे, आपली ओळख',
  en: 'Sankhe, Pimple, Patil, Vade, Bore and more — one extended family, still speaking a dialect coloured by Rajasthani and Gujarati.',
  dur: 11,
  draw(ctx, lt) {
    wall(ctx, '#a04b25', '#743116');
    // big family tree
    const x = W / 2;
    const base = 470;
    tree(ctx, x, base, 1.6, ease(lt / 3), Math.sin(lt * 0.8));
    // surname medallions hanging from branches
    const spots = [[-320, 230], [-170, 160], [0, 112], [170, 160], [320, 230]];
    SURNAMES.forEach((name, i) => {
      const a = ease((lt - 1.5 - i * 0.5) / 0.6);
      if (a <= 0) return;
      const [dx, y] = spots[i];
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.roundRect(x + dx - 80, y - 28 + (1 - a) * 20, 160, 56, 28);
      ctx.fill();
      ctx.fillStyle = '#8c3b1f';
      ctx.font = `700 26px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(name, x + dx, y + 9 + (1 - a) * 20);
      ctx.restore();
    });
    // families gathered at the roots
    for (let i = 0; i < 10; i++) person(ctx, 150 + i * 102 + (i > 4 ? 160 : 0), base + 12, 0.7, { pose: 'cheer', phase: lt * 3 + i, alpha: ease((lt - 4 - i * 0.1) / 0.6) });
  },
};

const sceneModern = {
  id: 'modern',
  chip: '1969 → · प्रगती',
  mr: 'शिक्षण, उद्योग आणि प्रगती',
  en: 'Tarapur — India’s first nuclear power station (1969) — and the MIDC industrial area transformed Boisar. A first generation of graduates became teachers, engineers, doctors and entrepreneurs.',
  dur: 12,
  draw(ctx, lt) {
    wall(ctx, '#8a3d1d', '#5c2410');
    industry(ctx, 390, lt, ease(lt / 2));
    // graduates celebrating in front
    for (let i = 0; i < 7; i++) {
      const x = 260 + i * 130;
      person(ctx, x, 492, 0.9, { pose: 'cheer', phase: lt * 3 + i, alpha: ease((lt - 2 - i * 0.15) / 0.6) });
      const k = seg(lt, 4 + i * 0.1, 6.5 + i * 0.1);
      if (k > 0) gradCap(ctx, x + Math.sin(i) * 30, 420 - Math.sin(k * Math.PI) * 200, 1, k * 6);
    }
    ctx.save();
    ctx.fillStyle = '#f1bf76';
    ctx.font = `700 64px ${SANS}`;
    ctx.globalAlpha = ease((lt - 0.4) / 1) * 0.9;
    ctx.fillText('1969', 90, 150);
    ctx.restore();
  },
};

const sceneToday = {
  id: 'today',
  chip: 'Today · आज',
  mr: 'आपली माणसं, आपलं जग',
  en: 'Palghar became its own district in 2014. Our families now live across India and the world — and still come together as one community.',
  dur: 12,
  draw(ctx, lt) {
    wall(ctx, '#9a4322', '#6a2a12');
    sun(ctx, W / 2, 110, 46, lt * 0.15);
    // tarpa dance: a spiral of dancers around a tarpa player
    const n = 18;
    for (let i = 0; i < n; i++) {
      const an = (i / n) * Math.PI * 2 + lt * 0.35;
      const x = W / 2 + Math.cos(an) * 380;
      const y = 372 + Math.sin(an) * 92;
      person(ctx, x, y, 0.8 + Math.sin(an) * 0.12, { pose: 'dance', phase: lt * 5 + i, alpha: 0.95 });
    }
    // tarpa player in the middle
    person(ctx, W / 2, 372, 1.1, { pose: 'stand' });
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W / 2 + 6, 372 - 70);
    ctx.lineTo(W / 2 + 46, 372 - 10);
    ctx.stroke();
    ctx.fillStyle = INK;
    circle(ctx, W / 2 + 50, 372 - 6, 9);
    ctx.restore();
    border(ctx, 0.5);
  },
};

const sceneEnd = {
  id: 'end',
  chip: 'मी वंजारी',
  mr: 'मी वंजारी',
  en: 'Connecting our people — wherever they are.',
  dur: 9,
  noCaption: true,
  draw(ctx, lt) {
    wall(ctx, '#7c3216', '#4f1d09');
    border(ctx, 0.5);
    const a = ease(lt / 1.2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = INK;
    circle(ctx, W / 2, 230, 70);
    ctx.fillStyle = '#9a4322';
    ctx.font = `700 64px ${DEVA}`;
    ctx.textAlign = 'center';
    ctx.fillText('मि', W / 2, 254);
    ctx.fillStyle = INK;
    ctx.font = `700 76px ${DEVA}`;
    ctx.fillText('मी वंजारी', W / 2, 400);
    ctx.font = `600 32px ${DEVA}`;
    ctx.fillText('आपली माणसं, आपलं जग', W / 2, 452);
    ctx.globalAlpha = ease((lt - 1.5) / 1) * 0.85;
    ctx.font = `400 17px ${SANS}`;
    ctx.fillText('Based on community tradition and published sources. Elders’ corrections are welcome.', W / 2, 560);
    ctx.globalAlpha = ease((lt - 2.2) / 1);
    ctx.fillStyle = '#f1bf76';
    ctx.font = `600 22px ${SANS}`;
    ctx.fillText(MADE_BY, W / 2, 610);
    ctx.restore();
  },
};

export const SCENES = [sceneTitle, sceneMewar, sceneName, sceneCaravan, sceneRoutes, scenePort, sceneRail, sceneFarming, sceneVillages, sceneFamilies, sceneModern, sceneToday, sceneEnd];

let acc = 0;
export const TIMELINE = SCENES.map((s) => {
  const start = acc;
  acc += s.dur;
  return { ...s, start };
});
export const TOTAL = acc;

export function sceneAt(t) {
  const tt = clamp(t, 0, TOTAL - 0.001);
  return TIMELINE.find((s) => tt >= s.start && tt < s.start + s.dur) || TIMELINE[TIMELINE.length - 1];
}

const FADE = 0.7;

/** Render the film frame at time t (seconds). */
export function renderFrame(ctx, t) {
  const s = sceneAt(t);
  const lt = t - s.start;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  s.draw(ctx, lt, lt / s.dur);
  ctx.restore();
  if (!s.noCaption) caption(ctx, s, lt);
  // brand watermark
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = INK;
  ctx.font = `600 18px ${DEVA}`;
  ctx.textAlign = 'right';
  ctx.fillText('मी वंजारी', W - 34, 52);
  ctx.restore();
  // fade between scenes
  const fadeIn = 1 - clamp(lt / FADE);
  const fadeOut = clamp((lt - (s.dur - FADE)) / FADE);
  const black = Math.max(s.start === 0 ? fadeIn : fadeIn * 0.85, fadeOut * 0.85);
  if (black > 0) {
    ctx.fillStyle = `rgba(20,6,0,${black})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function caption(ctx, s, lt) {
  const a = ease((lt - 0.5) / 0.8);
  ctx.save();
  const g = ctx.createLinearGradient(0, H - 230, 0, H);
  g.addColorStop(0, 'rgba(25,8,0,0)');
  g.addColorStop(0.45, 'rgba(25,8,0,0.72)');
  g.addColorStop(1, 'rgba(25,8,0,0.9)');
  ctx.fillStyle = g;
  ctx.globalAlpha = a;
  ctx.fillRect(0, H - 230, W, 230);
  // chip
  ctx.font = `700 15px ${DEVA}`;
  const cw = ctx.measureText(s.chip).width + 30;
  ctx.fillStyle = '#f1bf76';
  ctx.beginPath();
  ctx.roundRect(60, 40, cw, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#4f1d09';
  ctx.fillText(s.chip, 75, 63);
  // titles
  ctx.fillStyle = INK;
  ctx.font = `700 46px ${DEVA}`;
  ctx.fillText(s.mr, 60, H - 118 + (1 - a) * 12);
  ctx.globalAlpha = ease((lt - 1.1) / 0.8);
  ctx.font = `400 22px ${SANS}`;
  ctx.fillStyle = 'rgba(247,236,220,0.92)';
  wrap(ctx, s.en, W - 140).slice(0, 3).forEach((l, i) => ctx.fillText(l, 60, H - 74 + i * 30));
  ctx.restore();
}
