import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { VanjariFilm } from '../../components/history/VanjariFilm';
import { ProfileCard, ProfileCardSkeleton, ReportDialogBody } from '../../components/profile/ProfileBits';
import { Avatar, EmptyState, ErrorState, Icon, Img, LoadMoreSentinel, Modal, PageHeader, SampleTag, Skeleton, Spinner, Stagger, StaggerItem, Tabs, VerifiedDot } from '../../components/ui';
import { useDebounce, usePaged } from '../../hooks';
import { del, errorMessage, get, post, upload } from '../../lib/api';
import { cn, timeAgo } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';

function Timeline() {
  const { data = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ['history'], queryFn: () => get('/history') });
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <section ref={ref} className="relative mx-auto my-10 max-w-[900px] md:my-16">
      <div className="absolute top-0 bottom-0 left-[21px] w-px bg-line md:left-[49px]" />
      <motion.div style={{ scaleY }} className="absolute top-0 bottom-0 left-[21px] w-px origin-top bg-primary md:left-[49px]" />
      {isLoading
        ? [0, 1, 2].map((i) => <Skeleton key={i} className="mb-6 ml-14 h-40 md:ml-[100px]" />)
        : data.map((h, i) => (
            <motion.article key={h.id} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }} className="mb-6 grid grid-cols-[55px_1fr] md:grid-cols-[100px_1fr]">
              <motion.span initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring', delay: 0.2 }} className="z-10 grid size-11 place-items-center rounded-full border border-primary bg-ivory font-serif text-[13px] text-primary italic md:ml-[27px]">
                0{i + 1}
              </motion.span>
              <div className="card overflow-hidden transition hover:shadow-[var(--shadow-card)]">
                {h.videoUrl ? (
                  <video src={h.videoUrl} poster={h.imageUrl || undefined} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-cover" />
                ) : (
                  h.imageUrl && <Img src={h.imageUrl} alt={h.titleEn || h.title} className="aspect-[16/9] w-full object-cover" />
                )}
                <div className="p-5 md:p-7">
                  <small className="text-[10px] font-semibold tracking-[0.12em] text-primary">
                    {h.era} · {h.yearRange}
                  </small>
                  <h2 className="heading-deva mt-2 mb-1 text-[21px] font-semibold md:text-[25px]">{h.title}</h2>
                  {h.titleEn && <p className="mb-3 font-serif text-sm text-[#8a7a6d] italic">{h.titleEn}</p>}
                  <p className="text-[13px] leading-[1.85] text-muted">{h.content}</p>
                </div>
              </div>
            </motion.article>
          ))}
    </section>
  );
}

function Composer() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const m = useMutation({
    mutationFn: () => (file ? upload('/community/posts', [file], 'image', { content }) : post('/community/posts', { content })),
    onSuccess: () => {
      setContent('');
      setFile(null);
      toast.success('Shared with the community 🎉');
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!user?.profile) return null;
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar src={user.profile.photoUrl} name={user.profile.fullName} size={42} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} placeholder="Share a milestone, festival moment or community news…" className="min-h-20 flex-1 resize-none rounded-lg bg-sand/60 p-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20" />
      </div>
      {file && (
        <div className="relative mt-3 ml-[54px] w-fit">
          <img src={URL.createObjectURL(file)} alt="" className="h-28 rounded-lg object-cover" />
          <button className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink text-white" onClick={() => setFile(null)} aria-label="Remove image">
            <Icon name="close" size={12} />
          </button>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between pl-[54px]">
        <label className="btn btn-ghost btn-sm cursor-pointer">
          <Icon name="image" size={16} /> Photo
          <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <button className="btn btn-primary btn-sm" disabled={!content.trim() || m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? <Spinner size={15} /> : 'Post'}
        </button>
      </div>
    </div>
  );
}

export function PostCard({ post: p }) {
  const qc = useQueryClient();
  const authed = useAuth((s) => s.status === 'authed');
  const openAuth = useUI((s) => s.openAuth);
  const [liked, setLiked] = useState(p.liked);
  const [count, setCount] = useState(p.likeCount);
  const [report, setReport] = useState(false);
  const like = useMutation({
    mutationFn: () => post(`/community/posts/${p.id}/like`),
    onMutate: () => {
      setLiked((v) => !v);
      setCount((c) => c + (liked ? -1 : 1));
    },
    onSuccess: (r) => {
      setLiked(r.liked);
      setCount(r.likeCount);
    },
  });
  const remove = useMutation({
    mutationFn: () => del(`/community/posts/${p.id}`),
    onSuccess: () => {
      toast.success('Post deleted');
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
  return (
    <motion.article layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4 pb-3">
        <Link to={`/profile/${p.author.userId}`}>
          <Avatar src={p.author.profilePhotoUrl} name={p.author.fullName} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/profile/${p.author.userId}`} className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary">
            {p.author.fullName} {p.author.isVerified && <VerifiedDot size={14} />} {p.author.isDemo && <SampleTag />}
          </Link>
          <small className="text-xs text-muted">
            {p.author.currentCity} · {timeAgo(p.createdAt)}
          </small>
        </div>
        {p.isMine ? (
          <button className="grid size-8 place-items-center rounded-full text-muted hover:bg-sand" onClick={() => remove.mutate()} aria-label="Delete post">
            <Icon name="trash" size={16} />
          </button>
        ) : (
          authed && (
            <button className="grid size-8 place-items-center rounded-full text-muted hover:bg-sand" onClick={() => setReport(true)} aria-label="Report post">
              <Icon name="flag" size={16} />
            </button>
          )
        )}
      </div>
      <p className="px-4 pb-3 text-sm leading-relaxed whitespace-pre-line">{p.content}</p>
      {p.imageUrl && <Img src={p.imageUrl} alt="" className="max-h-[480px] w-full object-cover" />}
      <div className="flex items-center gap-4 border-t border-line px-4 py-2.5">
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => (authed ? like.mutate() : openAuth())} className={cn('flex items-center gap-1.5 text-sm transition', liked ? 'text-primary' : 'text-muted hover:text-primary')}>
          <motion.span animate={liked ? { scale: [1, 1.35, 1] } : {}}>
            <Icon name="heart" size={18} filled={liked} />
          </motion.span>
          {count}
        </motion.button>
      </div>
      <Modal open={report} onClose={() => setReport(false)}>
        <ReportDialogBody targetType="POST" targetId={p.id} onDone={() => setReport(false)} />
      </Modal>
    </motion.article>
  );
}

function Feed() {
  const authed = useAuth((s) => s.status === 'authed');
  const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaged(['posts'], '/community/posts');
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-8">
      {authed && <Composer />}
      {isLoading ? (
        [0, 1].map((i) => <Skeleton key={i} className="h-48" />)
      ) : items.length === 0 ? (
        <EmptyState icon="chat" title="No updates yet">
          Be the first to share something with the community.
        </EmptyState>
      ) : (
        <AnimatePresence>{items.map((p) => <PostCard key={p.id} post={p} />)}</AnimatePresence>
      )}
      <LoadMoreSentinel onVisible={fetchNextPage} hasMore={hasNextPage} loading={isFetchingNextPage} />
    </div>
  );
}

function Members() {
  const authed = useAuth((s) => s.status === 'authed');
  const openAuth = useUI((s) => s.openAuth);
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { items, total, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaged(['members'], '/community/members', { q: dq || undefined }, { enabled: authed });
  if (!authed)
    return (
      <EmptyState icon="users" title="Members only" action={<button className="btn btn-primary" onClick={() => openAuth('/community?tab=members')}>Log in to search members</button>}>
        Search community members by name, city, village or profession.
      </EmptyState>
    );
  return (
    <div className="py-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="font-serif text-lg">{isLoading ? 'Searching…' : `${total} members`}</p>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-muted sm:w-80">
          <Icon name="search" size={17} />
          <input className="w-full bg-transparent text-sm text-ink outline-none" placeholder="Name, city, village, profession…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <ProfileCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Stagger key={dq} className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" gap={0.04}>
          {items.map((p) => (
            <StaggerItem key={p.userId}>
              <ProfileCard p={{ ...p, matchScore: null }} showShortlist={false} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <LoadMoreSentinel onVisible={fetchNextPage} hasMore={hasNextPage} loading={isFetchingNextPage} />
    </div>
  );
}

export default function Community() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'story';
  return (
    <>
      <PageHeader eyebrow="Our story" title="मुळांशी जोडलेली आपली गोष्ट" subtitle="A living history of courage, belonging and traditions passed from one generation to the next." icon="history" />
      <div className="container-page">
        <Tabs
          id="community"
          className="mt-4"
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          tabs={[
            { value: 'story', label: 'आपला इतिहास · History' },
            { value: 'updates', label: 'Community updates' },
            { value: 'members', label: 'Members' },
          ]}
        />
        {tab === 'story' && (
          <>
            <section className="mx-auto mt-8 max-w-[1000px] md:mt-12">
              <VanjariFilm />
            </section>
            <Timeline />
          </>
        )}
        {tab === 'updates' && <Feed />}
        {tab === 'members' && <Members />}
      </div>
    </>
  );
}
