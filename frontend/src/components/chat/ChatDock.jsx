import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { get } from '../../lib/api';
import { cn, timeAgo } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { Avatar, Icon, Spinner } from '../ui';

const HIDDEN_ON = ['/messages', '/onboarding', '/admin'];

/**
 * Floating chat button on every page (desktop / tablet — phones have Messages in the bottom bar).
 * Shows unread count; opens a panel with recent chats (matrimony and business / service enquiries).
 */
export function ChatDock() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hidden = status !== 'authed' || !user?.profile || HIDDEN_ON.some((p) => location.pathname.startsWith(p));
  const { data = [], isLoading } = useQuery({ queryKey: ['conversations'], queryFn: () => get('/chat/conversations'), enabled: open && !hidden, refetchInterval: open ? 30_000 : false });
  const unread = user?.unread?.messages || 0;

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (hidden) return null;

  return (
    <div ref={ref} className="fixed right-5 bottom-5 z-[70] hidden md:block">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 bottom-[72px] w-[340px] origin-bottom-right overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_rgba(40,20,10,0.22)]"
            role="dialog"
            aria-label="Recent chats"
          >
            <div className="flex items-center justify-between border-b border-line bg-[linear-gradient(110deg,#fff7ee,#fdeee3)] px-4 py-3">
              <b className="flex items-center gap-2 text-sm">
                <Icon name="chat" size={16} className="text-primary" /> Chats
              </b>
              <Link to="/messages" className="text-xs font-semibold text-primary hover:underline">
                Open all →
              </Link>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {isLoading ? (
                <div className="grid h-28 place-items-center text-primary">
                  <Spinner />
                </div>
              ) : data.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted">
                  <p>No chats yet.</p>
                  <p className="mt-1 text-xs">Tap “Chat” on any business, wedding service or connected member to start one.</p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {data.slice(0, 8).map((c) => (
                    <li key={c.id}>
                      <Link to={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-sand/60">
                        <span className="relative shrink-0">
                          <Avatar src={c.partner.profilePhotoUrl} name={c.partner.fullName} size={40} />
                          {c.partner.online && <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-leaf ring-2 ring-white" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <b className="truncate text-[13px]">{c.partner.fullName}</b>
                            <small className="shrink-0 text-[10px] text-muted">{timeAgo(c.lastMessageAt)}</small>
                          </span>
                          {c.context && (
                            <span className="flex items-center gap-1 truncate text-[10px] font-semibold text-[#8c6100]">
                              <Icon name={c.context.type === 'BUSINESS' ? 'briefcase' : 'tent'} size={10} /> {c.context.title}
                            </span>
                          )}
                          <span className="flex items-center gap-2">
                            <small className={cn('flex-1 truncate text-xs', c.unread ? 'font-semibold text-ink' : 'text-muted')}>
                              {c.lastMessage?.senderId === user.id && 'You: '}
                              {c.lastMessage?.content}
                            </small>
                            {c.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{c.unread}</span>}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="relative grid size-14 place-items-center rounded-full bg-primary text-white shadow-[0_12px_30px_rgba(200,65,26,0.45)]"
        aria-label={open ? 'Close chats' : `Open chats${unread ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
      >
        <Icon name={open ? 'close' : 'chat'} size={24} />
        {unread > 0 && !open && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 grid min-w-6 place-items-center rounded-full bg-gold px-1.5 py-0.5 text-[11px] font-bold text-ink ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </motion.span>
        )}
      </motion.button>
    </div>
  );
}
