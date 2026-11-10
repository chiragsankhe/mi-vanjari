import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, EmptyState, Icon, Skeleton, Spinner, VerifiedDot } from '../../components/ui';
import { useScreenshotGuard } from '../../hooks';
import { errorMessage, get, post, put } from '../../lib/api';
import { emitAck, getSocket } from '../../lib/socket';
import { cn, dayLabel, lastActive, timeAgo, timeOfDay } from '../../lib/utils';
import { useAuth } from '../../store/auth';

function ConversationList({ activeId }) {
  const { data = [], isLoading } = useQuery({ queryKey: ['conversations'], queryFn: () => get('/chat/conversations'), refetchInterval: 60_000 });
  const me = useAuth((s) => s.user?.id);
  return (
    <aside className={cn('flex min-h-0 flex-col border-r border-line bg-white', activeId && 'hidden md:flex')}>
      <h2 className="border-b border-line p-5 font-serif text-2xl font-semibold">Messages</h2>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon="chat" title="No conversations yet" action={<Link to="/matrimonial" className="btn btn-primary btn-sm">Find people</Link>}>
            You can message members once one of you has accepted the other’s follow request.
          </EmptyState>
        ) : (
          data.map((c) => (
            <Link key={c.id} to={`/messages/${c.id}`} className={cn('flex gap-3 border-b border-[#f0e8df] p-3.5 transition', c.id === activeId ? 'border-l-[3px] border-l-primary bg-[#fff4eb]' : 'hover:bg-[#fffaf5]')}>
              <span className="relative">
                <Avatar src={c.partner.profilePhotoUrl} name={c.partner.fullName} size={46} />
                {c.partner.online && <span className="absolute right-0 bottom-0 size-3 rounded-full bg-leaf ring-2 ring-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <b className="truncate text-[13px]">{c.partner.fullName}</b>
                  <small className="shrink-0 text-[10px] text-muted">{timeAgo(c.lastMessageAt)}</small>
                </span>
                {c.context && (
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-semibold text-[#8c6100]">
                    <Icon name={c.context.type === 'BUSINESS' ? 'briefcase' : 'tent'} size={11} /> {c.context.title}
                  </span>
                )}
                <span className="mt-1 flex items-center gap-2">
                  <small className={cn('flex-1 truncate text-xs', c.unread ? 'font-semibold text-ink' : 'text-muted')}>
                    {c.lastMessage?.senderId === me && 'You: '}
                    {c.lastMessage?.content}
                  </small>
                  {c.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{c.unread}</span>}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}

function Thread({ conversationId }) {
  const me = useAuth((s) => s.user?.id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [pending, setPending] = useState([]); // optimistic messages
  const [online, setOnline] = useState(false);
  const scroller = useRef(null);
  const stickToBottom = useRef(true);
  const typingTimer = useRef(null);
  useScreenshotGuard(true);

  const convo = useQuery({ queryKey: ['conversation', conversationId], queryFn: () => get(`/chat/${conversationId}`) });
  const msgs = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) => get(`/chat/${conversationId}/messages`, { before: pageParam, limit: 30 }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const partner = convo.data?.partner;
  useEffect(() => setOnline(Boolean(partner?.online)), [partner?.online]);

  const messages = useMemo(() => {
    const all = (msgs.data?.pages ?? []).slice().reverse().flatMap((p) => p.items);
    const ids = new Set(all.map((m) => m.id));
    return [...all, ...pending.filter((p) => !ids.has(p.realId))];
  }, [msgs.data, pending]);

  const markRead = useCallback(() => {
    const s = getSocket();
    if (s?.connected) s.emit('mark_read', { conversationId });
    else put(`/chat/${conversationId}/read`).catch(() => {});
    qc.invalidateQueries({ queryKey: ['conversations'] });
    setTimeout(() => get('/notifications/unread').then((u) => useAuth.getState().patchUnread(u)).catch(() => {}), 400);
  }, [conversationId, qc]);

  // Socket wiring
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const join = () => s.emit('join_room', { conversationId });
    join();
    s.on('connect', join);
    const onMsg = (m) => {
      if (m.conversationId !== conversationId) return;
      qc.setQueryData(['messages', conversationId], (old) => {
        if (!old) return old;
        const exists = old.pages.some((p) => p.items.some((x) => x.id === m.id));
        if (exists) return old;
        const pages = [...old.pages];
        pages[0] = { ...pages[0], items: [...pages[0].items, m] };
        return { ...old, pages };
      });
      setPending((p) => p.filter((x) => x.realId !== m.id));
      if (m.senderId !== me) {
        setTyping(false);
        markRead();
      }
    };
    const onTyping = ({ conversationId: cid, userId, isTyping }) => cid === conversationId && userId !== me && setTyping(isTyping);
    const onRead = ({ conversationId: cid }) => {
      if (cid !== conversationId) return;
      qc.setQueryData(['messages', conversationId], (old) => old && { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map((x) => (x.senderId === me ? { ...x, isRead: true } : x)) })) });
    };
    const onPresence = ({ userId, online: o }) => userId === partner?.userId && setOnline(o);
    s.on('new_message', onMsg);
    s.on('typing_indicator', onTyping);
    s.on('message_read', onRead);
    s.on('presence', onPresence);
    return () => {
      s.emit('leave_room', { conversationId });
      s.off('connect', join);
      s.off('new_message', onMsg);
      s.off('typing_indicator', onTyping);
      s.off('message_read', onRead);
      s.off('presence', onPresence);
    };
  }, [conversationId, me, qc, markRead, partner?.userId]);

  useEffect(() => {
    if (msgs.isSuccess) markRead();
  }, [msgs.isSuccess, markRead]);

  // Auto-scroll to bottom for new messages
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  const onScroll = () => {
    const el = scroller.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80 && msgs.hasNextPage && !msgs.isFetchingNextPage) {
      const prevHeight = el.scrollHeight;
      msgs.fetchNextPage().then(() => requestAnimationFrame(() => (el.scrollTop = el.scrollHeight - prevHeight)));
    }
  };

  const send = async (e) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content || !partner) return;
    const tempId = `tmp-${Date.now()}`;
    setPending((p) => [...p, { id: tempId, tempId, content, senderId: me, createdAt: new Date().toISOString(), sending: true }]);
    setText('');
    stickToBottom.current = true;
    getSocket()?.emit('typing', { conversationId, isTyping: false });
    try {
      let message;
      try {
        message = (await emitAck('send_message', { receiverId: partner.userId, content, tempId })).message;
      } catch (err) {
        if (err.message !== 'OFFLINE') throw err;
        message = await post(`/chat/${partner.userId}/message`, { content });
      }
      setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, realId: message.id, sending: false } : x)));
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err) {
      setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, failed: true, sending: false } : x)));
      toast.error(err.message || errorMessage(err));
    }
  };

  const onType = (v) => {
    setText(v);
    const s = getSocket();
    if (!s) return;
    s.emit('typing', { conversationId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => s.emit('typing', { conversationId, isTyping: false }), 1800);
  };

  if (convo.isError)
    return (
      <div className="grid place-items-center">
        <EmptyState icon="chat" title="Conversation not found" action={<Link to="/messages" className="btn btn-outline">All messages</Link>} />
      </div>
    );

  return (
    <section className="protected flex min-h-0 flex-col bg-[#fdf9f4]">
      <header className="flex h-[70px] shrink-0 items-center gap-3 border-b border-line bg-white px-3 sm:px-5">
        <button className="grid size-9 place-items-center rounded-full hover:bg-sand md:hidden" onClick={() => navigate('/messages')} aria-label="Back">
          <Icon name="arrow-left" />
        </button>
        {partner ? (
          <Link to={`/profile/${partner.userId}`} className="flex min-w-0 items-center gap-3">
            <span className="relative">
              <Avatar src={partner.profilePhotoUrl} name={partner.fullName} size={42} />
              {online && <span className="absolute right-0 bottom-0 size-3 rounded-full bg-leaf ring-2 ring-white" />}
            </span>
            <span className="min-w-0">
              <b className="flex items-center gap-1.5 text-sm">
                <span className="truncate">{partner.fullName}</span> {partner.isVerified && <VerifiedDot size={14} />}
              </b>
              <small className={cn('text-[11px]', online ? 'text-leaf' : 'text-muted')}>{typing ? 'typing…' : lastActive(partner.lastActiveAt, online)}</small>
            </span>
          </Link>
        ) : (
          <Skeleton className="h-10 w-40" />
        )}
        {convo.data?.context && (
          <Link
            to={convo.data.context.type === 'BUSINESS' ? `/business/${convo.data.context.id}` : `/services/provider/${convo.data.context.id}`}
            className="ml-auto hidden max-w-[45%] items-center gap-1.5 truncate rounded-full border border-gold/50 bg-[#fff8e6] px-3 py-1.5 text-[11px] font-semibold text-[#8c6100] hover:border-gold sm:flex"
            title="Open the listing"
          >
            <Icon name={convo.data.context.type === 'BUSINESS' ? 'briefcase' : 'tent'} size={13} />
            <span className="truncate">About: {convo.data.context.title}</span>
          </Link>
        )}
      </header>
      {convo.data?.context && (
        <Link
          to={convo.data.context.type === 'BUSINESS' ? `/business/${convo.data.context.id}` : `/services/provider/${convo.data.context.id}`}
          className="flex shrink-0 items-center gap-1.5 truncate border-b border-gold/30 bg-[#fff8e6] px-4 py-1.5 text-[11px] font-semibold text-[#8c6100] sm:hidden"
        >
          <Icon name={convo.data.context.type === 'BUSINESS' ? 'briefcase' : 'tent'} size={13} /> Enquiry about {convo.data.context.title}
        </Link>
      )}
      <div className="flex h-8 shrink-0 items-center justify-center gap-1.5 bg-[#f5e9d7] text-[10px] text-[#7c5f35]">
        <Icon name="lock" size={13} /> Screenshots are disabled for privacy and safety
      </div>

      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-5 sm:px-6">
        {msgs.isFetchingNextPage && (
          <div className="flex justify-center py-2 text-primary">
            <Spinner size={18} />
          </div>
        )}
        {msgs.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="ml-auto h-10 w-2/5" />
            <Skeleton className="h-10 w-1/3" />
          </div>
        )}
        {!msgs.isLoading && messages.length === 0 && (
          <div className="py-16 text-center">
            <p className="heading-deva text-xl">नमस्कार 🙏</p>
            <p className="mt-1 text-sm text-muted">{convo.data?.context ? `Ask ${partner?.fullName?.split(' ')[0] || 'the owner'} about ${convo.data.context.title}.` : 'Say hello and start a respectful conversation.'}</p>
            {convo.data?.context && (
              <div className="mx-auto mt-4 flex max-w-sm flex-wrap justify-center gap-1.5">
                {[
                  `Namaskar! I found ${convo.data.context.title} on Mi Vanjari. Could you share more details?`,
                  convo.data.context.type === 'SERVICE' ? 'Are you available on our wedding date? What are your package prices?' : 'What are your prices, and do you deliver near me?',
                ].map((s) => (
                  <button key={s} type="button" className="chip text-left" onClick={() => setText(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const mine = m.senderId === me;
            const showDay = i === 0 || dayLabel(messages[i - 1].createdAt) !== dayLabel(m.createdAt);
            return (
              <Fragment key={m.tempId || m.id}>
                {showDay && <p className="py-2 text-center text-[10px] tracking-widest text-[#8b8178]">{dayLabel(m.createdAt)}</p>}
                <motion.div
                  layout="position"
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn('w-fit max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm sm:max-w-[68%]', mine ? 'ml-auto rounded-br-md bg-[#f7d7c6]' : 'rounded-bl-md bg-white', m.failed && 'opacity-60 ring-1 ring-red-300')}
                >
                  <span className="break-words whitespace-pre-wrap">{m.content}</span>
                  <small className="mt-1 flex items-center justify-end gap-1 text-[9px] text-[#8b7d72]">
                    {m.failed ? 'Failed' : m.sending ? 'Sending…' : timeOfDay(m.createdAt)}
                    {mine && !m.sending && !m.failed && <Icon name={m.isRead ? 'check-double' : 'check'} size={12} className={m.isRead ? 'text-[#2f7ad6]' : ''} />}
                  </small>
                </motion.div>
              </Fragment>
            );
          })}
        </AnimatePresence>
        <AnimatePresence>
          {typing && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
              {[0, 1, 2].map((d) => (
                <motion.span key={d} className="size-1.5 rounded-full bg-muted" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.15 }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {convo.data && !convo.data.canMessage ? (
        <p className="border-t border-line bg-white p-4 text-center text-xs text-muted">You can no longer message this member.</p>
      ) : (
        <form onSubmit={send} className="flex shrink-0 items-end gap-2.5 border-t border-line bg-white px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-4">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={2000}
            placeholder="Write a respectful message…"
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-[22px] border border-line px-4 py-2.5 text-[13px] outline-none focus:border-primary/50"
          />
          <motion.button whileTap={{ scale: 0.9 }} disabled={!text.trim()} className="grid size-[42px] shrink-0 place-items-center rounded-full bg-primary text-white transition disabled:opacity-40" aria-label="Send">
            <Icon name="send" size={18} />
          </motion.button>
        </form>
      )}
    </section>
  );
}

export default function Messages() {
  const { conversationId } = useParams();
  return (
    <div className="bg-[#f4eee7] md:px-6 md:py-8">
      <div className="mx-auto grid h-[calc(100dvh-66px)] max-w-[1080px] overflow-hidden bg-white md:h-[min(680px,calc(100dvh-150px))] md:grid-cols-[310px_1fr] md:rounded-2xl md:border md:border-line md:shadow-[var(--shadow-card)]">
        <ConversationList activeId={conversationId} />
        {conversationId ? (
          <Thread key={conversationId} conversationId={conversationId} />
        ) : (
          <div className="hidden place-items-center bg-[#fdf9f4] md:grid">
            <EmptyState icon="chat" title="Select a conversation">
              Messages are private between you and the member. Be respectful — families may read them too.
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
