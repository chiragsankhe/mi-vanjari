import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ProviderCard, Stars } from '../../components/common/Listing';
import { Icon, Img, PageHeader, Reveal, Skeleton, Stagger, StaggerItem } from '../../components/ui';
import { get } from '../../lib/api';
import { formatINR } from '../../lib/utils';

export default function Services() {
  const cats = useQuery({ queryKey: ['service-categories'], queryFn: () => get('/services/categories') });
  const featured = useQuery({ queryKey: ['services-featured'], queryFn: () => get('/services/featured') });
  const combos = useQuery({ queryKey: ['combos'], queryFn: () => get('/services/combos') });
  const hero = featured.data?.[0];

  return (
    <>
      <PageHeader eyebrow="Trusted wedding services" title="लग्नाची तयारी, आता सोपी" subtitle="Find community-recommended professionals for every part of your celebration." icon="tent">
        <Link to="/services/new" className="btn btn-primary btn-sm">
          <Icon name="plus" size={16} /> List your service
        </Link>
        <Link to="/services/combos" className="btn btn-outline btn-sm">
          Combo packages
        </Link>
      </PageHeader>

      <section className="container-page py-12 md:py-14">
        <Reveal className="mb-8">
          <h2 className="font-serif text-[28px] font-semibold md:text-4xl">Everything for your big day</h2>
          <p className="mt-1 text-sm text-muted">Browse services by category</p>
        </Reveal>
        <Stagger className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
          {(cats.data ?? Array.from({ length: 12 })).map((c, i) => (
            <StaggerItem key={c?.id || i}>
              {c ? (
                <Link to={`/services/category/${c.slug}`} className="group card card-hover relative block min-h-[160px] p-4 pb-11 text-primary md:min-h-[175px] md:p-5 md:pb-12">
                  <span className="absolute top-4 right-4 font-serif text-[13px] text-[#cfc1b4] italic">{String(i + 1).padStart(2, '0')}</span>
                  <motion.span whileHover={{ scale: 1.15, rotate: -6 }} className="inline-block">
                    <Icon name={c.icon} size={30} />
                  </motion.span>
                  <b className="mt-3 block font-serif text-[15px] leading-snug font-semibold text-ink md:mt-4 md:text-[17px]">{c.name}</b>
                  <small className="heading-deva block text-xs text-muted">{c.nameMr}</small>
                  <small className="mt-1 hidden text-[11px] text-muted sm:block">
                    {c.description} · {c.providerCount} listed
                  </small>
                  <span className="absolute right-4 bottom-4 transition group-hover:translate-x-1">
                    <Icon name="arrow" size={16} />
                  </span>
                </Link>
              ) : (
                <Skeleton className="h-[170px]" />
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {hero && (
        <section className="bg-leaf text-white">
          <div className="container-page grid items-center gap-10 py-14 md:grid-cols-2 md:gap-[8vw] md:py-16">
            <Reveal>
              <p className="eyebrow eyebrow-light mb-4">Featured community partner</p>
              <h2 className="font-serif text-4xl leading-tight md:text-[44px]">{hero.businessName}</h2>
              <p className="mt-4 text-sm leading-[1.7] text-[#d4e4dc]">{hero.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/30 px-3 py-1.5 text-[11px]">{hero.ratingAvg?.toFixed(1)} rating</span>
                <span className="rounded-full border border-white/30 px-3 py-1.5 text-[11px]">{hero.ratingCount}+ reviews</span>
                <span className="rounded-full border border-white/30 px-3 py-1.5 text-[11px]">Verified</span>
              </div>
              <Link to={`/services/provider/${hero.id}`} className="btn btn-cream mt-7">
                View provider <Icon name="arrow" size={17} />
              </Link>
            </Reveal>
            <Reveal delay={0.15}>
              <motion.div whileHover={{ rotate: -1, y: -4 }} className="rounded-xl bg-white p-2.5 text-ink">
                <div className="relative h-64 overflow-hidden rounded-lg">
                  <Img src={hero.photos?.[0]} alt={hero.businessName} className="size-full object-cover object-[center_22%]" />
                  {hero.priceFrom && <span className="absolute bottom-2.5 left-2.5 rounded-md bg-white px-2.5 py-2 text-[11px] font-bold">Starting at {formatINR(hero.priceFrom)}</span>}
                </div>
                <div className="p-3">
                  <b className="text-sm">{hero.category?.name}</b>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Icon name="map" size={14} /> {hero.location}
                  </p>
                  <Stars value={hero.ratingAvg} className="mt-1.5" />
                </div>
              </motion.div>
            </Reveal>
          </div>
        </section>
      )}

      {featured.data?.length > 1 && (
        <section className="container-page py-12 md:py-14">
          <Reveal className="mb-6 font-serif text-2xl font-semibold">Top-rated by the community</Reveal>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.data.map((p) => (
              <StaggerItem key={p.id}>
                <ProviderCard p={p} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {combos.data?.length > 0 && (
        <section className="container-page pb-16">
          <Reveal className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] md:flex-row md:items-center md:p-8">
            <div>
              <span className="text-[10px] font-extrabold tracking-[0.16em] text-primary uppercase">Save with combos</span>
              <h3 className="mt-1 font-serif text-2xl">{combos.data.length} ready-made wedding packages</h3>
              <p className="mt-1 text-sm text-muted">Bundles from trusted community providers — starting at {formatINR(Math.min(...combos.data.map((c) => c.price)))}.</p>
            </div>
            <Link to="/services/combos" className="btn btn-primary">
              See all packages <Icon name="arrow" size={17} />
            </Link>
          </Reveal>
        </section>
      )}
    </>
  );
}
