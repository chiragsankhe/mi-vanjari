import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, EmptyState, Icon, Segment, Skeleton } from '../../components/ui';
import { get } from '../../lib/api';

const LABEL = {
  ADMIN_ACCESS_DENIED: ['Blocked: member tried to open admin panel', 'red'],
  ADMIN_LOGIN_DENIED: ['Blocked: non-admin number at admin login', 'red'],
  ADMIN_LOGIN_FAILED: ['Failed admin login', 'red'],
  ADMIN_LOGIN: ['Admin signed in', 'green'],
  ADMIN_PASSWORD_CREATED: ['Admin password created', 'blue'],
  ADMIN_PASSWORD_RESET: ['Admin password reset', 'gold'],
  USER_DELETED: ['Account deleted', 'red'],
  USER_UPDATED: ['Account updated', 'gold'],
  MEMBERSHIP_GRANTED: ['Membership granted', 'green'],
  MEMBERSHIP_REVOKED: ['Membership revoked', 'gold'],
  PAYMENT_REFUNDED: ['Payment refunded', 'blue'],
  PAYMENTS_EXPORTED: ['Payments exported', 'gray'],
  SETTINGS_UPDATED: ['Settings changed', 'gold'],
};
const describe = (a) => LABEL[a] || [a.replace(/^ADMIN_/, 'Admin ').replace(/_/g, ' ').toLowerCase(), 'gray'];

function details(d) {
  if (!d) return null;
  const { path, method, body, after, ...rest } = d;
  delete rest.before;
  const parts = [];
  if (method || path) parts.push(`${method || ''} ${path || ''}`.trim());
  for (const [k, v] of Object.entries(rest)) if (v != null && v !== '') parts.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  if (after) parts.push(`now: ₹${after.matrimonyFee} / ${after.membershipDays} days from ${after.matrimonyPaidFrom}`);
  if (body && Object.keys(body).length) parts.push(JSON.stringify(body));
  return parts.join(' · ');
}

export function AdminSecurity() {
  const [type, setType] = useState('security');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'audit', type, page], queryFn: () => get('/admin/audit', { type: type === 'security' ? 'security' : undefined, page, limit: 40 }) });
  const pages = data ? Math.ceil(data.total / data.limit) : 1;
  return (
    <div className="space-y-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segment
          id="audit"
          className="sm:w-96"
          value={type}
          onChange={(v) => (setType(v), setPage(1))}
          options={[
            { value: 'security', label: '🛡 Security events' },
            { value: 'all', label: 'All admin activity' },
          ]}
        />
        <p className="text-xs text-muted">Every admin change and every blocked attempt is recorded with time and IP address.</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-72" />
      ) : !data?.items.length ? (
        <EmptyState icon="shield" title="Nothing recorded yet" />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {data.items.map((e) => {
            const [label, tone] = describe(e.action);
            return (
              <li key={e.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                <span className="w-40 shrink-0 text-xs text-muted tabular-nums">{new Date(e.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <div className="min-w-0 flex-1">
                  <Badge tone={tone}>{label}</Badge>
                  <p className="mt-1 text-sm">
                    <Icon name="user" size={13} className="mr-1 inline text-muted" />
                    {e.actorName || e.actorPhone || 'Unknown visitor'}
                    {e.actorName && e.actorPhone && <span className="text-muted"> · {e.actorPhone}</span>}
                    {e.ip && <span className="text-muted"> · IP {e.ip}</span>}
                  </p>
                  {details(e.details) && <p className="mt-0.5 truncate font-mono text-[11px] text-muted" title={details(e.details)}>{details(e.details)}</p>}
                </div>
              </li>
            );
          })}
        </ul>
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
    </div>
  );
}
