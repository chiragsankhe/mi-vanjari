/**
 * Warli-style drawing kit for the history film (canvas 2D).
 * Warli art — white figures on earth-red walls — comes from Palghar district itself,
 * so the whole film is drawn in that idiom: triangle bodies, circle heads, stick limbs.
 */

export const INK = '#f7ecdc';
export const W = 1280;
export const H = 720;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** 0→1 over [a, b] of a local timeline. */
export const seg = (t, a, b) => clamp((t - a) / (b - a));

function tri(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

export function circle(ctx, x, y, r, fill = true) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  fill ? ctx.fill() : ctx.stroke();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function ink(ctx, s, alpha = 1) {
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = Math.max(1.4, 2.4 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Backgrounds: a warm earth wall with a speckled, hand-plastered texture (cached). */
let texture;
function getTexture() {
  if (texture) return texture;
  texture = document.createElement('canvas');
  texture.width = W;
  texture.height = H;
  const c = texture.getContext('2d');
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = Math.random() > 0.5 ? 'rgba(255,240,220,0.05)' : 'rgba(40,10,0,0.07)';
    const r = Math.random() * 2.2;
    c.beginPath();
    c.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2);
    c.fill();
  }
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(20,5,0,0.45)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  return texture;
}

export function wall(ctx, top = '#a24a26', bottom = '#7c3216') {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(getTexture(), 0, 0);
}

/** Warli border of small triangles along the top and bottom edges. */
export function border(ctx, alpha = 0.5) {
  ctx.save();
  ink(ctx, 1, alpha);
  for (let x = 10; x < W; x += 26) {
    tri(ctx, x, 10, x + 13, 10, x + 6.5, 22);
    tri(ctx, x, H - 10, x + 13, H - 10, x + 6.5, H - 22);
  }
  ctx.restore();
}

/**
 * Warli human. (x, y) = feet. `pose`: walk | stand | dance | farm | cheer | herd
 */
export function person(ctx, x, y, s = 1, { phase = 0, pose = 'walk', dir = 1, alpha = 1, pot = false } = {}) {
  const h = 70 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ink(ctx, s, alpha);
  const waist = -h * 0.55;
  const hip = -h * 0.4;
  const sh = -h * 0.8;
  tri(ctx, -h * 0.16, sh, h * 0.16, sh, 0, waist); // chest (inverted)
  tri(ctx, 0, waist, -h * 0.13, hip, h * 0.13, hip); // hips
  circle(ctx, 0, -h * 0.92, h * 0.085); // head

  // legs
  const stride = pose === 'walk' || pose === 'herd' ? Math.sin(phase) * h * 0.13 : pose === 'dance' ? Math.sin(phase) * h * 0.06 : 0;
  const bend = pose === 'farm' ? h * 0.08 : 0;
  line(ctx, -h * 0.07, hip, -h * 0.1 + stride - bend, 0);
  line(ctx, h * 0.07, hip, h * 0.1 - stride + bend, 0);

  // arms
  const ax = h * 0.15;
  if (pose === 'cheer' || pose === 'dance') {
    const lift = pose === 'cheer' ? -h * 0.35 : -h * 0.12 + Math.sin(phase) * h * 0.06;
    line(ctx, -ax, sh, -h * 0.3, sh + lift);
    line(ctx, ax, sh, h * 0.3, sh + lift);
  } else if (pose === 'farm') {
    const reach = Math.sin(phase) * h * 0.05;
    line(ctx, -ax, sh, h * 0.05, -h * 0.25 + reach);
    line(ctx, ax, sh, h * 0.25, -h * 0.2 - reach);
  } else if (pose === 'herd') {
    line(ctx, -ax, sh, -h * 0.25, sh + h * 0.28 - stride * 0.5);
    line(ctx, ax, sh, h * 0.3, sh + h * 0.1);
    line(ctx, h * 0.3, sh + h * 0.1, h * 0.45, -h * 0.05); // stick
    line(ctx, h * 0.3, sh + h * 0.1, h * 0.2, -h * 1.05);
  } else {
    const swing = pose === 'walk' ? Math.sin(phase) * h * 0.1 : 0;
    line(ctx, -ax, sh, -h * 0.24 - swing, sh + h * 0.32);
    line(ctx, ax, sh, h * 0.24 + swing, sh + h * 0.32);
  }
  if (pot) {
    // load carried on the head
    ctx.beginPath();
    ctx.ellipse(0, -h * 1.06, h * 0.11, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Pack bullock with optional sacks. (x, y) = hooves. */
export function bullock(ctx, x, y, s = 1, { phase = 0, dir = 1, load = true, alpha = 1, plough = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  ink(ctx, 1, alpha);
  ctx.lineWidth = 3;
  // legs (diagonal pairs move together)
  const a = Math.sin(phase) * 8;
  line(ctx, -30, -30, -34 + a, 0);
  line(ctx, -20, -30, -16 - a, 0);
  line(ctx, 22, -30, 18 - a, 0);
  line(ctx, 32, -30, 36 + a, 0);
  // body
  ctx.beginPath();
  ctx.ellipse(0, -40, 42, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  tri(ctx, 14, -50, 32, -50, 22, -66); // hump
  // neck & head
  tri(ctx, 34, -50, 46, -34, 58, -52);
  tri(ctx, 52, -56, 66, -50, 62, -38);
  ctx.beginPath(); // horns
  ctx.moveTo(56, -55);
  ctx.quadraticCurveTo(50, -72, 60, -76);
  ctx.moveTo(60, -54);
  ctx.quadraticCurveTo(66, -70, 74, -70);
  ctx.stroke();
  ctx.beginPath(); // tail
  ctx.moveTo(-42, -42);
  ctx.quadraticCurveTo(-56, -30 + Math.sin(phase * 0.7) * 4, -50, -12);
  ctx.stroke();
  if (load) {
    ctx.fillStyle = '#e7c48d';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    for (const sx of [-26, -4]) {
      ctx.beginPath();
      ctx.roundRect(sx, -74, 22, 22, 5);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (plough) {
    ctx.strokeStyle = INK;
    line(ctx, -44, -36, -95, -8);
    line(ctx, -95, -8, -102, 6);
  }
  ctx.restore();
}

export function sun(ctx, x, y, r, rot = 0, alpha = 1) {
  ctx.save();
  ink(ctx, 1, alpha);
  circle(ctx, x, y, r);
  ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const an = rot + (i / 16) * Math.PI * 2;
    line(ctx, x + Math.cos(an) * r * 1.25, y + Math.sin(an) * r * 1.25, x + Math.cos(an) * r * 1.55, y + Math.sin(an) * r * 1.55);
  }
  ctx.restore();
}

export function moon(ctx, x, y, r, alpha = 1) {
  ctx.save();
  ink(ctx, 1, alpha);
  // crescent: clip away the overlapping disc instead of erasing (erasing would punch through the background)
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.9, 0, Math.PI * 2, true);
  ctx.clip();
  circle(ctx, x, y, r);
  ctx.restore();
}

export function bird(ctx, x, y, s, phase) {
  ctx.save();
  ink(ctx, s);
  const f = Math.sin(phase) * 6 * s;
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y - f);
  ctx.quadraticCurveTo(x - 5 * s, y - 6 * s, x, y);
  ctx.quadraticCurveTo(x + 5 * s, y - 6 * s, x + 12 * s, y - f);
  ctx.stroke();
  ctx.restore();
}

/** Rolling hills / dunes band. */
export function hills(ctx, baseY, amp, color, offset = 0, freq = 0.006) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, baseY - Math.sin(x * freq + offset) * amp - Math.sin(x * freq * 2.3 + offset * 1.7) * amp * 0.35);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Chittorgarh-style hill fort with a victory tower. */
export function fort(ctx, cx, baseY, s = 1, reveal = 1) {
  ctx.save();
  ctx.globalAlpha *= reveal;
  ctx.fillStyle = 'rgba(70,20,5,0.55)';
  ctx.beginPath(); // hill
  ctx.moveTo(cx - 420 * s, baseY);
  ctx.quadraticCurveTo(cx - 250 * s, baseY - 120 * s, cx - 120 * s, baseY - 135 * s);
  ctx.lineTo(cx + 160 * s, baseY - 135 * s);
  ctx.quadraticCurveTo(cx + 300 * s, baseY - 115 * s, cx + 440 * s, baseY);
  ctx.closePath();
  ctx.fill();
  ink(ctx, s);
  const top = baseY - 135 * s;
  // wall with merlons
  ctx.fillRect(cx - 200 * s, top - 34 * s, 330 * s, 34 * s);
  for (let x = cx - 200 * s; x < cx + 130 * s; x += 22 * s) ctx.fillRect(x, top - 46 * s, 12 * s, 12 * s);
  // bastions
  for (const bx of [cx - 210 * s, cx + 120 * s]) ctx.fillRect(bx, top - 60 * s, 34 * s, 60 * s);
  // victory tower (tiered)
  const tx = cx - 40 * s;
  for (let i = 0; i < 7; i++) {
    const w = (40 - i * 3) * s;
    ctx.fillRect(tx - w / 2, top - 46 * s - (i + 1) * 26 * s, w, 22 * s);
  }
  tri(ctx, tx - 14 * s, top - 46 * s - 182 * s, tx + 14 * s, top - 46 * s - 182 * s, tx, top - 46 * s - 205 * s);
  // gate
  ctx.fillStyle = 'rgba(90,30,10,0.9)';
  ctx.beginPath();
  ctx.arc(cx + 60 * s, top - 6 * s, 12 * s, Math.PI, 0);
  ctx.fillRect(cx + 48 * s, top - 6 * s, 24 * s, 6 * s);
  ctx.fill();
  ctx.restore();
}

export function waves(ctx, y, t, alpha = 0.7, rows = 4) {
  ctx.save();
  ink(ctx, 1, alpha);
  ctx.lineWidth = 2.5;
  for (let r = 0; r < rows; r++) {
    const yy = y + r * 34;
    const off = (t * (40 + r * 12)) % 60;
    ctx.beginPath();
    for (let x = -60 + off; x < W + 60; x += 60) {
      ctx.moveTo(x, yy);
      ctx.quadraticCurveTo(x + 15, yy - 12, x + 30, yy);
      ctx.quadraticCurveTo(x + 45, yy + 12, x + 60, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Lateen-sailed dhow. */
export function boat(ctx, x, y, s = 1, bob = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(bob) * 4);
  ctx.rotate(Math.sin(bob * 0.8) * 0.03);
  ctx.scale(s, s);
  ink(ctx, 1);
  ctx.beginPath();
  ctx.moveTo(-80, -20);
  ctx.lineTo(80, -20);
  ctx.lineTo(55, 8);
  ctx.lineTo(-60, 8);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 3;
  line(ctx, 0, -20, 0, -130);
  tri(ctx, 4, -126, 70, -30, 4, -30);
  tri(ctx, -4, -110, -4, -30, -55, -30);
  ctx.restore();
}

/** Steam train moving right; `x` is the engine front. */
export function train(ctx, x, y, s = 1, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ink(ctx, 1);
  // engine
  ctx.fillRect(-150, -70, 110, 50);
  ctx.fillRect(-60, -110, 40, 90);
  ctx.fillRect(-130, -105, 22, 35);
  tri(ctx, -40, -20, -10, -20, -40, -55);
  // coaches
  for (let i = 0; i < 3; i++) {
    const cx = -330 - i * 185;
    ctx.fillRect(cx, -85, 170, 65);
    ctx.fillStyle = '#8c3b1f';
    for (let w = 0; w < 4; w++) ctx.fillRect(cx + 14 + w * 40, -74, 26, 22);
    ctx.fillStyle = INK;
    line(ctx, cx + 170, -45, cx + 185, -45);
  }
  // wheels
  ctx.lineWidth = 3;
  const wheels = [-130, -85, -315, -195, -500, -380, -685, -565];
  for (const wx of wheels) {
    ctx.save();
    ctx.translate(wx, -12);
    ctx.rotate(t * 6);
    ctx.fillStyle = '#7c3216';
    circle(ctx, 0, 0, 14);
    ctx.strokeStyle = INK;
    circle(ctx, 0, 0, 14, false);
    line(ctx, -14, 0, 14, 0);
    line(ctx, 0, -14, 0, 14);
    ctx.restore();
  }
  // smoke puffs drifting back
  ctx.fillStyle = INK;
  for (let i = 0; i < 7; i++) {
    const k = ((t * 1.4 + i / 7) % 1);
    ctx.globalAlpha = 0.6 * (1 - k);
    circle(ctx, -119 - k * 260, -115 - k * 90, 10 + k * 26);
  }
  ctx.restore();
}

/** Rails across the whole width. */
export function rails(ctx, y) {
  ctx.save();
  ink(ctx, 1, 0.8);
  ctx.lineWidth = 3;
  line(ctx, 0, y, W, y);
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 28) line(ctx, x, y + 2, x + 10, y + 10);
  ctx.restore();
}

/** Warli hut: square walls, triangle roof. */
export function hut(ctx, x, y, s = 1, alpha = 1) {
  ctx.save();
  ink(ctx, s, alpha);
  ctx.lineWidth = 3 * s;
  ctx.strokeRect(x - 30 * s, y - 45 * s, 60 * s, 45 * s);
  tri(ctx, x - 42 * s, y - 45 * s, x + 42 * s, y - 45 * s, x, y - 85 * s);
  ctx.fillRect(x - 8 * s, y - 26 * s, 16 * s, 26 * s);
  ctx.restore();
}

/** Warli tree: trunk with many small branches and leaf dots. */
export function tree(ctx, x, y, s = 1, grow = 1, sway = 0) {
  ctx.save();
  ink(ctx, s);
  ctx.lineWidth = 4 * s;
  const h = 180 * s * grow;
  line(ctx, x, y, x + sway * 4, y - h);
  ctx.lineWidth = 2 * s;
  const n = Math.floor(18 * grow);
  for (let i = 0; i < n; i++) {
    const k = 0.25 + (i / 18) * 0.75;
    const by = y - h * k;
    const dir = i % 2 ? 1 : -1;
    const len = (60 - k * 40) * s;
    const ex = x + sway * 4 * k + dir * len;
    const ey = by - len * 0.6;
    line(ctx, x + sway * 4 * k, by, ex, ey);
    circle(ctx, ex, ey, 3.5 * s);
  }
  ctx.restore();
}

/** Rows of paddy seedlings that grow with `grow` (0..1). */
export function paddy(ctx, y0, rows, grow, t) {
  ctx.save();
  ink(ctx, 1, 0.85);
  ctx.lineWidth = 2;
  for (let r = 0; r < rows; r++) {
    const yy = y0 + r * 30;
    const sc = 0.7 + r * 0.12;
    for (let x = (r % 2) * 22; x < W; x += 44) {
      const g = clamp(grow * 1.6 - (x / W) * 0.6);
      if (g <= 0) continue;
      const hgt = 22 * sc * g;
      const sw = Math.sin(t * 2 + x * 0.05) * 2;
      line(ctx, x, yy, x - 7 * sc + sw, yy - hgt);
      line(ctx, x, yy, x + sw, yy - hgt * 1.2);
      line(ctx, x, yy, x + 7 * sc + sw, yy - hgt);
    }
  }
  ctx.restore();
}

export function rain(ctx, t, alpha = 0.5) {
  ctx.save();
  ink(ctx, 1, alpha);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 120; i++) {
    const x = (i * 97.3 + t * 260) % (W + 100) - 50;
    const y = (i * 53.7 + t * 520) % H;
    line(ctx, x, y, x - 8, y + 20);
  }
  ctx.restore();
}

/** Factory blocks, chimneys and a reactor dome (Tarapur / MIDC). */
export function industry(ctx, baseY, t, reveal = 1) {
  ctx.save();
  ctx.globalAlpha *= reveal;
  ink(ctx, 1);
  const blocks = [
    [80, 110, 120],
    [210, 80, 170],
    [300, 140, 95],
    [880, 120, 130],
    [1010, 160, 100],
    [1180, 90, 150],
  ];
  for (const [x, w, h] of blocks) {
    ctx.fillRect(x, baseY - h, w, h);
    ctx.fillStyle = '#8c3b1f';
    for (let wy = baseY - h + 16; wy < baseY - 20; wy += 26) for (let wx = x + 12; wx < x + w - 14; wx += 24) ctx.fillRect(wx, wy, 12, 12);
    ctx.fillStyle = INK;
  }
  // chimneys + smoke
  for (const cx of [250, 1050]) {
    ctx.fillRect(cx, baseY - 260, 20, 120);
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.5 + i / 5) % 1;
      ctx.globalAlpha = 0.5 * (1 - k) * reveal;
      circle(ctx, cx + 10 + k * 70, baseY - 270 - k * 120, 10 + k * 22);
    }
    ctx.globalAlpha = reveal;
  }
  // reactor domes
  for (const dx of [560, 700]) {
    ctx.beginPath();
    ctx.arc(dx, baseY - 90, 62, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(dx - 62, baseY - 90, 124, 90);
  }
  ctx.restore();
}

/** Graduation cap. */
export function gradCap(ctx, x, y, s = 1, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ink(ctx, 1);
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(0, -12);
  ctx.lineTo(26, 0);
  ctx.lineTo(0, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-12, 4, 24, 12);
  ctx.lineWidth = 2;
  line(ctx, 20, 2, 22, 20);
  ctx.restore();
}

/** Text helpers ─────────────────────────────────────────────────────────── */
export function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
