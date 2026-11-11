import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Paywall } from '../../components/membership/Paywall';
import { useMembershipCheckout } from '../../components/membership/useMembershipCheckout';
import { ProfileCard, ProfileCardSkeleton } from '../../components/profile/ProfileBits';
import { EmptyState, ErrorState, Icon, LoadMoreSentinel, PageHeader, RangeSlider, Segment, Stagger, StaggerItem } from '../../components/ui';
import { useDebounce, usePaged } from '../../hooks';
import { cn, feetInches, inchesToCmMax, inchesToCmMin } from '../../lib/utils';
import { useAuth } from '../../store/auth';

// Slider limits. The ends are open: 60 means "60 and above", 6′6″ means "6′6″ and taller".
const AGE = { min: 18, max: 60 };
const HEIGHT_IN = { min: 54, max: 78 }; // 4′6″ – 6′6″

/** Shown until the paid period starts: matrimony is free now, ₹fee/year from the start date. */
function EarlyBanner({ m }) {
  const { pay, busy, dialog } = useMembershipCheckout();
  const from = new Date(m.paidFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="border-b border-gold/30 bg-[#fff8e6]">
      <div className="container-page flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          <b>Matrimony is free until {new Date(new Date(m.paidFrom).getTime() - 86400_000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</b> From {from}, membership is ₹{m.fee} per year. Pay early and your year starts on {from}.
        </span>
        <button className="btn btn-outline btn-sm shrink-0" onClick={pay} disabled={busy}>
          {busy ? 'Opening…' : `Become a member · ₹${m.fee}`}
        </button>
      </div>
      {dialog}
    </div>
  );
}

const EDU = [
  ['', 'Any'],
  ['GRADUATE', 'Graduate'],
  ['MASTERS', 'Masters'],
  ['PROFESSIONAL', 'Professional'],
];

function Filters({ value, onChange, onReset, total, onApply, showGender = true }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <b className="text-sm">Refine matches</b>
        <button className="text-xs font-semibold text-primary" onClick={onReset}>
          Reset
        </button>
      </div>
      <div className={cn(!showGender && 'hidden')}>
        <span className="field-label">I am looking for</span>
        <Segment
          id="lookfor"
          value={value.gender}
          onChange={(v) => set('gender', v)}
          options={[
            { value: 'MALE', label: 'Groom' },
            { value: 'FEMALE', label: 'Bride' },
          ]}
        />
      </div>
      <RangeSlider
        label="Age"
        min={AGE.min}
        max={AGE.max}
        value={[value.ageMin, value.ageMax]}
        onChange={([a, b]) => onChange({ ...value, ageMin: a, ageMax: b })}
        format={(v) => (v === AGE.max ? `${v}+` : `${v} yrs`)}
      />
      <RangeSlider
        label="Height"
        min={HEIGHT_IN.min}
        max={HEIGHT_IN.max}
        value={[value.heightMin, value.heightMax]}
        onChange={([a, b]) => onChange({ ...value, heightMin: a, heightMax: b })}
        format={(v) => (v === HEIGHT_IN.max ? `${feetInches(v)}+` : feetInches(v))}
      />
      <label className="block">
        <span className="field-label">Current location</span>
        <span className="relative block">
          <Icon name="map" size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input className="field pl-9" placeholder="City or state" value={value.city} onChange={(e) => set('city', e.target.value)} />
        </span>
      </label>
      <div>
        <span className="field-label">Education</span>
        <div className="flex flex-wrap gap-1.5">
          {EDU.map(([v, l]) => (
            <button key={l} className={cn('chip', value.education === v && 'chip-on')} onClick={() => set('education', v)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="field-label">Marital status</span>
        <select className="field" value={value.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
          <option value="">Any</option>
          <option value="NEVER_MARRIED">Single</option>
          <option value="DIVORCED">Divorced</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={value.verified} onChange={(e) => set('verified', e.target.checked)} />
        Verified profiles only
      </label>
      {onApply && (
        <button className="btn btn-primary w-full" onClick={onApply}>
          Show {total} profiles
        </button>
      )}
    </div>
  );
}

export default function Browse() {
  const me = useAuth((s) => s.user?.profile);
  const membership = useAuth((s) => s.user?.membership);
  const hasAccess = membership?.hasAccess !== false;
  const defaults = useMemo(
    () => ({
      gender: me?.gender === 'FEMALE' ? 'MALE' : 'FEMALE',
      ageMin: Math.max(AGE.min, me?.prefAgeMin || 21),
      ageMax: Math.min(AGE.max, me?.prefAgeMax || 35),
      heightMin: HEIGHT_IN.min,
      heightMax: HEIGHT_IN.max,
      city: '',
      education: '',
      maritalStatus: '',
      verified: false,
    }),
    [me],
  );
  const [filters, setFilters] = useState(defaults);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('active');
  const [sheet, setSheet] = useState(false);

  const debounced = useDebounce({ ...filters, q }, 400);
  const params = {
    gender: debounced.gender,
    ...(debounced.ageMin > AGE.min && { ageMin: debounced.ageMin }),
    ...(debounced.ageMax < AGE.max && { ageMax: debounced.ageMax }),
    // only filter by height once the member moves a handle (profiles without a height stay visible otherwise)
    ...(debounced.heightMin > HEIGHT_IN.min && { heightMin: inchesToCmMin(debounced.heightMin) }),
    ...(debounced.heightMax < HEIGHT_IN.max && { heightMax: inchesToCmMax(debounced.heightMax) }),
    ...(debounced.city && { city: debounced.city }),
    ...(debounced.education && { education: debounced.education }),
    ...(debounced.maritalStatus && { maritalStatus: debounced.maritalStatus }),
    ...(debounced.verified && { verified: 'true' }),
    ...(debounced.q && { q: debounced.q }),
    sort,
    limit: 12,
  };
  const { items, total, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaged(['browse'], '/matrimonial/browse', params, { enabled: hasAccess });

  return (
    <>
      <PageHeader eyebrow="Matrimonial" title="शोधा तुमचा जीवनसाथी" subtitle="Verified profiles. Meaningful connections. Your privacy, always respected." icon="heart">
        <Link to="/requests" className="btn btn-outline btn-sm">
          <Icon name="users" size={16} /> Requests
        </Link>
        <Link to="/me?tab=saved" className="btn btn-outline btn-sm">
          <Icon name="heart" size={16} /> Shortlist
        </Link>
      </PageHeader>

      {!hasAccess ? (
        <div className="bg-[#fbf7f1] px-4 py-10 md:py-14">
          <Paywall />
        </div>
      ) : (
      <>
      {membership && !membership.required && !membership.active && !membership.startsAt && <EarlyBanner m={membership} />}
      <div className="bg-[#fbf7f1]">
        <div className="container-page grid gap-7 py-6 md:py-9 lg:grid-cols-[265px_1fr]">
          <aside className="card sticky top-[100px] hidden h-max p-5 lg:block">
            <Filters value={filters} onChange={setFilters} onReset={() => setFilters(defaults)} />
          </aside>

          <section>
            {/* Phones: two big tabs — Groom / Bride (computers have the same switch in the side panel) */}
            <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-white p-1.5 shadow-[var(--shadow-card)] lg:hidden" role="tablist" aria-label="Looking for">
              {[
                ['MALE', 'Groom', 'वर'],
                ['FEMALE', 'Bride', 'वधू'],
              ].map(([v, en, mr]) => {
                const on = filters.gender === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilters((f) => ({ ...f, gender: v }))}
                    className={cn('flex h-11 items-center justify-center gap-2 rounded-lg text-[15px] font-bold transition', on ? 'bg-primary text-white shadow-[var(--shadow-cta)]' : 'text-[#5b534d] hover:bg-sand')}
                  >
                    {en} <span className="heading-deva text-sm font-semibold opacity-80">· {mr}</span>
                  </button>
                );
              })}
            </div>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <motion.b key={total} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="block font-serif text-xl font-semibold">
                  {isLoading ? 'Finding matches…' : `${total} ${total === 1 ? 'match' : 'matches'} for you`}
                </motion.b>
                <span className="text-xs text-muted">{sort === 'active' ? 'Recently active profiles first' : 'Newest members first'}</span>
              </div>
              <div className="flex gap-2">
                <label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[#9a8e83] focus-within:border-primary/50 md:w-64 md:flex-none">
                  <Icon name="search" size={17} />
                  <input className="w-full bg-transparent text-sm text-ink outline-none" placeholder="Search name, city, gotra…" value={q} onChange={(e) => setQ(e.target.value)} />
                </label>
                <select className="field h-10 w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                  <option value="active">Active</option>
                  <option value="newest">Newest</option>
                </select>
                <button className="btn btn-outline btn-sm h-10 lg:hidden" onClick={() => setSheet(true)} aria-label="Filters">
                  <Icon name="filter" size={16} />
                </button>
              </div>
            </div>

            {isError ? (
              <ErrorState error={error} onRetry={refetch} />
            ) : isLoading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProfileCardSkeleton key={i} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState icon="search" title="No profiles match these filters" action={<button className="btn btn-outline" onClick={() => setFilters(defaults)}>Reset filters</button>}>
                Try widening the age range or clearing the location.
              </EmptyState>
            ) : (
              <Stagger key={JSON.stringify(params)} className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-3" gap={0.05}>
                {items.map((p) => (
                  <StaggerItem key={p.userId}>
                    <ProfileCard p={p} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
            <LoadMoreSentinel onVisible={fetchNextPage} hasMore={hasNextPage} loading={isFetchingNextPage} />
          </section>
        </div>
      </div>
      </>
      )}

      <AnimatePresence>
        {sheet && (
          <motion.div className="fixed inset-0 z-[60] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setSheet(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }} className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white p-5 pb-8">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
              <Filters value={filters} onChange={setFilters} onReset={() => setFilters(defaults)} total={total} onApply={() => setSheet(false)} showGender={false} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
