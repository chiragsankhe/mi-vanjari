import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { Badge, Icon, Reveal, Spinner } from '../ui';
import { useMembershipCheckout } from './useMembershipCheckout';

const d = (x) => new Date(x).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const TONE = { PAID: 'green', FAILED: 'red', REFUNDED: 'blue' };

/** Settings → Matrimony membership: status, pay / renew, and receipts. */
export function MembershipCard() {
  const m = useAuth((s) => s.user?.membership);
  const { pay, busy, dialog } = useMembershipCheckout();
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments', 'mine'], queryFn: () => get('/payments/mine') });
  const ref = useRef(null);
  const [params] = useSearchParams();
  useEffect(() => {
    if (params.get('tab') === 'membership') ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [params]);
  if (!m) return null;

  const daysLeft = m.expiresAt ? Math.ceil((new Date(m.expiresAt) - Date.now()) / 86400_000) : 0;
  const upcoming = m.startsAt && new Date(m.startsAt) > new Date();
  let status;
  if (m.staff) status = ['Staff access', 'green', 'Admins and moderators always have matrimony access.'];
  else if (upcoming) status = ['Paid · starts soon', 'green', `Your membership runs ${d(m.startsAt)} – ${d(m.expiresAt)}. Matrimony is free for everyone until then.`];
  else if (m.active) status = [daysLeft <= 30 ? `Active · ${daysLeft} days left` : 'Active', daysLeft <= 30 ? 'gold' : 'green', `Valid until ${d(m.expiresAt)}.`];
  else if (!m.required) status = ['Free period', 'blue', `Matrimony is free until ${d(new Date(new Date(m.paidFrom).getTime() - 86400_000))}. From ${d(m.paidFrom)} it is ₹${m.fee} per year.`];
  else status = ['Not a member', 'red', `Matrimony needs a membership: ₹${m.fee} per year.`];

  return (
    <Reveal className="card overflow-hidden">
      <div ref={ref} className="scroll-mt-24" />
      <div className="flex flex-col gap-4 border-b border-line bg-[linear-gradient(110deg,#fff8e6,#fdeee3)] p-5 sm:flex-row sm:items-center sm:px-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white">
          <Icon name="heart" size={22} />
        </span>
        <div className="flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <b>Matrimony membership</b> <Badge tone={status[1]}>{status[0]}</Badge>
          </p>
          <p className="mt-0.5 text-sm text-muted">{status[2]}</p>
        </div>
        {!m.staff && (
          <button className={cn('btn shrink-0', m.active || upcoming ? 'btn-outline' : 'btn-primary')} onClick={pay} disabled={busy}>
            {busy ? <Spinner size={16} /> : m.active || upcoming ? `Renew early · ₹${m.fee}` : `Pay ₹${m.fee}`}
          </button>
        )}
      </div>
      <div className="px-5 py-4 sm:px-6">
        <h3 className="mb-2 text-sm font-semibold">Payments & receipts</h3>
        {isLoading ? (
          <Spinner />
        ) : payments.length ? (
          <ul className="divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="font-mono text-xs">{p.receipt}</span>
                <b>₹{p.amount / 100}</b>
                <Badge tone={TONE[p.status] || 'gray'}>{p.status}</Badge>
                {p.provider === 'DEV_TEST' && <Badge tone="gray">TEST</Badge>}
                <span className="text-xs text-muted">{d(p.paidAt || p.createdAt)}</span>
                {p.membership && p.status === 'PAID' && (
                  <span className="text-xs text-muted sm:ml-auto">
                    Valid {d(p.membership.startsAt)} – {d(p.membership.expiresAt)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No payments yet.</p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          <Icon name="shield" size={12} /> Payments are processed by Razorpay. Mi Vanjari never sees your card or UPI details.
        </p>
      </div>
      {dialog}
    </Reveal>
  );
}
