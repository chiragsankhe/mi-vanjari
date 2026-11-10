import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { EmptyState, Icon, PageHeader, Skeleton, Stagger, StaggerItem } from '../../components/ui';
import { get } from '../../lib/api';
import { cn, formatINR } from '../../lib/utils';

export default function Combos() {
  const { data = [], isLoading } = useQuery({ queryKey: ['combos'], queryFn: () => get('/services/combos') });
  return (
    <>
      <PageHeader eyebrow="Combo packages" title="एकत्र घ्या, बचत करा" subtitle="Ready-made wedding bundles from trusted community providers — one call, everything sorted." icon="tent" />
      <div className="container-page py-10 md:py-14">
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon="tent" title="No packages right now">
            Check back soon — new combos are added every season.
          </EmptyState>
        ) : (
          <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.map((c) => {
              const save = c.originalPrice ? c.originalPrice - c.price : 0;
              return (
                <StaggerItem key={c.id}>
                  <motion.article whileHover={{ y: -6 }} className={cn('relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white', c.isFeatured ? 'border-primary shadow-[var(--shadow-lift)]' : 'border-line')}>
                    {c.isFeatured && <span className="absolute top-4 right-4 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white">MOST POPULAR</span>}
                    <div className="flex h-32 flex-col items-center justify-center bg-[linear-gradient(135deg,#f4eadc,#fbe7de)] text-primary">
                      <Icon name="tent" size={40} />
                      <span className="heading-deva mt-1 font-bold">{c.titleMr || 'शुभ मंगल'}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h2 className="font-serif text-2xl">{c.title}</h2>
                      <p className="mt-1 text-sm text-muted">{c.description}</p>
                      <div className="mt-4 flex flex-wrap items-baseline gap-3">
                        <strong className="font-serif text-3xl">{formatINR(c.price)}</strong>
                        {c.originalPrice && <del className="text-sm text-[#999]">{formatINR(c.originalPrice)}</del>}
                        {save > 0 && <span className="rounded bg-leaf-soft px-2 py-1 text-[10px] font-bold text-leaf">SAVE {formatINR(save)}</span>}
                      </div>
                      <ul className="mt-5 space-y-2">
                        {c.includes.map((x) => (
                          <li key={x} className="flex items-center gap-2 text-sm">
                            <span className="grid size-5 place-items-center rounded-full bg-leaf-soft text-leaf">
                              <Icon name="check" size={12} strokeWidth={3} />
                            </span>
                            {x}
                          </li>
                        ))}
                      </ul>
                      {c.providers.length > 0 && (
                        <div className="mt-5 border-t border-line pt-4">
                          <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-muted uppercase">Providers</p>
                          <div className="flex flex-wrap gap-1.5">
                            {c.providers.map((p) => (
                              <Link key={p.id} to={`/services/provider/${p.id}`} className="chip hover:text-primary">
                                {p.businessName}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-auto pt-6">
                        {c.providers[0] ? (
                          <Link to={`/services/provider/${c.providers[0].id}`} className={cn('btn w-full', c.isFeatured ? 'btn-primary' : 'btn-outline')}>
                            Enquire now <Icon name="arrow" size={16} />
                          </Link>
                        ) : (
                          <Link to="/info/contact" className="btn btn-outline w-full">
                            Contact us
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.article>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>
    </>
  );
}
