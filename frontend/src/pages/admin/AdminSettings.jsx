import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Field, Icon, Skeleton, Spinner } from '../../components/ui';
import { errorMessage, get, put } from '../../lib/api';
import { cn, timeAgo } from '../../lib/utils';

export function AdminSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => get('/admin/settings') });
  const { data: rev } = useQuery({ queryKey: ['admin', 'revenue'], queryFn: () => get('/admin/revenue') });
  const [v, setV] = useState(null);
  useEffect(() => data && setV(data), [data]);
  const save = useMutation({
    mutationFn: () => put('/admin/settings', v),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      setV(r);
      toast.success('Settings saved');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!v) return <Skeleton className="my-6 h-64" />;
  const startsIn = Math.ceil((new Date(`${v.matrimonyPaidFrom}T00:00:00+05:30`) - Date.now()) / 86400_000);

  return (
    <div className="grid gap-5 py-6 lg:grid-cols-[1fr_380px]">
      <form
        className="card space-y-4 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <h2 className="font-serif text-xl font-semibold">Matrimony membership</h2>
        <p className="-mt-2 text-sm text-muted">Members pay this to use matrimony (browse matches, family contacts, Kundali) and to be listed in search. Admins and moderators always have access.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fee (₹)" type="number" min={1} value={v.matrimonyFee} onChange={(e) => setV({ ...v, matrimonyFee: e.target.value })} />
          <Field label="Valid for (days)" type="number" min={1} value={v.membershipDays} onChange={(e) => setV({ ...v, membershipDays: e.target.value })} />
          <Field label="Charge from" type="date" value={v.matrimonyPaidFrom} onChange={(e) => setV({ ...v, matrimonyPaidFrom: e.target.value })} />
        </div>
        <p className={cn('rounded-lg px-3 py-2 text-xs', startsIn > 0 ? 'bg-leaf-soft text-leaf' : 'bg-[#fff5da] text-[#8c6100]')}>
          {startsIn > 0 ? `Matrimony is free for everyone for ${startsIn} more day${startsIn === 1 ? '' : 's'}. From ${new Date(v.matrimonyPaidFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} members need ₹${v.matrimonyFee} per ${v.membershipDays} days.` : `Payment is required now: ₹${v.matrimonyFee} per ${v.membershipDays} days.`}
        </p>
        <button className="btn btn-primary" disabled={save.isPending}>
          {save.isPending ? <Spinner size={16} /> : <><Icon name="check" size={16} /> Save settings</>}
        </button>
      </form>

      <div className="card h-max space-y-3 p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <Icon name="rupee" size={17} className="text-primary" /> Payment gateway
          {rev && <Badge tone={rev.paymentsMode === 'live' ? 'green' : rev.paymentsMode === 'test' ? 'gold' : 'red'}>{rev.paymentsMode === 'live' ? 'LIVE · Razorpay' : rev.paymentsMode === 'test' ? 'TEST MODE' : 'OFF'}</Badge>}
        </h3>
        <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-muted">
          <li>Create a free account at razorpay.com and complete KYC (PAN, bank account).</li>
          <li>
            Dashboard → Account &amp; Settings → API keys → generate keys. Put them in <code>backend/.env</code> as <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code>. Use <code>rzp_test_</code> keys first, then <code>rzp_live_</code>.
          </li>
          <li>
            Dashboard → Webhooks → add <code>https://&lt;your-api&gt;/api/v1/payments/webhook</code> with events <i>payment.captured</i>, <i>payment.failed</i>, <i>refund.processed</i>, and copy its secret to <code>RAZORPAY_WEBHOOK_SECRET</code>.
          </li>
          <li>Restart the backend. This badge turns green.</li>
        </ol>
        <p className="text-[11px] text-muted">Card / UPI details never touch our server — Razorpay collects them. We only store the order, the result and the receipt.</p>
        {data?.updatedAt && <p className="text-[11px] text-muted">Last changed {timeAgo(data.updatedAt)}</p>}
      </div>
    </div>
  );
}
