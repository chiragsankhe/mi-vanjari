import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, ConfirmDialog, Field, Icon, Skeleton, Spinner } from '../../components/ui';
import { api, errorMessage, get, put } from '../../lib/api';
import { cn, timeAgo } from '../../lib/utils';

/** Sample content: fake community members, posts, listings and achievers (tagged "Sample") so a new visitor sees a busy site. */
function SampleContentCard() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const { data } = useQuery({ queryKey: ['admin', 'sample'], queryFn: () => get('/admin/sample-content') });
  const done = (msg) => () => {
    qc.invalidateQueries({ queryKey: ['admin', 'sample'] });
    toast.success(msg);
    setConfirm(false);
  };
  const add = useMutation({ mutationFn: () => api.post('/admin/sample-content'), onSuccess: done('Sample content added'), onError: (e) => toast.error(errorMessage(e)) });
  const remove = useMutation({ mutationFn: () => api.delete('/admin/sample-content'), onSuccess: done('Sample content removed'), onError: (e) => toast.error(errorMessage(e)) });
  return (
    <div className="card h-max space-y-3 p-5 lg:col-span-2">
      <h3 className="flex items-center gap-2 font-semibold">
        <Icon name="users" size={17} className="text-primary" /> Sample content
        {data && <Badge tone={data.present ? 'green' : 'gray'}>{data.present ? 'SHOWING' : 'OFF'}</Badge>}
      </h3>
      <p className="text-xs leading-relaxed text-muted">
        Adds demo accounts with info in every section — community members and posts, businesses, wedding services (with packages), achievers and a few matrimony profiles — so you can test the site and new visitors see how it looks when busy. Every entry carries a <b>Sample</b> tag, uses illustrated avatars, has no phone number and cannot be messaged or followed.
        Sample entries are never counted in the public member numbers. <b>Remove it all with one click</b> whenever you like — real accounts are never touched.
      </p>
      {data?.present && (
        <p className="text-xs text-muted">
          Now showing: {data.members} members · {data.posts} posts · {data.businesses} businesses · {data.services} wedding services · {data.packages} packages · {data.achievements} achievers · {data.matrimony} matrimony profiles
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm" onClick={() => add.mutate()} disabled={add.isPending}>
          {add.isPending ? <Spinner size={15} /> : <><Icon name="plus" size={15} /> {data?.present ? 'Top up sample content' : 'Add sample content'}</>}
        </button>
        {data?.present && (
          <button className="btn btn-outline btn-sm" onClick={() => setConfirm(true)}>
            <Icon name="trash" size={15} /> Remove all sample content
          </button>
        )}
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => remove.mutate()} loading={remove.isPending} danger confirmLabel="Remove" title="Remove all sample content?">
        This deletes only the sample members, posts, listings and achievers. Real members and their content are not touched.
      </ConfirmDialog>
    </div>
  );
}

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
      <SampleContentCard />
    </div>
  );
}
