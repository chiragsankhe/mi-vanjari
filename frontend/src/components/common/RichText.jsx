import { useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from '../ui';

/**
 * Formatted text for "About" sections. People write with a small toolbar (bold, italic, colours, headings, lists, emoji);
 * what is stored is plain text with a few simple marks, and this file turns the marks into styled text.
 * Nothing is ever inserted as HTML, so a pasted <script> or link is just text.
 *
 *   **bold**      __italic__      [red]coloured text[/]      ## heading      - list item      (any emoji)
 */
export const COLORS = {
  red: { label: 'Red', hex: '#c8411a' },
  orange: { label: 'Orange', hex: '#d97706' },
  gold: { label: 'Gold', hex: '#a37a00' },
  green: { label: 'Green', hex: '#2f6a51' },
  blue: { label: 'Blue', hex: '#1f6f8b' },
  purple: { label: 'Purple', hex: '#7b4a8f' },
};

const INLINE = /(\*\*[\s\S]+?\*\*|__[\s\S]+?__|\[(red|orange|gold|green|blue|purple)\][\s\S]+?\[\/\])/;

/** inline marks → React nodes (marks can sit inside each other: **bold [red]and red[/]**) */
function inline(text, key = 'k') {
  const out = [];
  let rest = text;
  let n = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index) out.push(rest.slice(0, m.index));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (tok.startsWith('**')) out.push(<strong key={k}>{inline(tok.slice(2, -2), k)}</strong>);
    else if (tok.startsWith('__')) out.push(<em key={k}>{inline(tok.slice(2, -2), k)}</em>);
    else {
      const name = m[2];
      out.push(
        <span key={k} style={{ color: COLORS[name].hex }} className="font-semibold">
          {inline(tok.slice(name.length + 2, -3), k)}
        </span>,
      );
    }
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

/** Shows formatted text. `className` styles the whole block. */
export function RichText({ text, className, empty = null }) {
  const src = String(text || '').trim();
  if (!src) return empty;
  const lines = src.split('\n');
  const blocks = [];
  let list = null;
  lines.forEach((raw, i) => {
    const line = raw.replace(/\s+$/, '');
    const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!list) blocks.push((list = { type: 'ul', items: [], key: `l${i}` }));
      list.items.push(bullet[1]);
      return;
    }
    list = null;
    if (!line.trim()) return blocks.push({ type: 'gap', key: `g${i}` });
    const h = /^#{1,3}\s+(.*)$/.exec(line);
    blocks.push(h ? { type: 'h', text: h[1], key: `h${i}` } : { type: 'p', text: line, key: `p${i}` });
  });
  return (
    <div className={cn('space-y-1.5 text-[14px] leading-relaxed text-[#4b4641] [overflow-wrap:anywhere]', className)}>
      {blocks.map((b) =>
        b.type === 'ul' ? (
          <ul key={b.key} className="space-y-1 pl-1">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span>{inline(it, `${b.key}-${j}`)}</span>
              </li>
            ))}
          </ul>
        ) : b.type === 'h' ? (
          <h3 key={b.key} className="pt-1.5 font-serif text-[16px] font-semibold text-ink">
            {inline(b.text, b.key)}
          </h3>
        ) : b.type === 'gap' ? (
          <div key={b.key} className="h-1" />
        ) : (
          <p key={b.key}>{inline(b.text, b.key)}</p>
        ),
      )}
    </div>
  );
}

/** The same text without any marks — for small cards and lists. */
export const plainText = (text) =>
  String(text || '')
    .replace(/\[(red|orange|gold|green|blue|purple)\]/g, '')
    .replace(/\[\/\]/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/^\s*#{1,3}\s+/gm, '')
    .replace(/^\s*[-•]\s+/gm, '• ')
    .replace(/\n{2,}/g, '\n')
    .trim();

const EMOJI = [
  '🏖️', '🌊', '🏡', '🛏️', '🛁', '🏊', '🌴', '🌿', '🌸', '💐', '🎉', '🎊', '💍', '🍽️', '🍛', '🥗', '🍰', '🎶', '🎤', '📸', '🚗', '🅿️', '❄️', '📶', '🔥', '✅', '⭐', '✨', '📍', '☎️', '📱', '💰', '🕘', '🙏', '❤️', '👍', '👨‍👩‍👧‍👦', '🌅', '🧘', '🎂', '🛕', '🐄', '🌾', '👗', '💄', '🚌', '🎁', '🏆',
];

/**
 * Text box with a small formatting toolbar. Controlled: value / onChange(text).
 * Select some text and tap a button to format it, or tap with nothing selected to insert the mark.
 */
export function RichTextEditor({ value = '', onChange, rows = 7, placeholder, maxLength = 5000, error, label = 'Description', id }) {
  const ref = useRef(null);
  const [panel, setPanel] = useState(null); // 'color' | 'emoji' | null
  const [preview, setPreview] = useState(false);
  const text = value || '';

  const edit = (fn) => {
    const el = ref.current;
    const s = el?.selectionStart ?? text.length;
    const e = el?.selectionEnd ?? text.length;
    const { next, from, to } = fn(text, s, e);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(from, to);
    });
  };
  const wrap = (before, after, sample) => () =>
    edit((t, s, e) => {
      const picked = t.slice(s, e) || sample;
      const next = t.slice(0, s) + before + picked + after + t.slice(e);
      return { next, from: s + before.length, to: s + before.length + picked.length };
    });
  const linePrefix = (prefix) => () =>
    edit((t, s, e) => {
      const start = t.lastIndexOf('\n', s - 1) + 1;
      const endIdx = t.indexOf('\n', e);
      const end = endIdx === -1 ? t.length : endIdx;
      const block = t.slice(start, end).split('\n').map((l) => (l.startsWith(prefix) ? l : prefix + l.replace(/^(#{1,3}|[-•])\s+/, ''))).join('\n');
      return { next: t.slice(0, start) + block + t.slice(end), from: start, to: start + block.length };
    });
  const insert = (str) => {
    edit((t, s, e) => ({ next: t.slice(0, s) + str + t.slice(e), from: s + str.length, to: s + str.length }));
  };

  const Btn = ({ onClick, label: l, children, on }) => (
    <button type="button" onClick={onClick} aria-label={l} title={l} className={cn('grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-[13px] font-semibold transition', on ? 'bg-primary text-white' : 'bg-white text-[#4b4641] hover:bg-primary-soft hover:text-primary')}>
      {children}
    </button>
  );

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className={cn('overflow-hidden rounded-xl border bg-white transition focus-within:ring-4 focus-within:ring-primary/10', error ? 'border-primary' : 'border-line focus-within:border-primary/60')}>
        <div className="flex flex-wrap items-center gap-1 border-b border-line bg-[#fbf6ef] p-1.5">
          <Btn onClick={wrap('**', '**', 'bold text')} label="Bold">
            <b>B</b>
          </Btn>
          <Btn onClick={wrap('__', '__', 'italic text')} label="Italic">
            <i className="font-serif">I</i>
          </Btn>
          <Btn onClick={linePrefix('## ')} label="Heading">
            H
          </Btn>
          <Btn onClick={linePrefix('- ')} label="Bullet list">
            <Icon name="grid" size={15} />
          </Btn>
          <Btn onClick={() => setPanel(panel === 'color' ? null : 'color')} label="Text colour" on={panel === 'color'}>
            <span className="relative font-bold">
              A<span className="absolute -bottom-0.5 left-0 h-[3px] w-full rounded-full bg-[linear-gradient(90deg,#c8411a,#d97706,#2f6a51,#1f6f8b)]" />
            </span>
          </Btn>
          <Btn onClick={() => setPanel(panel === 'emoji' ? null : 'emoji')} label="Add emoji or icon" on={panel === 'emoji'}>
            <span className="text-[16px] leading-none">😊</span>
          </Btn>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <Btn onClick={() => setPreview((p) => !p)} label="Preview" on={preview}>
            <span className="flex items-center gap-1 px-1 text-xs">
              <Icon name="eye" size={14} /> Preview
            </span>
          </Btn>
        </div>
        {panel === 'color' && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-2.5 py-2">
            <span className="text-[11px] text-muted">Select text, then tap a colour:</span>
            {Object.entries(COLORS).map(([name, c]) => (
              <button key={name} type="button" onClick={wrap(`[${name}]`, '[/]', 'coloured text')} aria-label={c.label} title={c.label} className="size-7 rounded-full border-2 border-white shadow ring-1 ring-line transition hover:scale-110" style={{ background: c.hex }} />
            ))}
          </div>
        )}
        {panel === 'emoji' && (
          <div className="flex max-h-28 flex-wrap gap-0.5 overflow-y-auto border-b border-line bg-white p-1.5">
            {EMOJI.map((em) => (
              <button key={em} type="button" onClick={() => insert(em)} className="grid size-9 place-items-center rounded-lg text-[20px] hover:bg-primary-soft" aria-label={`Insert ${em}`}>
                {em}
              </button>
            ))}
          </div>
        )}
        {preview ? (
          <div className="min-h-32 p-3.5">
            <RichText text={text} empty={<p className="text-sm text-muted">Nothing to preview yet.</p>} />
          </div>
        ) : (
          <textarea
            id={id}
            ref={ref}
            rows={rows}
            value={text}
            maxLength={maxLength + 500}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full resize-y bg-transparent p-3.5 text-sm leading-relaxed text-ink outline-none placeholder:text-[#a99d92]"
          />
        )}
      </div>
      <div className="mt-1 flex items-start justify-between gap-3">
        {error ? <span className="field-error">{error}</span> : <span className="text-[11px] text-muted">Tip: use emoji like ✅ 🛏️ 📍 as icons, <b>B</b> for bold, and colours to highlight what matters.</span>}
        <span className={cn('shrink-0 text-[11px]', text.length > maxLength ? 'text-primary' : 'text-muted')}>
          {text.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
