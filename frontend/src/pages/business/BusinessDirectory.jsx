import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, EmptyState, ErrorState, Icon, Img, LoadMoreSentinel, PageHeader, SampleTag, Skeleton, Stagger, StaggerItem, VerifiedDot } from '../../components/ui';
import { useDebounce, usePaged } from '../../hooks';
import { ChatWithOwner } from '../../components/chat/ChatWithOwner';
import AutoImage from '../../components/common/AutoImage';
import { plainText } from '../../components/common/RichText';
import { get } from '../../lib/api';
import { cn } from '../../lib/utils';

export function BusinessCard({ b }) {
  return (
    <Link to={`/business/${b.id}`} className="group card card-hover flex h-full min-w-0 gap-3 overflow-hidden p-2 sm:flex-col sm:gap-0 sm:p-2.5">
      <div className="relative h-[108px] w-[112px] shrink-0 overflow-hidden rounded-xl sm:h-48 sm:w-auto">
        <AutoImage photos={b.photos} alt={b.name} fallbackIcon="briefcase" className="transition duration-700 group-hover:scale-105" />
        {b.isSample && <SampleTag className="absolute right-1.5 bottom-1.5 bg-white !px-1.5 !py-0 !text-[8px] sm:top-2.5 sm:right-2.5 sm:bottom-auto sm:!px-2 sm:!py-0.5 sm:!text-[10px]" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5 sm:p-2.5 sm:pt-3.5">
        <span className="w-fit max-w-full truncate rounded-full bg-[#fff0d0] px-2 py-0.5 text-[10px] font-semibold text-[#8b6100] sm:rounded-none sm:py-1">{b.category}</span>
        <h2 className="mt-1 line-clamp-2 font-serif text-[15px] leading-snug font-semibold sm:mt-2 sm:text-[19px]">{b.name}</h2>
        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted sm:mt-1 sm:line-clamp-2 sm:text-xs">{plainText(b.description)}</p>
        <div className="mt-auto flex items-center gap-2 pt-1.5 text-xs sm:pt-4">
          <span className="hidden items-center gap-2 sm:flex">
            <Avatar src={b.owner?.profilePhotoUrl} name={b.owner?.fullName || ''} size={24} />
            <span className="flex min-w-0 items-center gap-1 truncate text-muted">
              {b.owner?.fullName} {b.owner?.isVerified && <VerifiedDot size={12} />}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1 rounded-full bg-[#e8f3f7] px-2 py-0.5 text-[11px] font-medium text-[#1f5d78] sm:ml-auto sm:shrink-0">
            <Icon name="map" size={12} className="shrink-0 text-[#1f6f8b]" /> <span className="truncate">{b.location}</span>
          </span>
          <span className="ml-auto sm:hidden">
            <ChatWithOwner type="BUSINESS" id={b.id} ownerId={b.owner?.userId} variant="icon" />
          </span>
        </div>
        <div className="mt-3 hidden gap-2 sm:flex">
          <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/35 bg-[#fff9f5] text-[11px] font-bold text-primary transition group-hover:bg-primary group-hover:text-white">
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
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="briefcase" title="No businesses found" action={<Link to="/business/new" className="btn btn-primary">List your business</Link>}>
            Try another category or search term.
          </EmptyState>
        ) : (
          <Stagger key={`${category}${ds}${dl}`} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
