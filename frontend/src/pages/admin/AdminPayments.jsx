import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, CountUp, EmptyState, Icon, Modal, Skeleton, Spinner } from '../../components/ui';
import { useDebounce } from '../../hooks';
import { api, errorMessage, get, post } from '../../lib/api';
import { cn, formatPhone } from '../../lib/utils';

const STATUS = [
  ['', 'All'],
  ['PAID', 'Paid'],
  ['FAILED', 'Failed'],
  ['CREATED', 'Started'],
  ['REFUNDED', 'Refunded'],
];
const TONE = { PAID: 'green', FAILED: 'red', REFUNDED: 'blue', CREATED: 'gray' };
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** Money overview cards (also used on the admin Overview tab). */
export function RevenueCards() {
  const { data } = useQuery({ queryKey: ['admin', 'revenue'], queryFn: () => get('/admin/revenue') });
  const cards = [
    ['rupee', 'Total collected', data?.totalCollected, true],
    ['calendar', 'This month', data?.thisMonth, true],
    ['heart', 'Active members', data?.activeMembers],
    ['bell', 'Expiring in 30 days', data?.expiringSoon],
  ];
  return (
    <div className="space-y-3">
      {data?.paymentsMode && data.paymentsMode !== 'live' && (
        <p className={cn('rounded-lg px-4 py-2.5 text-xs', data.paymentsMode === 'off' ? 'bg-primary-soft text-primary' : 'bg-[#fff5da] text-[#8c6100]')}>
          <b>{data.paymentsMode === 'test' ? 'Test mode:' : 'Payments are OFF:'}</b>{' '}
          {data.paymentsMode === 'test'
            ? 'Razorpay keys are not set, so members see a simulated checkout (development only, no real money). Add your Razorpay keys in backend/.env to accept real payments.'
            : 'Razorpay keys are missing in production, so members cannot pay. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([icon, label, n, money], i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4">
            <Icon name={icon} size={18} className="text-primary" />
            <b className="mt-2 block font-serif text-2xl">
              {n == null ? '–' : (
                <>
                  {money && '₹'}
                  <CountUp to={n} duration={0.8} />
                </>
              )}
            </b>
            <small className="text-xs text-muted">{label}</small>
          </motion.div>
        ))}
      </div>
      {data && (
        <p className="text-xs text-muted">
          {data.paidCount} successful payments · {data.failedCount} failed · {inr(data.refunded)} refunded · fee {inr(data.settings.matrimonyFee)} for {data.settings.membershipDays} days, charged from {new Date(data.settings.matrimonyPaidFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}

function RefundDialog({ payment, onClose }) {
  const [reason, setReason] = useState('');
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => post(`/admin/payments/${payment.id}/refund`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Refunded — membership period ended');
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} label="Refund payment">
      <div className="p-6">
        <h2 className="font-serif text-xl font-semibold">Refund {inr(payment.amount / 100)}?</h2>
        <p className="mt-1 text-sm text-muted">
          Receipt <b className="font-mono">{payment.receipt}</b> · {payment.payerName || formatPhone(payment.payerPhone)}.{' '}
          {payment.provider === 'RAZORPAY' ? 'The money goes back to the original payment method through Razorpay (5–7 working days).' : 'This is a test payment — no real money moves.'} Their membership period from this payment ends now.
        </p>
        <label className="mt-4 block">
          <span className="field-label">Reason *</span>
          <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Paid twice by mistake" maxLength={200} autoFocus />
        </label>
        <button className="btn mt-5 w-full bg-primary text-white hover:bg-primary-dark disabled:opacity-40" disabled={reason.trim().length < 3 || m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? <Spinner size={16} /> : 'Refund payment'}
        </button>
      </div>
    </Modal>
  );
}

export function AdminPayments() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [refund, setRefund] = useState(null);
  const [exporting, setExporting] = useState(false);
  const dq = useDebounce(q, 350);
  const params = { status: status || undefined, q: dq || undefined, from: from || undefined, to: to || undefined };
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'payments', params, page], queryFn: () => get('/admin/payments', { ...params, page, limit: 25 }) });
  const pages = data ? Math.ceil(data.total / data.limit) : 1;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await api.get('/admin/payments/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mi-vanjari-payments-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 py-6">
      <RevenueCards />

      <div className="card space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3">
            <Icon name="search" size={16} className="text-muted" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Receipt, name, mobile, order or payment ID…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="flex items-center gap-2 text-xs">
            <input type="date" className="field h-10 w-auto" value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} aria-label="From date" />
            <span className="text-muted">to</span>
            <input type="date" className="field h-10 w-auto" value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} aria-label="To date" />
          </div>
          <button className="btn btn-outline btn-sm h-10" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Spinner size={15} /> : <Icon name="download" size={15} />} Export CSV
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS.map(([v, l]) => (
            <button key={l} className={cn('chip', status === v && 'chip-on')} onClick={() => (setStatus(v), setPage(1))}>
              {l}
              {data?.summary.byStatus[v] != null && v && <span className="ml-1 text-muted">{data.summary.byStatus[v]}</span>}
            </button>
          ))}
          {data && (
            <span className="ml-auto text-xs text-muted">
              {data.total} transactions · <b className="text-leaf">{inr(data.summary.paidAmount)} paid</b> in this view
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : !data?.items.length ? (
        <EmptyState icon="rupee" title="No transactions yet">
          Payments appear here as soon as members start the ₹501 matrimony membership checkout.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-sand/60 text-left text-[11px] tracking-wider text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold">Receipt</th>
                <th className="px-4 py-2.5 font-semibold">Member</th>
                <th className="px-4 py-2.5 font-semibold">Amount</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Method</th>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Membership until</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-t border-line align-top">
                  <td className="px-4 py-2.5">
                    <b className="font-mono text-xs">{p.receipt}</b>
                    <span className="block font-mono text-[10px] text-muted" title="Gateway payment ID">
                      {p.paymentId || p.orderId}
                    </span>
                    {p.provider === 'DEV_TEST' && <Badge tone="gray" className="mt-1">TEST</Badge>}
                  </td>
                  <td className="px-4 py-2.5">
                    <b className="block">{p.payerName || '—'}</b>
                    <span className="text-xs text-muted tabular-nums">{formatPhone(p.payerPhone)}</span>
                    {!p.userId && <span className="block text-[10px] text-primary">account deleted</span>}
                  </td>
                  <td className="px-4 py-2.5 font-semibold tabular-nums">{inr(p.amount / 100)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={TONE[p.status]}>{p.status === 'CREATED' ? 'STARTED' : p.status}</Badge>
                    {p.failureReason && <span className="mt-1 block max-w-[180px] text-[10px] text-muted">{p.failureReason}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs uppercase">{p.method || '—'}</td>
                  <td className="px-4 py-2.5 text-xs">{fmt(p.paidAt || p.createdAt)}</td>
                  <td className="px-4 py-2.5 text-xs">{p.membership ? (p.membership.revokedAt ? <span className="text-primary">ended</span> : new Date(p.membership.expiresAt).toLocaleDateString('en-IN')) : '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {p.status === 'PAID' && (
                      <button className="btn btn-ghost btn-sm text-primary" onClick={() => setRefund(p)}>
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
      {refund && <RefundDialog payment={refund} onClose={() => setRefund(null)} />}
    </div>
  );
}
