import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, EmptyState, Icon, LoadMoreSentinel, PageHeader, Skeleton } from '../../components/ui';
import { usePaged } from '../../hooks';
import { put } from '../../lib/api';
import { cn, timeAgo } from '../../lib/utils';
import { useAuth } from '../../store/auth';

const ICONS = {
  FOLLOW_REQUEST: ['users', 'bg-primary-soft text-primary'],
  FOLLOW_ACCEPTED: ['check', 'bg-leaf-soft text-leaf'],
  MESSAGE: ['chat', 'bg-[#e4eff4] text-[#315c75]'],
  LISTING_APPROVED: ['tent', 'bg-leaf-soft text-leaf'],
  LISTING_REJECTED: ['info', 'bg-primary-soft text-primary'],
  ACHIEVEMENT_VERIFIED: ['star', 'bg-gold-soft text-[#9c7000]'],
  POST_LIKED: ['heart', 'bg-primary-soft text-primary'],
  SYSTEM: ['bell', 'bg-sand text-muted'],
};

export default function Notifications() {
  const qc = useQueryClient();
  const unread = useAuth((s) => s.user?.unread);
  const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaged(['notifications'], '/notifications', { limit: 20 });
  const readAll = useMutation({
    mutationFn: () => put('/notifications/read-all'),
    onSuccess: () => {
      useAuth.getState().patchUnread({ notifications: 0 });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark as read shortly after viewing
  useEffect(() => {
    if (!unread?.notifications) return;
    const t = setTimeout(() => readAll.mutate(), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread?.notifications]);

  return (
    <>
      <PageHeader eyebrow="Alerts" title="सूचना" subtitle="Follow requests, messages and updates from your community." icon="bell">
        {unread?.requests > 0 && (
          <Link to="/requests" className="btn btn-primary btn-sm">
            {unread.requests} pending request{unread.requests > 1 ? 's' : ''} <Icon name="arrow" size={15} />
          </Link>
        )}
        <button className="btn btn-outline btn-sm" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
          <Icon name="check-double" size={15} /> Mark all read
        </button>
      </PageHeader>
      <div className="container-page max-w-3xl py-8">
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="space-y-4 p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon="bell" title="You’re all caught up">
              New follow requests, messages and approvals will appear here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((n, i) => {
                const [icon, tone] = ICONS[n.type] || ICONS.SYSTEM;
                const Inner = (
                  <>
                    <span className="relative">
                      {n.from ? <Avatar src={n.from.photoUrl} name={n.from.fullName} size={44} /> : <span className={cn('grid size-11 place-items-center rounded-full', tone)}><Icon name={icon} size={20} /></span>}
                      {n.from && (
                        <span className={cn('absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full ring-2 ring-white', tone)}>
                          <Icon name={icon} size={11} />
                        </span>
                      )}
                    </span>
                    <span className="flex-1">
                      <span className={cn('block text-sm', !n.isRead && 'font-semibold')}>{n.content}</span>
                      <small className="text-xs text-muted">{timeAgo(n.createdAt)}</small>
                    </span>
                    {!n.isRead && <span className="size-2.5 rounded-full bg-primary" />}
                  </>
                );
                return (
                  <motion.li key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                    {n.link ? (
                      <Link to={n.link} className={cn('flex items-center gap-4 p-4 transition hover:bg-[#fffaf5]', !n.isRead && 'bg-[#fff8f2]')}>
                        {Inner}
                      </Link>
                    ) : (
                      <div className={cn('flex items-center gap-4 p-4', !n.isRead && 'bg-[#fff8f2]')}>{Inner}</div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
          <LoadMoreSentinel onVisible={fetchNextPage} hasMore={hasNextPage} loading={isFetchingNextPage} />
        </div>
      </div>
    </>
  );
}
