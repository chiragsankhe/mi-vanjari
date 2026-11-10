import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { Icon, Spinner } from '../ui';
import { useMembershipCheckout } from './useMembershipCheckout';

const BENEFITS = [
  ['search', 'Browse every matrimony profile with all filters'],
  ['users', 'See family contacts and call families directly'],
  ['zodiac', 'Kundali (Guna Milan) match with any profile'],
  ['heart', 'Your profile appears in matrimony search'],
  ['eye', 'Shortlist profiles and see who viewed you'],
];

const longDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/** Membership card with benefits and the Pay button. `compact` for inline use (profile pages). */
export function Paywall({ compact = false, title, className, onPaid }) {
  const m = useAuth((s) => s.user?.membership);
  const { pay, busy, dialog } = useMembershipCheckout({ onPaid });
  const fee = m?.fee ?? 501;
  const days = m?.days ?? 365;

  if (compact) {
    return (
      <div className={cn('card overflow-hidden border-gold/50', className)}>
        <div className="flex flex-col gap-3 bg-[linear-gradient(110deg,#fff8e6,#fdeee3)] p-5 sm:flex-row sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold text-white">
            <Icon name="lock" size={20} />
          </span>
          <div className="flex-1">
            <b className="block">{title || 'Matrimony details are for members'}</b>
            <span className="text-sm text-muted">
              Family contacts, preferences and Kundali match unlock with membership — ₹{fee} per year.
            </span>
          </div>
          <button className="btn btn-primary shrink-0" onClick={pay} disabled={busy}>
            {busy ? <Spinner size={16} /> : <>Become a member · ₹{fee}</>}
          </button>
        </div>
        {dialog}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn('mx-auto max-w-2xl overflow-hidden rounded-2xl border border-gold/50 bg-white shadow-[var(--shadow-card)]', className)}>
      <div className="relative overflow-hidden bg-[linear-gradient(125deg,#9e2e0f,#c8411a_55%,#d4a017)] px-6 py-8 text-center text-white sm:px-10">
        <motion.span initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 10 }} className="mx-auto grid size-16 place-items-center rounded-full bg-white/20 text-white">
          <Icon name="heart" size={30} />
        </motion.span>
        <p className="mt-3 text-xs font-semibold tracking-[0.16em] text-[#ffe2b8] uppercase">Matrimony membership</p>
        <h2 className="heading-deva mt-1 text-3xl font-bold">{title || 'जीवनसाथी शोधा — सदस्य व्हा'}</h2>
        <p className="mt-3 font-serif text-5xl font-bold">
          ₹{fee}
          <span className="ml-1 text-lg font-normal text-white/80">/ {days === 365 ? 'year' : `${days} days`}</span>
        </p>
        {m && !m.required && m.paidFrom && <p className="mt-2 text-sm text-white/85">Free for everyone until {longDate(new Date(new Date(m.paidFrom).getTime() - 86400_000))}. Pay early and your year starts on {longDate(m.paidFrom)}.</p>}
      </div>
      <div className="p-6 sm:p-8">
        <ul className="space-y-2.5">
          {BENEFITS.map(([icon, text]) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf-soft text-leaf">
                <Icon name={icon} size={15} />
              </span>
              {text}
            </li>
          ))}
        </ul>
        <button className="btn btn-primary mt-6 w-full text-base" onClick={pay} disabled={busy}>
          {busy ? <Spinner size={18} /> : <>Pay ₹{fee} securely <Icon name="arrow" size={17} /></>}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
          <Icon name="shield" size={13} /> Secure payment by Razorpay · UPI, cards, net banking · Receipt sent instantly
        </p>
        <p className="mt-1 text-center text-[11px] text-muted">Community features (history, business, services, achievers) stay free for everyone.</p>
      </div>
      {dialog}
    </motion.div>
  );
}
