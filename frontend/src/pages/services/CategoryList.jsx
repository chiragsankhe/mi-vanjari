import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProviderCard } from '../../components/common/Listing';
import { EmptyState, ErrorState, Icon, LoadMoreSentinel, PageHeader, Skeleton, Stagger, StaggerItem } from '../../components/ui';
import { useDebounce } from '../../hooks';
import { get } from '../../lib/api';

export default function CategoryList() {
  const { slug } = useParams();
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('');
  const dq = useDebounce(q);
  const dl = useDebounce(location);
  const query = useInfiniteQuery({
    queryKey: ['providers', slug, dq, dl, sort],
    queryFn: ({ pageParam }) => get(`/services/${slug}`, { page: pageParam, q: dq || undefined, location: dl || undefined, sort: sort || undefined }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.hasMore ? l.page + 1 : undefined),
  });
  const first = query.data?.pages[0];
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader eyebrow={<Link to="/services" className="hover:underline">Wedding services</Link>} title={first?.category.nameMr || '…'} subtitle={first ? `${first.category.name} · ${first.total} trusted providers` : 'Loading…'} icon={first?.category.icon || 'tent'} />
      <div className="container-page py-8">
        <div className="mb-6 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-muted">
            <Icon name="search" size={17} />
            <input className="w-full bg-transparent text-sm text-ink outline-none" placeholder="Search providers" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-muted">
            <Icon name="map" size={17} />
            <input className="w-full bg-transparent text-sm text-ink outline-none" placeholder="Location (e.g. Palghar)" value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <select className="field w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="">Top rated</option>
            <option value="price">Lowest price</option>
          </select>
        </div>
        {query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="tent" title="No providers here yet" action={<Link to="/services/new" className="btn btn-primary">List your service</Link>}>
            Know someone great? Invite them to list their service on Mi Vanjari.
          </EmptyState>
        ) : (
          <Stagger key={`${dq}${dl}${sort}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <StaggerItem key={p.id}>
                <ProviderCard p={p} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
        <LoadMoreSentinel onVisible={query.fetchNextPage} hasMore={query.hasNextPage} loading={query.isFetchingNextPage} />
      </div>
    </>
  );
}
