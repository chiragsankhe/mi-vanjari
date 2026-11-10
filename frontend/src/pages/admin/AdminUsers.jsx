import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, Badge, EmptyState, Icon, Modal, Skeleton, Spinner } from '../../components/ui';
import { useDebounce } from '../../hooks';
import { del, errorMessage, get, post, put } from '../../lib/api';
import { cn, formatPhone, timeAgo } from '../../lib/utils';
import { useAuth } from '../../store/auth';

const FILTERS = [
  ['all', 'All'],
  ['matrimony', 'Matrimony'],
  ['members', 'Paid members'],
  ['staff', 'Admins & mods'],
  ['banned', 'Banned'],
  ['noprofile', 'No profile'],
];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function useAdminAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fn }) => fn(),
    onSuccess: (_r, { msg }) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      if (msg) toast.success(msg);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Delete with a typed confirmation — this cannot be undone. */
function DeleteDialog({ user, onClose }) {
  const [typed, setTyped] = useState('');
  const act = useAdminAction();
  const name = user.profile?.fullName || formatPhone(user.phone) || user.email;
  return (
    <Modal open onClose={onClose} label="Delete account">
      <div className="p-6">
        <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon name="trash" size={22} />
        </span>
        <h2 className="mt-3 font-serif text-xl font-semibold">Delete {name}?</h2>
        <p className="mt-2 text-sm text-muted">
          This permanently deletes the account, profile, photos, chats, posts, listings and follow connections. <b className="text-ink">It cannot be undone.</b> Payment records are kept for accounts (without the account link).
        </p>
        <label className="mt-4 block">
          <span className="field-label">
            Type <b>DELETE</b> to confirm
          </span>
          <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </label>
        <div className="mt-5 flex gap-2">
          <button
            className="btn flex-1 bg-primary text-white hover:bg-primary-dark disabled:opacity-40"
            disabled={typed !== 'DELETE' || act.isPending}
            onClick={() => act.mutate({ fn: () => del(`/admin/users/${user.id}`), msg: `${name} deleted` }, { onSuccess: onClose })}
          >
            {act.isPending ? <Spinner size={16} /> : 'Delete permanently'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function GrantDialog({ user, onClose }) {
  const [days, setDays] = useState(365);
  const [note, setNote] = useState('');
  const act = useAdminAction();
  return (
    <Modal open onClose={onClose} label="Grant membership">
      <div className="p-6">
        <h2 className="font-serif text-xl font-semibold">Grant matrimony membership</h2>
        <p className="mt-1 text-sm text-muted">For cash payments at the samaj hall, sponsorships or support cases. It is added after any current period.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[30, 90, 180, 365].map((d) => (
            <button key={d} className={cn('chip', days === d && 'chip-on')} onClick={() => setDays(d)}>
              {d === 365 ? '1 year' : `${d} days`}
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="field-label">Days</span>
          <input type="number" min={1} max={3650} className="field" value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </label>
        <label className="mt-3 block">
          <span className="field-label">Note (shown in the audit log)</span>
          <input className="field" placeholder="e.g. Paid ₹501 cash, receipt #12" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </label>
        <button
          className="btn btn-primary mt-5 w-full"
          disabled={act.isPending || !days}
          onClick={() => act.mutate({ fn: () => post(`/admin/users/${user.id}/membership`, { days, note: note || undefined }), msg: 'Membership granted' }, { onSuccess: onClose })}
        >
          {act.isPending ? <Spinner size={16} /> : `Grant ${days} days`}
        </button>
      </div>
    </Modal>
  );
}

/** Admins and moderators sign in to the admin panel with this email (code + admin password). */
function AdminEmailEditor({ user }) {
  const [email, setEmail] = useState(user.email || '');
  const act = useAdminAction();
  const changed = email.trim().toLowerCase() !== (user.email || '');
  return (
    <div className="mt-5 rounded-lg border border-line bg-sand/40 p-3">
      <span className="field-label">Admin-login email</span>
      <div className="flex gap-2">
        <input type="email" className="field" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
        <button
          className="btn btn-outline btn-sm shrink-0"
          disabled={!changed || act.isPending}
          onClick={() => act.mutate({ fn: () => put(`/admin/users/${user.id}`, { email: email.trim() }), msg: email.trim() ? 'Admin email saved' : 'Admin email removed' })}
        >
          Save
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {user.role === 'MODERATOR' ? 'This moderator' : 'This admin'} signs in at <b>/admin/login</b> with this email: a code is emailed to it, then their admin password.
      </p>
    </div>
  );
}

function UserDetail({ id, onClose, onDelete, onGrant }) {
  const { data: u, isLoading } = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => get(`/admin/users/${id}`) });
  const act = useAdminAction();
  const me = useAuth((s) => s.user);
  return (
    <Modal open onClose={onClose} className="sm:w-[min(720px,100%)]" label="Member details">
      <div className="p-6">
        {isLoading || !u ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <div className="flex items-center gap-4 pr-8">
              <Avatar src={u.profile?.profilePhotoUrl} name={u.profile?.fullName || '?'} size={56} />
              <div className="min-w-0">
                <h2 className="truncate font-serif text-xl font-semibold">{u.profile?.fullName || 'No profile yet'}</h2>
                <p className="text-sm text-muted">
                  {[formatPhone(u.phone), u.email].filter(Boolean).join(' · ')} · joined {fmtDate(u.createdAt)} · active {u.lastActiveAt ? timeAgo(u.lastActiveAt) : 'never'}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone={u.role === 'USER' ? 'gold' : 'red'}>{u.role}</Badge>
                  {u.isBanned && <Badge tone="red">Banned</Badge>}
                  {u.profile?.isVerified && <Badge tone="green">Verified</Badge>}
                  {u.profile?.isMatrimonial && <Badge>Matrimony</Badge>}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2 text-center text-xs">
              {[
                ['Posts', u._count.posts],
                ['Messages', u._count.sentMessages],
                ['Following', u._count.sentFollows],
                ['Followers', u._count.receivedFollows],
                ['Reports filed', u._count.reportsFiled],
              ].map(([l, n]) => (
                <div key={l} className="rounded-lg bg-sand/70 p-2">
                  <b className="block font-serif text-lg">{n}</b>
                  {l}
                </div>
              ))}
            </div>

            {u.role !== 'USER' && me.role === 'ADMIN' && <AdminEmailEditor user={u} />}

            <h3 className="mt-6 mb-2 text-sm font-semibold">Membership periods</h3>
            {u.memberships.length ? (
              <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                {u.memberships.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span>
                      {fmtDate(m.startsAt)} → {fmtDate(m.expiresAt)}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs">
                      <Badge tone={m.source === 'PAYMENT' ? 'green' : 'gold'}>{m.source === 'PAYMENT' ? 'Paid' : 'Granted'}</Badge>
                      {m.revokedAt ? <Badge tone="red">Revoked</Badge> : new Date(m.expiresAt) < new Date() ? <span className="text-muted">expired</span> : null}
                    </span>
                    {m.note && <span className="w-full text-[11px] text-muted">{m.note}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No membership yet.</p>
            )}

            <h3 className="mt-5 mb-2 text-sm font-semibold">Payments</h3>
            {u.payments.length ? (
              <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                {u.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="font-mono text-xs">{p.receipt}</span>
                    <span>₹{p.amount / 100}</span>
                    <Badge tone={p.status === 'PAID' ? 'green' : p.status === 'REFUNDED' || p.status === 'FAILED' ? 'red' : 'gold'}>{p.status}</Badge>
                    <span className="text-xs text-muted">{fmtDate(p.paidAt || p.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No payments.</p>
            )}

            <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
              {u.profile && (
                <Link to={`/profile/${u.id}`} className="btn btn-outline btn-sm">
                  <Icon name="eye" size={15} /> View profile
                </Link>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => onGrant(u)}>
                <Icon name="plus" size={15} /> Grant membership
              </button>
              {u.memberships.some((m) => !m.revokedAt && new Date(m.expiresAt) > new Date()) && (
                <button className="btn btn-outline btn-sm" onClick={() => act.mutate({ fn: () => del(`/admin/users/${u.id}/membership`), msg: 'Membership revoked' })}>
                  Revoke membership
                </button>
              )}
              {u.role !== 'USER' && u.hasAdminPassword && (
                <button className="btn btn-outline btn-sm" onClick={() => act.mutate({ fn: () => post(`/admin/users/${u.id}/reset-admin-password`), msg: 'Admin password reset — they will create a new one at next admin login' })}>
                  <Icon name="lock" size={15} /> Reset admin password
                </button>
              )}
              {u.id !== me.id && (
                <button className="btn btn-sm ml-auto bg-primary text-white hover:bg-primary-dark" onClick={() => onDelete(u)}>
                  <Icon name="trash" size={15} /> Delete account
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export function AdminUsers() {
  const me = useAuth((s) => s.user);
  const isAdmin = me.role === 'ADMIN';
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [toGrant, setToGrant] = useState(null);
  const dq = useDebounce(q, 350);
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'users', dq, filter, page], queryFn: () => get('/admin/users', { q: dq || undefined, filter, page, limit: 25 }) });
  const act = useAdminAction();

  return (
    <div className="space-y-4 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 md:w-80">
          <Icon name="search" size={16} className="text-muted" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search name or mobile…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map(([v, l]) => (
            <button
              key={v}
              className={cn('chip shrink-0', filter === v && 'chip-on')}
              onClick={() => {
                setFilter(v);
                setPage(1);
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">{data ? `${data.total} accounts` : ' '}</p>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : !data?.items.length ? (
        <EmptyState icon="users" title="No accounts found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-sand/60 text-left text-[11px] tracking-wider text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold">Member</th>
                <th className="px-4 py-2.5 font-semibold">Mobile</th>
                <th className="px-4 py-2.5 font-semibold">Role</th>
                <th className="px-4 py-2.5 font-semibold">Membership</th>
                <th className="px-4 py-2.5 font-semibold">Last active</th>
                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className={cn('border-t border-line', u.isBanned && 'bg-primary-soft/40')}>
                  <td className="px-4 py-2.5">
                    <button className="flex items-center gap-2.5 text-left hover:text-primary" onClick={() => setOpenId(u.id)}>
                      <Avatar src={u.profile?.profilePhotoUrl} name={u.profile?.fullName || '?'} size={34} />
                      <span>
                        <b className="block">{u.profile?.fullName || <span className="font-normal text-muted italic">No profile</span>}</b>
                        <span className="text-[11px] text-muted">
                          {u.profile?.currentCity}
                          {u.profile?.isMatrimonial && ' · Matrimony'}
                          {u.profile?.isVerified && ' · ✓ Verified'}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatPhone(u.phone) || <span className="text-muted">—</span>}
                    {u.email && <span className="block text-[11px] text-muted">✉ {u.email}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {isAdmin && u.id !== me.id ? (
                      <select className="rounded-md border border-line bg-white px-2 py-1 text-xs" value={u.role} onChange={(e) => act.mutate({ fn: () => put(`/admin/users/${u.id}`, { role: e.target.value }), msg: 'Role updated' })}>
                        <option value="USER">Member</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    ) : (
                      <Badge tone={u.role === 'USER' ? 'gold' : 'red'}>{u.role}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {u.membership ? (
                      <span className="text-leaf">
                        ✓ until {fmtDate(u.membership.expiresAt)}
                        {u.membership.source === 'ADMIN_GRANT' && <span className="text-muted"> (granted)</span>}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">{u.lastActiveAt ? timeAgo(u.lastActiveAt) : 'never'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(u.id)} title="Details">
                        <Icon name="eye" size={15} />
                      </button>
                      {isAdmin && u.profile && (
                        <button className="btn btn-ghost btn-sm" title={u.profile.isVerified ? 'Remove verified badge' : 'Verify'} onClick={() => act.mutate({ fn: () => put(`/admin/users/${u.id}`, { isVerified: !u.profile.isVerified }), msg: u.profile.isVerified ? 'Verification removed' : 'Verified' })}>
                          <Icon name="check" size={15} className={u.profile.isVerified ? 'text-leaf' : ''} />
                        </button>
                      )}
                      {isAdmin && u.id !== me.id && (
                        <>
                          <button className="btn btn-ghost btn-sm" title={u.isBanned ? 'Unban' : 'Ban'} onClick={() => act.mutate({ fn: () => put(`/admin/users/${u.id}`, { isBanned: !u.isBanned }), msg: u.isBanned ? 'Unbanned' : 'Banned' })}>
                            <Icon name="ban" size={15} className={u.isBanned ? 'text-primary' : ''} />
                          </button>
                          <button className="btn btn-ghost btn-sm text-primary" title="Delete account" onClick={() => setToDelete(u)}>
                            <Icon name="trash" size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && Math.ceil(data.total / data.limit) > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(data.total / data.limit)}
          </span>
          <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(data.total / data.limit)} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}

      {openId && <UserDetail id={openId} onClose={() => setOpenId(null)} onDelete={(u) => (setOpenId(null), setToDelete(u))} onGrant={(u) => setToGrant(u)} />}
      {toDelete && <DeleteDialog user={toDelete} onClose={() => setToDelete(null)} />}
      {toGrant && <GrantDialog user={toGrant} onClose={() => setToGrant(null)} />}
    </div>
  );
}
