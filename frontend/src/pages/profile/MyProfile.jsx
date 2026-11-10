import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProviderCard } from '../../components/common/Listing';
import { ProfileCard, ProfileCardSkeleton } from '../../components/profile/ProfileBits';
import { Avatar, Badge, CountUp, EmptyState, Icon, LoadMoreSentinel, Skeleton, Tabs, VerifiedDot } from '../../components/ui';
import { usePaged } from '../../hooks';
import { get } from '../../lib/api';
import { timeAgo } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { BusinessCard } from '../business/BusinessDirectory';
import { RashiLink } from '../../components/common/RashiReport';
import { FamilyContactsCard } from '../../components/profile/FamilyContactsCard';
import { PostCard } from '../community/Community';

function Completion({ p }) {
  const checks = [
    [p.photoUrl, 'Add a profile photo', '/me/edit?section=photos'],
    [p.bio, 'Write a short bio', '/me/edit'],
    // family & Kundali details matter only for matrimony profiles
    [p.gotra || !p.isMatrimonial, 'Add family details', '/me/edit?section=family'],
    [p.rashi || !p.isMatrimonial, 'Add birth time for Kundali', '/me/edit?section=family'],
    [p.prefAgeMin || !p.isMatrimonial, 'Set partner preferences', '/me/edit?section=family'],
    [p.familyContacts?.length || !p.isMatrimonial, 'Add family contacts', '/me/edit?section=family'],
  ];
  const done = checks.filter(([ok]) => ok).length;
  const pct = Math.round((done / checks.length) * 100);
  if (pct === 100) return null;
  const next = checks.find(([ok]) => !ok);
  return (
    <div className="mt-5 rounded-xl border border-gold/40 bg-[#fffaf0] p-4">
      <div className="flex items-center justify-between text-sm">
        <b>Profile {pct}% complete</b>
        <Link to={next[2]} className="font-semibold text-primary">
          {next[1]} →
        </Link>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f1e6da]">
        <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-primary))]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
      </div>
    </div>
  );
}

function Posts({ userId }) {
  const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaged(['posts', 'mine'], '/community/posts', { authorId: userId });
  if (isLoading) return <Skeleton className="mt-5 h-40" />;
  if (!items.length)
    return (
      <EmptyState icon="star" title="Share your first community update" action={<Link to="/community?tab=updates" className="btn btn-primary">Create a post</Link>}>
        Celebrate a milestone, business story or moment with your community.
      </EmptyState>
    );
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-5">
      {items.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      <LoadMoreSentinel onVisible={fetchNextPage} hasMore={hasNextPage} loading={isFetchingNextPage} />
    </div>
  );
}

function Saved() {
  const { items, isLoading } = usePaged(['shortlist'], '/matrimonial/shortlist');
  if (isLoading) return <div className="grid grid-cols-2 gap-3 py-5 md:grid-cols-3">{[0, 1, 2].map((i) => <ProfileCardSkeleton key={i} />)}</div>;
  if (!items.length)
    return (
      <EmptyState icon="heart" title="No saved profiles yet" action={<Link to="/matrimonial" className="btn btn-primary">Explore profiles</Link>}>
        Tap the heart on any profile to save it here.
      </EmptyState>
    );
  return (
    <div className="grid grid-cols-2 gap-3 py-5 md:grid-cols-3">
      {items.map((p) => (
        <ProfileCard key={p.userId} p={p} />
      ))}
    </div>
  );
}

function Viewers() {
  const { items, isLoading } = usePaged(['viewers'], '/matrimonial/viewers');
  if (isLoading) return <Skeleton className="mt-5 h-40" />;
  if (!items.length) return <EmptyState icon="eye" title="No profile views yet">Complete your profile and add a photo to get noticed.</EmptyState>;
  return (
    <ul className="divide-y divide-line py-2">
      {items.map((v) => (
        <li key={v.userId}>
          <Link to={`/profile/${v.userId}`} className="flex items-center gap-3 py-3 hover:bg-[#fffaf5]">
            <Avatar src={v.photoUrl} name={v.fullName} size={44} blur={v.locked} />
            <span className="flex-1">
              <b className="block text-sm">{v.fullName}</b>
              <small className="text-xs text-muted">
                {v.currentCity} · viewed {timeAgo(v.viewedAt)}
              </small>
            </span>
            <Icon name="chevron-right" size={18} className="text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MyListings() {
  const services = useQuery({ queryKey: ['my-services'], queryFn: () => get('/services/mine') });
  const businesses = useQuery({ queryKey: ['business', 'mine'], queryFn: () => get('/business/mine') });
  const achievements = useQuery({ queryKey: ['achievements', 'mine'], queryFn: () => get('/achievers/mine') });
  const empty = !services.data?.length && !businesses.data?.length && !achievements.data?.length;
  if (services.isLoading || businesses.isLoading) return <Skeleton className="mt-5 h-40" />;
  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-wrap gap-2">
        <Link to="/services/new" className="btn btn-outline btn-sm">
          <Icon name="tent" size={15} /> List a wedding service
        </Link>
        <Link to="/business/new" className="btn btn-outline btn-sm">
          <Icon name="briefcase" size={15} /> List a business
        </Link>
        <Link to="/achievers/new" className="btn btn-outline btn-sm">
          <Icon name="star" size={15} /> Nominate an achiever
        </Link>
      </div>
      {empty && <EmptyState icon="briefcase" title="Nothing listed yet">Showcase your business or wedding services to the whole community.</EmptyState>}
      {services.data?.length > 0 && (
        <section>
          <h3 className="mb-3 font-serif text-lg font-semibold">Wedding services</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.data.map((s) => (
              <div key={s.id} className="relative">
                {s.status !== 'APPROVED' && <Badge tone={s.status === 'PENDING' ? 'gold' : 'red'} className="absolute top-4 right-4 z-10">{s.status === 'PENDING' ? 'In review' : 'Needs changes'}</Badge>}
                <ProviderCard p={s} />
              </div>
            ))}
          </div>
        </section>
      )}
      {businesses.data?.length > 0 && (
        <section>
          <h3 className="mb-3 font-serif text-lg font-semibold">Businesses</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.data.map((b) => (
              <BusinessCard key={b.id} b={b} />
            ))}
          </div>
        </section>
      )}
      {achievements.data?.length > 0 && (
        <section>
          <h3 className="mb-3 font-serif text-lg font-semibold">Achiever nominations</h3>
          <ul className="space-y-2">
            {achievements.data.map((a) => (
              <li key={a.id} className="card flex items-center justify-between p-3 text-sm">
                <span>
                  <b>{a.name}</b> · <span className="text-muted">{a.type === 'ACADEMIC' ? `${a.grade} ${a.year ?? ''}` : a.company}</span>
                </span>
                <Badge tone={a.isVerified ? 'green' : 'gold'}>{a.isVerified ? 'Published' : 'In review'}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function MyProfile() {
  const user = useAuth((s) => s.user);
  const p = user.profile;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'posts';
  const stats = useQuery({ queryKey: ['my-stats'], queryFn: () => get('/users/me/stats') });

  return (
    <div className="bg-[#f7f1e9] pb-16">
      <div className="h-[170px] bg-primary-dark bg-[repeating-linear-gradient(45deg,transparent_0_35px,rgba(227,181,93,0.18)_36px_37px)] md:h-60" />
      <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="card relative mx-3 -mt-9 max-w-[960px] p-5 sm:mx-auto sm:-mt-[70px] sm:p-8 md:px-11">
        <div className="absolute -top-12 sm:-top-16">
          <Avatar src={p.photoUrl} name={p.fullName} size={typeof window !== 'undefined' && window.innerWidth < 640 ? 96 : 130} className="border-[5px] border-white shadow-[var(--shadow-card)]" />
        </div>
        <div className="flex justify-end gap-2">
          <Link to="/settings" className="btn btn-ghost btn-sm" aria-label="Settings">
            <Icon name="settings" size={17} />
          </Link>
          <Link to="/me/edit" className="btn btn-outline btn-sm">
            <Icon name="edit" size={15} /> Edit profile
          </Link>
        </div>
        <div className="pt-10 sm:pt-12">
          <h1 className="flex flex-wrap items-center gap-2 font-serif text-2xl font-semibold sm:text-3xl">
            {p.fullName} {p.isVerified && <VerifiedDot size={20} />}
            {p.accountType === 'PRIVATE' && (
              <Badge tone="gray">
                <Icon name="lock" size={11} /> Private
              </Badge>
            )}
            {p.isMatrimonial && <Badge tone="red">Matrimonial</Badge>}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {[p.occupation, p.currentCity].filter(Boolean).join(' · ')}
            {p.nativeVillage && ` · Originally from ${p.nativeVillage}`}
          </p>
          {p.rashi && (
            <p className="mt-1 text-xs text-muted">
              Rashi: <RashiLink rashi={p.rashi} nakshatra={p.nakshatra} name={p.fullName?.split(" ")[0]} /> · Nakshatra: <b className="text-ink">{p.nakshatra}</b>
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-between gap-2 border-y border-line py-5 sm:justify-start sm:gap-12">
          {[
            [stats.data?.followers, 'Followers'],
            [stats.data?.following, 'Following'],
            [stats.data?.views, 'Profile views'],
            [stats.data?.posts, 'Posts'],
          ].map(([n, l]) => (
            <div key={l}>
              <b className="block font-serif text-xl">{n == null ? '–' : <CountUp to={n} duration={1} />}</b>
              <span className="text-[10px] text-muted sm:text-xs">{l}</span>
            </div>
          ))}
        </div>
        <Completion p={p} />
        {p.familyContacts?.length > 0 && (
          <div className="mt-5">
            <FamilyContactsCard contacts={p.familyContacts} visible isSelf />
          </div>
        )}
        <Tabs
          id="dash"
          className="mt-5"
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          tabs={[
            { value: 'posts', label: 'My posts' },
            { value: 'saved', label: 'Saved profiles' },
            { value: 'viewers', label: 'Who viewed me' },
            { value: 'listings', label: 'My services & business' },
          ]}
        />
        {tab === 'posts' && <Posts userId={user.id} />}
        {tab === 'saved' && <Saved />}
        {tab === 'viewers' && <Viewers />}
        {tab === 'listings' && <MyListings />}
      </motion.section>
    </div>
  );
}
