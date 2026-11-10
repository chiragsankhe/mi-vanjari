import { clsx } from 'clsx';

export const cn = (...args) => clsx(...args);

export const formatINR = (n) => (n == null ? '' : `₹${Number(n).toLocaleString('en-IN')}`);

export function compactNumber(n) {
  if (n == null) return '0';
  if (n >= 100000) return `${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const timeOfDay = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

export function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'TODAY';
  if (d.toDateString() === y.toDateString()) return 'YESTERDAY';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
}

export function lastActive(date, online) {
  if (online) return 'Online now';
  if (!date) return 'Active recently';
  const mins = (Date.now() - new Date(date).getTime()) / 60000;
  if (mins < 10) return 'Active just now';
  if (mins < 60 * 24) return `Active ${timeAgo(date)}`;
  return 'Active recently';
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const whatsappLink = (phone, text = '') => `https://wa.me/${String(phone).replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const telLink = (phone) => `tel:${String(phone).replace(/\s/g, '')}`;

export const formatPhone = (p) => {
  const d = String(p || '').replace(/\D/g, '').slice(-10);
  return d ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : '';
};

/** 64 → 5′4″ */
export const feetInches = (inches) => `${Math.floor(inches / 12)}′${inches % 12}″`;

/** 172 → 5′8″ (rounded to the nearest inch, the way people say their height) */
export const cmToFeet = (cm) => (cm ? feetInches(Math.round(cm / 2.54)) : null);

/**
 * Height filter is shown in feet/inches but the database stores cm.
 * A slider value of 5′8″ covers everyone who rounds to 5′8″ (171–174 cm).
 */
export const inchesToCmMin = (inches) => Math.ceil((inches - 0.5) * 2.54);
export const inchesToCmMax = (inches) => Math.floor((inches + 0.5) * 2.54);

export const heightLabel = (cm) => {
  if (!cm) return null;
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′${inches % 12}″ · ${cm} cm`;
};

export const LABELS = {
  NEVER_MARRIED: 'Never married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  NUCLEAR: 'Nuclear family',
  JOINT: 'Joint family',
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};
