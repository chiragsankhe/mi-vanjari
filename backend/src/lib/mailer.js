import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { ApiError } from '../utils/http.js';

/**
 * Outgoing email (Gmail SMTP by default). Used for admin login codes and sign-in alerts.
 * Configure SMTP_USER / SMTP_PASS (a Gmail App Password) in backend/.env.
 */
let transporter;
function getTransporter() {
  transporter ||= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s/g, '') }, // Gmail shows app passwords with spaces
  });
  return transporter;
}

/** "Mi Vanjari <hello@x.com>" → { name, email } */
function sender() {
  const raw = env.MAIL_FROM || `Mi Vanjari <${env.SMTP_USER}>`;
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || 'Mi Vanjari', email: m[2].trim() } : { name: 'Mi Vanjari', email: raw.trim() };
}

async function sendViaBrevo({ to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: sender(), to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export async function sendMail({ to, subject, html, text }) {
  if (!env.mailConfigured) throw new ApiError(503, 'MAIL_NOT_CONFIGURED', 'Email is not set up yet (BREVO_API_KEY or SMTP_USER / SMTP_PASS).');
  try {
    if (env.mailProvider === 'brevo') await sendViaBrevo({ to, subject, html, text });
    else {
      const s = sender();
      await getTransporter().sendMail({ from: `${s.name} <${s.email}>`, to, subject, html, text });
    }
  } catch (err) {
    logger.error({ err: err.message, to }, 'Email send failed');
    throw new ApiError(502, 'MAIL_SEND_FAILED', 'Could not send the email right now. Please try again in a minute.');
  }
}

const shell = (title, body) => `<!doctype html><html><body style="margin:0;background:#f5efe6;font-family:Segoe UI,Arial,sans-serif;color:#201c18">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffaf3;border-radius:16px;overflow:hidden;border:1px solid #e8ddd0">
<tr><td style="background:#9e2e0f;background:linear-gradient(120deg,#9e2e0f,#c8411a);padding:20px 24px;color:#fff">
<div style="font-size:20px;font-weight:700">मी वंजारी · Mi Vanjari</div><div style="font-size:12px;letter-spacing:2px;color:#f1bf76;text-transform:uppercase">${title}</div></td></tr>
<tr><td style="padding:24px">${body}</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e8ddd0;font-size:11px;color:#6f675f">Made by Chirag Sankhe · This is an automated security email.</td></tr>
</table></td></tr></table></body></html>`;

export function adminCodeEmail({ code, ip, minutes }) {
  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  return {
    subject: `${code} is your Mi Vanjari admin code`,
    text: `Your Mi Vanjari admin sign-in code is ${code}. It expires in ${minutes} minutes. Requested ${when} from IP ${ip}. If this wasn't you, ignore this email — nobody can sign in without your admin password.`,
    html: shell(
      'Admin sign-in code',
      `<p style="margin:0 0 12px">Use this code to sign in to the admin panel:</p>
<div style="font-size:34px;font-weight:700;letter-spacing:10px;background:#fbe7de;color:#9e2e0f;border-radius:12px;padding:14px 0;text-align:center">${code}</div>
<p style="font-size:13px;color:#6f675f;margin:14px 0 0">It expires in ${minutes} minutes. Requested ${when} (IST) from IP ${ip}.</p>
<p style="font-size:13px;color:#6f675f;margin:8px 0 0"><b>Didn't request this?</b> Ignore this email — nobody can sign in without your admin password. Never share this code.</p>`,
    ),
  };
}

export function loginCodeEmail({ code, minutes }) {
  return {
    subject: `${code} is your Mi Vanjari login code`,
    text: `Your Mi Vanjari login code is ${code}. It expires in ${minutes} minutes. If you didn't try to log in, you can ignore this email. Never share this code with anyone.`,
    html: shell(
      'Login code',
      `<p style="margin:0 0 12px">नमस्कार! Use this code to log in to Mi Vanjari:</p>
<div style="font-size:34px;font-weight:700;letter-spacing:10px;background:#fbe7de;color:#9e2e0f;border-radius:12px;padding:14px 0;text-align:center">${code}</div>
<p style="font-size:13px;color:#6f675f;margin:14px 0 0">It expires in ${minutes} minutes.</p>
<p style="font-size:13px;color:#6f675f;margin:8px 0 0"><b>Didn't try to log in?</b> Ignore this email. Never share this code — Mi Vanjari will never ask for it.</p>`,
    ),
  };
}

export function adminLoginAlertEmail({ ip, userAgent }) {
  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  return {
    subject: 'New sign-in to the Mi Vanjari admin panel',
    text: `Someone signed in to the Mi Vanjari admin panel on ${when} (IST) from IP ${ip} (${userAgent}). If this wasn't you, change the admin password immediately.`,
    html: shell(
      'Security alert',
      `<p style="margin:0 0 10px"><b>New sign-in to the admin panel</b></p>
<p style="font-size:13px;margin:0">When: ${when} (IST)<br>IP address: ${ip}<br>Device: ${String(userAgent || 'unknown').slice(0, 120)}</p>
<p style="font-size:13px;color:#9e2e0f;margin:12px 0 0"><b>Wasn't you?</b> Ask another admin to reset your admin password from Admin → Members, and check Admin → Security.</p>`,
    ),
  };
}
