/** Mask the last 4 digits: +919876543210 → "+91 98765 4****" style → "+91 98765 ****". */
export function maskPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  const local = digits.slice(-10);
  return `+91 ${local.slice(0, 5)} ****`;
}

export function formatPhone(phone) {
  if (!phone) return null;
  const local = phone.replace(/\D/g, '').slice(-10);
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

/** Normalise any Indian mobile input to E.164 (+91XXXXXXXXXX). Returns null if invalid. */
export function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** "25-27" style age bracket shown on locked profiles instead of the exact age. */
export function ageRange(age) {
  if (age == null) return null;
  const lo = age - (age % 3);
  return `${lo}-${lo + 2}`;
}

export function firstName(fullName = '') {
  return fullName.trim().split(/\s+/)[0] || '';
}

/** Convert a JS Date for a given calendar day (DOB) to a YYYY-MM-DD string. */
export function toDateString(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : null;
}
