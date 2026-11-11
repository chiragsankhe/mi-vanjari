import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, EmptyState, Icon, LoadMoreSentinel, PageHeader, Skeleton, Tabs, VerifiedDot } from '../../components/ui';
import { usePaged } from '../../hooks';
import { del, errorMessage, get, put } from '../../lib/api';
import { timeAgo } from '../../lib/utils';
import { useAuth } from '../../store/auth';

function RequestRow({ r, kind }) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['requests'] });
    get('/notifications/unread').then((u) => useAuth.getState().patchUnread(u));
  };
  const act = useMutation({
    mutationFn: (action) => (action === 'cancel' ? del(`/follow/${r.user.userId}`) : put(`/follow/${r.followId}/${action}`)),
    onSuccess: (_d, action) => {
      toast.success(action === 'accept' ? `You accepted ${r.user.fullName}` : action === 'decline' ? 'Request declined' : 'Request cancelled');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const u = r.user;
  return (
    <motion.li layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
      <Link to={`/profile/${u.userId}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar src={u.photoUrl} name={u.fullName} size={52} />
        <span className="min-w-0">
          <b className="flex items-center gap-1.5 text-sm">
            <span className="truncate">{u.fullName}</span> {u.isVerified && <VerifiedDot size={14} />}
          </b>
          <small className="block truncate text-xs text-muted">
            {[u.age ? `${u.age} yrs` : u.ageRange, u.currentCity, u.occupation].filter(Boolean).join(' · ')}
          </small>
          <small className="text-[11px] text-[#a99d92]">{timeAgo(r.createdAt)}</small>
        </span>
      </Link>
      {kind === 'received' ? (
        <div className="flex w-full gap-2 sm:w-auto">
          <button className="btn btn-primary btn-sm flex-1" disabled={act.isPending} onClick={() => act.mutate('accept')}>
            <Icon name="check" size={15} /> Accept
          </button>
          <button className="btn btn-outline btn-sm flex-1" disabled={act.isPending} onClick={() => act.mutate('decline')}>
            Decline
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" disabled={act.isPending} onClick={() => act.mutate('cancel')}>
          Cancel request
        </button>
      )}
    </motion.li>
  );
}

export default function Requests() {
  const [tab, setTab] = useState('received');
  const received = usePaged(['requests', 'received'], '/follow/requests');
  const sent = usePaged(['requests', 'sent'], '/follow/requests/sent');
  const cur = tab === 'received' ? received : sent;

  return (
    <>
      <PageHeader eyebrow="Connections" title="फॉलो विनंत्या" subtitle="Accept requests from people you’d like to connect with. Accepted followers can view your full profile and message you." icon="users" />
      <div className="container-page max-w-3xl py-8">
        <Tabs
          id="req"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'received', label: 'Received', count: received.total },
            { value: 'sent', label: 'Sent' },
          ]}
        />
        <div className="card mt-5 overflow-hidden">
          {cur.isLoading ? (
            <div className="space-y-4 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : cur.items.length === 0 ? (
            <EmptyState icon={tab === 'received' ? 'users' : 'send'} title={tab === 'received' ? 'No pending requests' : 'No requests sent'} action={<Link to="/matrimonial" className="btn btn-primary">Explore profiles</Link>}>
              {tab === 'received' ? 'When someone wants to follow you, it will appear here.' : 'Private profiles you request to follow will appear here.'}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {cur.items.map((r) => (
                  <RequestRow key={r.followId} r={r} kind={tab} />
                ))}
              </AnimatePresence>
            </ul>
          )}
          <LoadMoreSentinel onVisible={cur.fetchNextPage} hasMore={cur.hasNextPage} loading={cur.isFetchingNextPage} />
        </div>
      </div>
    </>
  );
}
