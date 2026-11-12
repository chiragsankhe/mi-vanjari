import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useT } from '../../i18n/useT';
import { del, errorCode, errorMessage, post } from '../../lib/api';
import { cmToFeet, cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { Icon, Img, SampleTag, Spinner, VerifiedDot } from '../ui';

/** Follow button with optimistic state. */
export function FollowButton({ userId, status: initial, accountType, className, size = 'md', onChange }) {
  const t = useT();
  const qc = useQueryClient();
  const authed = useAuth((s) => s.status === 'authed');
  const openAuth = useUI((s) => s.openAuth);
  const [status, setStatus] = useState(initial || 'NONE');

  const mutation = useMutation({
    mutationFn: async (next) => (next === 'NONE' ? del(`/follow/${userId}`) : post(`/follow/${userId}`)),
    onMutate: (next) => {
      const prev = status;
      setStatus(next === 'NONE' ? 'NONE' : accountType === 'PUBLIC' ? 'ACCEPTED' : 'PENDING');
      return { prev };
    },
    onSuccess: (res) => {
      setStatus(res.status);
      onChange?.(res.status);
      qc.invalidateQueries({ queryKey: ['profile', userId] });
      if (res.status === 'PENDING') toast.success('Follow request sent');
      if (res.status === 'ACCEPTED') toast.success('You are now following');
    },
    onError: (err, _v, ctx) => {
      setStatus(ctx.prev);
      if (errorCode(err) === 'PROFILE_REQUIRED') toast.error('Complete your profile first');
      else toast.error(errorMessage(err));
    },
  });

  if (status === 'SELF') return null;
  const sm = size === 'sm';

  const click = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authed) return openAuth();
    mutation.mutate(status === 'NONE' ? 'FOLLOW' : 'NONE');
  };

  const label = status === 'ACCEPTED' ? t('following') : status === 'PENDING' ? t('requested') : accountType === 'PRIVATE' ? t('send_request') : t('follow');
  const icon = status === 'ACCEPTED' ? 'check' : status === 'PENDING' ? 'lock' : 'plus';

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={click}
      disabled={mutation.isPending || status === 'BLOCKED'}
      className={cn('btn', sm && 'btn-sm', status === 'NONE' ? 'btn-primary' : 'btn-soft', className)}
      title={status === 'PENDING' ? 'Click to cancel request' : status === 'ACCEPTED' ? 'Click to unfollow' : undefined}
    >
      {mutation.isPending ? <Spinner size={16} /> : <Icon name={icon} size={sm ? 15 : 17} />}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/** Heart toggle for the shortlist. */
export function ShortlistButton({ userId, initial = false, className }) {
  const [on, setOn] = useState(initial);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => post(`/matrimonial/shortlist/${userId}`),
    onMutate: () => setOn((v) => !v),
    onSuccess: (res) => {
      setOn(res.shortlisted);
      qc.invalidateQueries({ queryKey: ['shortlist'] });
      toast.success(res.shortlisted ? 'Saved to your shortlist' : 'Removed from shortlist');
    },
    onError: (err) => {
      setOn((v) => !v);
      toast.error(errorMessage(err));
    },
  });
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        m.mutate();
      }}
      className={cn('grid size-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition', on ? 'text-primary' : 'text-[#7e756e] hover:text-primary', className)}
      aria-label={on ? 'Remove from shortlist' : 'Save to shortlist'}
      aria-pressed={on}
    >
      <Icon name="heart" size={18} filled={on} />
    </motion.button>
  );
}

/** Matrimonial result card (design `.profile-card`) with privacy states. */
/** One icon + value line on a profile card (height / location / job). */
function CardFact({ icon, label, value, muted }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs" title={value ? `${label}: ${value}` : label}>
      <dt className="shrink-0 text-[#b0876a]">
        <Icon name={icon} size={14} />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className={cn('truncate', muted ? 'text-[11px] text-[#9b9189] italic' : 'text-ink')}>{value || '—'}</dd>
    </div>
  );
}

export function ProfileCard({ p, showShortlist = true, compact = false }) {
  const t = useT();
  if (compact) {
    const sub = p.age ? `${p.age} ${t('years')}` : p.ageRange ? `${p.ageRange} ${t('years')}` : '';
    return (
      <Link to={`/profile/${p.userId}`} className="group card card-hover flex items-center gap-3 p-2">
        <div className="relative size-[68px] shrink-0 overflow-hidden rounded-lg bg-sand">
          <Img src={p.photoUrl} alt={p.fullName} fallbackIcon="user" className="size-full object-cover object-top" />
          {p.locked && (
            <span className="absolute right-1 bottom-1 grid size-4 place-items-center rounded-full bg-black/60 text-white">
              <Icon name="lock" size={9} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 font-serif text-[14px] leading-tight font-semibold">
            <span className="truncate">{p.fullName}</span> {p.isVerified && <VerifiedDot size={13} />} {p.isSample && <SampleTag className="!px-1.5 !py-0 !text-[9px]" />}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
            <Icon name="map" size={11} className="shrink-0 text-[#b0876a]" />
            <span className="truncate">{[sub, p.currentCity].filter(Boolean).join(' · ')}</span>
          </p>
          {(p.locked || p.occupation || p.education) && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#5f5750]">
              <Icon name="briefcase" size={11} className="shrink-0 text-[#b0876a]" />
              <span className="truncate">{p.locked ? t('private_profile') : p.occupation || p.education}</span>
            </p>
          )}
        </div>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
          <Icon name="arrow" size={14} />
        </span>
      </Link>
    );
  }
  return (
    <Link to={`/profile/${p.userId}`} className="group card card-hover block overflow-hidden">
      <div className="relative h-[210px] overflow-hidden sm:h-[275px]">
        <Img
          src={p.photoUrl}
          alt={p.fullName}
          fallbackIcon="user"
          className="size-full object-cover object-top transition duration-700 group-hover:scale-105"
        />
        {p.locked && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
            <Icon name="lock" size={11} /> {t('private_profile')}
          </span>
        )}
        {showShortlist && <ShortlistButton userId={p.userId} initial={p.shortlisted} className="absolute top-2.5 right-2.5" />}
        {p.matchScore != null && <span className="absolute top-2.5 left-2.5 rounded-full border border-[#e9c360] bg-[#fff5da] px-2.5 py-1 text-[10px] font-bold text-[#8c6100]">{p.matchScore}% {t('match')}</span>}
      </div>
      <div className="p-3.5 sm:p-4">
        <h3 className="flex items-center gap-1.5 font-serif text-[15px] font-semibold sm:text-base">
          <span className="truncate">{p.fullName}</span> {p.isVerified && <VerifiedDot />} {p.isSample && <SampleTag />}
        </h3>
        <p className="mt-1 truncate text-xs text-muted">
          {p.age ? `${p.age} ${t('years')}` : p.ageRange ? `${p.ageRange} ${t('years')}` : p.currentCity}
          {p.gotra && ` · ${t('gotra')}: ${p.gotra}`}
        </p>
        <dl className="my-3.5 space-y-1.5">
          <CardFact icon="ruler" label={t('height')} value={cmToFeet(p.heightCm)} />
          <CardFact icon="map" label={t('location')} value={[p.currentCity, p.currentState].filter(Boolean).join(', ')} />
          <CardFact icon="briefcase" label={t('job')} value={p.occupation} />
        </dl>
        <span className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-primary/35 bg-[#fff9f5] text-[11px] font-bold text-primary transition group-hover:bg-primary group-hover:text-white">
          {p.locked ? (p.followStatus === 'PENDING' ? t('requested') : t('send_request')) : t('view_profile')} <Icon name="arrow" size={15} />
        </span>
      </div>
    </Link>
  );
}

export function ProfileCardSkeleton({ compact = false }) {
  if (compact)
    return (
      <div className="card flex items-center gap-3 p-2">
        <div className="skeleton size-[68px] shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-1/2" />
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      </div>
    );
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-[210px] rounded-none sm:h-[275px]" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-3/5" />
        <div className="skeleton h-3 w-4/5" />
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-9 w-full" />
      </div>
    </div>
  );
}

/** Report / block menu used on profiles and posts. */
export function ReportDialogBody({ targetType, targetId, onDone }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const m = useMutation({
    mutationFn: () => post('/community/reports', { targetType, targetId, reason, details: details || undefined }),
    onSuccess: (r) => {
      toast.success(r.message);
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const reasons = ['Fake profile', 'Inappropriate photos', 'Harassment or abusive messages', 'Asking for money', 'Spam', 'Other'];
  return (
    <div className="p-7">
      <h2 className="pr-8 font-serif text-2xl font-semibold">Report</h2>
      <p className="mt-2 text-sm text-muted">Reports are confidential. Our moderators review every report.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {reasons.map((r) => (
          <button key={r} className={cn('chip', reason === r && 'chip-on')} onClick={() => setReason(r)}>
            {r}
          </button>
        ))}
      </div>
      <textarea className="field mt-4" placeholder="Anything else we should know? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
      <button className="btn btn-primary mt-5 w-full" disabled={!reason || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? <Spinner size={16} /> : 'Submit report'}
      </button>
    </div>
  );
}
