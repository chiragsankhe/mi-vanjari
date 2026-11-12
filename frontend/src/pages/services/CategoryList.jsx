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
  const [sub, setSub] = useState('');
  const dq = useDebounce(q);
  const dl = useDebounce(location);
  const query = useInfiniteQuery({
    queryKey: ['providers', slug, dq, dl, sort, sub],
    queryFn: ({ pageParam }) => get(`/services/${slug}`, { page: pageParam, q: dq || undefined, location: dl || undefined, sort: sort || undefined, sub: sub || undefined }),
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
        {first?.category.subcategories?.length > 0 && (
          <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by type">
            {[{ id: '', name: 'All' }, ...first.category.subcategories].map((s) => (
              <button key={s.id || 'all'} type="button" onClick={() => setSub(s.id)} aria-pressed={sub === s.id} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition ${sub === s.id ? 'border-primary bg-primary text-white' : 'border-line bg-white text-[#4b4641] hover:border-primary'}`}>
                {s.name}
              </button>
            ))}
          </div>
        )}
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
          <Stagger key={`${dq}${dl}${sort}${sub}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
