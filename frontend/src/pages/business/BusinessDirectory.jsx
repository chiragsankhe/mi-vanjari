import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, EmptyState, ErrorState, Icon, Img, LoadMoreSentinel, PageHeader, Skeleton, Stagger, StaggerItem, VerifiedDot } from '../../components/ui';
import { useDebounce, usePaged } from '../../hooks';
import { ChatWithOwner } from '../../components/chat/ChatWithOwner';
import { get } from '../../lib/api';
import { cn } from '../../lib/utils';

export function BusinessCard({ b }) {
  return (
    <Link to={`/business/${b.id}`} className="group card card-hover flex h-full flex-col overflow-hidden p-2.5">
      <div className="relative h-48 overflow-hidden rounded-lg">
        <Img src={b.photos?.[0]} alt={b.name} fallbackIcon="briefcase" className="size-full object-cover transition duration-700 group-hover:scale-105" />
      </div>
      <div className="flex flex-1 flex-col p-2.5 pt-3.5">
        <span className="w-fit bg-[#fff0d0] px-2 py-1 text-[10px] font-semibold text-[#8b6100]">{b.category}</span>
        <h2 className="mt-2 font-serif text-[19px] font-semibold">{b.name}</h2>
        <p className="mt-1 line-clamp-2 text-xs text-muted">{b.description}</p>
        <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted">
          <Avatar src={b.owner?.profilePhotoUrl} name={b.owner?.fullName || ''} size={24} />
          <span className="flex min-w-0 items-center gap-1 truncate">
            {b.owner?.fullName} {b.owner?.isVerified && <VerifiedDot size={12} />}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <Icon name="map" size={13} /> {b.location}
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-primary/35 bg-[#fff9f5] text-[11px] font-bold text-primary transition group-hover:bg-primary group-hover:text-white">
            View business <Icon name="arrow" size={15} />
          </span>
          <ChatWithOwner type="BUSINESS" id={b.id} ownerId={b.owner?.userId} variant="icon" />
        </div>
      </div>
    </Link>
  );
}

export default function BusinessDirectory() {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const ds = useDebounce(search);
  const dl = useDebounce(location);
  const cats = useQuery({ queryKey: ['business-categories'], queryFn: () => get('/business/categories'), staleTime: Infinity });
  const { items, total, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaged(['business'], '/business', {
    category: category || undefined,
    search: ds || undefined,
    location: dl || undefined,
  });

  return (
    <>
      <PageHeader eyebrow="Business directory" title="आपला व्यवसाय, आपली साथ" subtitle="Discover trusted businesses built by members of our community — and support them." icon="briefcase">
        <Link to="/business/new" className="btn btn-primary btn-sm">
          <Icon name="plus" size={16} /> List your business
        </Link>
      </PageHeader>
      <div className="container-page py-8 md:py-10">
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <label className="flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-muted">
            <Icon name="search" size={17} />
            <input className="w-full bg-transparent text-sm text-ink outline-none" placeholder="Search businesses, products, services…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label className="flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-muted">
            <Icon name="map" size={17} />
            <input className="w-full bg-transparent text-sm text-ink outline-none" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
        </div>
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
          {['', ...(cats.data || [])].map((c) => (
            <motion.button whileTap={{ scale: 0.95 }} key={c || 'all'} onClick={() => setCategory(c)} className={cn('chip shrink-0', category === c && 'chip-on')}>
              {c || 'All'}
            </motion.button>
          ))}
        </div>
        <p className="mb-4 text-sm text-muted">{isLoading ? 'Loading…' : `${total} businesses`}</p>
        {isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="briefcase" title="No businesses found" action={<Link to="/business/new" className="btn btn-primary">List your business</Link>}>
            Try another category or search term.
          </EmptyState>
        ) : (
          <Stagger key={`${category}${ds}${dl}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <StaggerItem key={b.id} className="h-full">
                <BusinessCard b={b} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
        <LoadMoreSentinel onVisible={fetchNextPage} hasMore={hasNextPage} loading={isFetchingNextPage} />
      </div>
    </>
  );
}
