import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge, CountUp, EmptyState, Field, Icon, PageHeader, Segment, Skeleton, Spinner, Tabs } from '../../components/ui';
import { del, errorMessage, get, post, put } from '../../lib/api';
import { formatINR, formatPhone, timeAgo } from '../../lib/utils';
import { MediaPicker } from '../../components/history/MediaPicker';
import { useAuth } from '../../store/auth';
import { AdminPayments, RevenueCards } from './AdminPayments';
import { AdminSecurity } from './AdminSecurity';
import { AdminSettings } from './AdminSettings';
import { AdminUsers } from './AdminUsers';

const useAct = (fn, keys, msg) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      if (msg) toast.success(msg);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
};

function Overview() {
  const { data } = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => get('/admin/stats') });
  const tiles = [
    ['users', 'Users', data?.users],
    ['user', 'Profiles', data?.profiles],
    ['heart', 'Matrimonial', data?.matrimonial],
    ['users', 'Connections', data?.follows],
    ['chat', 'Messages', data?.messages],
    ['image', 'Posts', data?.posts],
    ['briefcase', 'Businesses', data?.businesses],
    ['plus', 'New this week', data?.newThisWeek],
  ];
  const queue = [
    ['Services awaiting approval', data?.pendingServices, 'services'],
    ['Achievements to verify', data?.pendingAchievements, 'achievements'],
    ['Open reports', data?.openReports, 'reports'],
  ];
  return (
    <div className="space-y-6 py-6">
      <RevenueCards />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([icon, label, n], i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card p-4">
            <Icon name={icon} size={18} className="text-primary" />
            <b className="mt-2 block font-serif text-2xl">{n == null ? '–' : <CountUp to={n} duration={0.8} />}</b>
            <small className="text-xs text-muted">{label}</small>
          </motion.div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {queue.map(([label, n, tab]) => (
          <Link key={tab} to={`/admin?tab=${tab}`} className="card card-hover flex items-center justify-between p-5">
            <span className="text-sm">{label}</span>
            <Badge tone={n ? 'red' : 'green'}>{n ?? '–'}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ServicesQueue() {
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'services', status], queryFn: () => get('/admin/services', { status }) });
  const act = useAct(({ id, body }) => put(`/admin/services/${id}`, body), [['admin']], 'Updated');
  return (
    <div className="space-y-4 py-6">
      <Segment id="svc" className="max-w-sm" value={status} onChange={setStatus} options={['PENDING', 'APPROVED', 'REJECTED'].map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() }))} />
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data?.items.length ? (
        <EmptyState icon="check" title="Nothing here" />
      ) : (
        data.items.map((s) => (
          <div key={s.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Link to={`/services/provider/${s.id}`} className="font-semibold hover:text-primary">
                {s.businessName}
              </Link>
              <p className="text-xs text-muted">
                {s.category.name} · {s.location} · {s.priceFrom ? `from ${formatINR(s.priceFrom)}` : 'no price'} · by {s.user.profile?.fullName || formatPhone(s.user.phone)} · {timeAgo(s.createdAt)}
              </p>
              {s.description && <p className="mt-1 line-clamp-2 text-xs text-[#5b534d]">{s.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {s.status !== 'APPROVED' && (
                <button className="btn btn-primary btn-sm" onClick={() => act.mutate({ id: s.id, body: { status: 'APPROVED' } })}>
                  Approve
                </button>
              )}
              {s.status !== 'REJECTED' && (
                <button className="btn btn-outline btn-sm" onClick={() => act.mutate({ id: s.id, body: { status: 'REJECTED' } })}>
                  Reject
                </button>
              )}
              {s.status === 'APPROVED' && (
                <button className="btn btn-soft btn-sm" onClick={() => act.mutate({ id: s.id, body: { isFeatured: !s.isFeatured } })}>
                  <Icon name="star" size={14} filled={s.isFeatured} /> {s.isFeatured ? 'Unfeature' : 'Feature'}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AchievementsQueue() {
  const { data = [], isLoading } = useQuery({ queryKey: ['admin', 'achievements'], queryFn: () => get('/admin/achievements', { verified: 'false' }) });
  const verify = useAct((id) => put(`/admin/achievements/${id}`, { isVerified: true }), [['admin']], 'Published');
  const remove = useAct((id) => del(`/admin/achievements/${id}`), [['admin']], 'Removed');
  if (isLoading) return <Skeleton className="mt-6 h-40" />;
  if (!data.length) return <EmptyState icon="check" title="No nominations to review" />;
  return (
    <div className="space-y-3 py-6">
      {data.map((a) => (
        <div key={a.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
          {a.photoUrl && <img src={a.photoUrl} alt="" className="size-14 rounded-lg object-cover" />}
          <div className="flex-1">
            <b>{a.name}</b> <Badge tone="gray">{a.type}</Badge>
            <p className="text-xs text-muted">
              {a.type === 'ACADEMIC' ? `${a.grade} · ${a.percentage ?? '–'}% · ${a.schoolName} · ${a.year ?? ''}` : `${a.role} · ${a.company} · ${a.city ?? ''}`} — submitted by {a.user.profile?.fullName || formatPhone(a.user.phone)}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => verify.mutate(a.id)}>
              Verify & publish
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => remove.mutate(a.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Reports() {
  const [status, setStatus] = useState('OPEN');
  const { data = [], isLoading } = useQuery({ queryKey: ['admin', 'reports', status], queryFn: () => get('/admin/reports', { status }) });
  const act = useAct(({ id, status: s }) => put(`/admin/reports/${id}`, { status: s }), [['admin']], 'Report updated');
  const link = (r) => ({ USER: `/profile/${r.targetId}`, BUSINESS: `/business/${r.targetId}`, SERVICE: `/services/provider/${r.targetId}` })[r.targetType];
  return (
    <div className="space-y-4 py-6">
      <Segment id="rep" className="max-w-sm" value={status} onChange={setStatus} options={['OPEN', 'REVIEWED', 'DISMISSED'].map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() }))} />
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data.length ? (
        <EmptyState icon="shield" title="No reports" />
      ) : (
        data.map((r) => (
          <div key={r.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="flex-1">
              <b>{r.reason}</b> <Badge tone="gray">{r.targetType}</Badge>
              {r.details && <p className="mt-1 text-sm text-[#5b534d]">{r.details}</p>}
              <p className="mt-1 text-xs text-muted">
                by {r.reporter.profile?.fullName || 'member'} · {timeAgo(r.createdAt)} {link(r) && <Link to={link(r)} className="text-primary hover:underline">· view target</Link>}
              </p>
            </div>
            {status === 'OPEN' && (
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => act.mutate({ id: r.id, status: 'REVIEWED' })}>
                  Mark reviewed
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => act.mutate({ id: r.id, status: 'DISMISSED' })}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function HistoryAdmin() {
  const { data = [], isLoading } = useQuery({ queryKey: ['admin', 'history'], queryFn: () => get('/admin/history') });
  const empty = { era: '', yearRange: '', title: '', titleEn: '', content: '', sortOrder: data.length + 1 };
  const [editing, setEditing] = useState(null);
  const save = useAct((v) => (v.id ? put(`/admin/history/${v.id}`, strip(v)) : post('/admin/history', strip(v))), [['admin', 'history'], ['history']], 'Saved');
  const remove = useAct((id) => del(`/admin/history/${id}`), [['admin', 'history'], ['history']], 'Deleted');
  const strip = ({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => ({ ...rest, sortOrder: Number(rest.sortOrder) || 0 });
  const set = (k) => (e) => setEditing((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-3 py-6">
      <button className="btn btn-primary btn-sm" onClick={() => setEditing(empty)}>
        <Icon name="plus" size={15} /> New entry
      </button>
      {editing && (
        <form
          className="card grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(editing, { onSuccess: () => setEditing(null) });
          }}
        >
          <Field label="Era label" placeholder="ORIGIN & ROOTS" value={editing.era} onChange={set('era')} required />
          <Field label="Year range" placeholder="18th century" value={editing.yearRange} onChange={set('yearRange')} required />
          <Field label="Title (Marathi)" value={editing.title} onChange={set('title')} required />
          <Field label="Title (English)" value={editing.titleEn || ''} onChange={set('titleEn')} />
          <Field as="textarea" label="Content" value={editing.content} onChange={set('content')} required className="sm:col-span-2" />
          <Field label="Order" type="number" value={editing.sortOrder} onChange={set('sortOrder')} />
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <MediaPicker kind="image" value={editing.imageUrl || ''} onChange={(url) => setEditing((s) => ({ ...s, imageUrl: url }))} />
            <MediaPicker kind="video" value={editing.videoUrl || ''} onChange={(url) => setEditing((s) => ({ ...s, videoUrl: url }))} />
          </div>
          <p className="text-[11px] text-muted sm:col-span-2">Tip: AI image/video prompts for every chapter of our history are in <code>docs/history-ai-prompts.md</code>. When a video is set, the image is used as its cover.</p>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn btn-primary btn-sm" disabled={save.isPending}>
              {save.isPending ? <Spinner size={14} /> : 'Save'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        data.map((h) => (
          <div key={h.id} className="card flex items-center gap-3 p-4">
            <span className="font-serif text-primary italic">{h.sortOrder}</span>
            <div className="flex-1">
              <b className="heading-deva">{h.title}</b> <span className="text-xs text-muted">· {h.era} · {h.yearRange}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(h)} aria-label="Edit">
              <Icon name="edit" size={15} />
            </button>
            <button className="btn btn-ghost btn-sm text-primary" onClick={() => remove.mutate(h.id)} aria-label="Delete">
              <Icon name="trash" size={15} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function MuhuratAdmin() {
  const year = new Date().getFullYear();
  const { data = [] } = useQuery({ queryKey: ['admin', 'muhurat', year], queryFn: async () => [...(await get('/astrology/muhurat', { year })), ...(await get('/astrology/muhurat', { year: year + 1 }))] });
  const [v, setV] = useState({ date: '', type: 'VIVAH', title: 'Vivah muhurat · विवाह मुहूर्त' });
  const add = useAct(() => post('/admin/muhurat', v), [['admin', 'muhurat'], ['muhurat']], 'Date added');
  const remove = useAct((id) => del(`/admin/muhurat/${id}`), [['admin', 'muhurat'], ['muhurat']], 'Removed');
  return (
    <div className="space-y-4 py-6">
      <form
        className="card grid items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_2fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <Field label="Date" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} required />
        <Field as="select" label="Type" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
          <option value="VIVAH">Vivah</option>
          <option value="SAKHARPUDA">Sakharpuda</option>
          <option value="GRIHA_PRAVESH">Griha pravesh</option>
        </Field>
        <Field label="Title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} required />
        <button className="btn btn-primary" disabled={add.isPending}>
          Add
        </button>
      </form>
      <div className="card divide-y divide-line">
        {data.map((d) => (
          <div key={d.id} className="flex items-center gap-3 p-3 text-sm">
            <b className="w-28">{d.date}</b>
            <Badge tone="gray">{d.type}</Badge>
            <span className="flex-1">{d.title}</span>
            <button className="text-primary" onClick={() => remove.mutate(d.id)} aria-label="Remove">
              <Icon name="trash" size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const role = useAuth((s) => s.user.role);
  const navigate = useNavigate();
  const signOut = async () => {
    await post('/auth/logout').catch(() => {});
    useAuth.getState().clear();
    navigate('/admin/login', { replace: true });
  };
  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'services', label: 'Services' },
    { value: 'achievements', label: 'Achievers' },
    { value: 'reports', label: 'Reports' },
    { value: 'users', label: 'Members' },
    ...(role === 'ADMIN'
      ? [
          { value: 'payments', label: '₹ Payments' },
          { value: 'history', label: 'History' },
          { value: 'muhurat', label: 'Muhurat' },
          { value: 'settings', label: 'Settings' },
          { value: 'security', label: '🛡 Security' },
        ]
      : []),
  ];
  return (
    <>
      <PageHeader eyebrow="Admin" title="व्यवस्थापन" subtitle="Members, payments, listings, reports and community content — all in one place." icon="shield">
        <button className="btn btn-outline btn-sm" onClick={signOut}>
          <Icon name="logout" size={15} /> Sign out of admin
        </button>
      </PageHeader>
      <div className="container-page pb-16">
        <Tabs id="admin" className="mt-4" value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} tabs={tabs} />
        {tab === 'overview' && <Overview />}
        {tab === 'services' && <ServicesQueue />}
        {tab === 'achievements' && <AchievementsQueue />}
        {tab === 'reports' && <Reports />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'payments' && <AdminPayments />}
        {tab === 'settings' && <AdminSettings />}
        {tab === 'security' && <AdminSecurity />}
        {tab === 'history' && <HistoryAdmin />}
        {tab === 'muhurat' && <MuhuratAdmin />}
      </div>
    </>
  );
}
