import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, Icon, Img, LoadMoreSentinel, PageHeader, Segment, Skeleton, Stagger, StaggerItem } from '../../components/ui';
import { usePaged } from '../../hooks';
import { get } from '../../lib/api';
import { cn } from '../../lib/utils';

function AchieverCard({ a, rank }) {
  const academic = a.type === 'ACADEMIC';
  return (
    <motion.article whileHover={{ y: -6 }} className="card relative h-full overflow-hidden p-2.5">
      <div className="relative h-56 overflow-hidden rounded-lg">
        <Img src={a.photoUrl} alt={a.name} fallbackIcon={academic ? 'graduation' : 'award'} className="size-full object-cover object-top" />
        {academic && a.percentage != null && (
          <span className="absolute right-2.5 bottom-2.5 rounded-lg bg-white/95 px-3 py-1.5 text-center shadow">
            <b className="block font-serif text-xl leading-none text-primary">{a.percentage}%</b>
            <small className="text-[9px] text-muted">{a.grade}</small>
          </span>
        )}
        {rank && rank <= 3 && (
          <span className={cn('absolute top-2.5 left-2.5 grid size-9 place-items-center rounded-full text-sm font-bold text-white shadow', rank === 1 ? 'bg-gold' : rank === 2 ? 'bg-[#9aa3ad]' : 'bg-[#b87333]')}>#{rank}</span>
        )}
      </div>
      <div className="p-2.5 pt-3.5">
        <span className="inline-block bg-[#fff0d0] px-2 py-1 text-[10px] font-semibold text-[#8b6100]">{academic ? `Academic excellence · ${a.year ?? ''}` : 'Professional excellence'}</span>
        <h2 className="mt-2 font-serif text-[19px] font-semibold">{a.name}</h2>
        <p className="mt-1 text-xs text-muted">{academic ? [a.stream, a.schoolName].filter(Boolean).join(' · ') : [a.role, a.company, a.city].filter(Boolean).join(' · ')}</p>
        {a.description && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#5b534d]">{a.description}</p>}
        {a.linkedinUrl && (
          <a href={a.linkedinUrl} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Icon name="link" size={13} /> LinkedIn
          </a>
        )}
      </div>
    </motion.article>
  );
}

export default function Achievers() {
  const [type, setType] = useState('ACADEMIC');
  const [year, setYear] = useState('');
  const [grade, setGrade] = useState('');
  const years = useQuery({ queryKey: ['achiever-years'], queryFn: () => get('/achievers/years') });
  const params = { type, ...(type === 'ACADEMIC' && year && { year }), ...(type === 'ACADEMIC' && grade && { grade }) };
  const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaged(['achievers'], '/achievers', params);

  return (
    <>
      <PageHeader eyebrow="Community achievers" title="आपले मानाचे तारे" subtitle="Celebrating those who inspire our community to dream bigger." icon="star">
        <Link to="/achievers/new" className="btn btn-primary btn-sm">
          <Icon name="plus" size={16} /> Nominate an achiever
        </Link>
      </PageHeader>
      <div className="container-page py-8 md:py-10">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segment
            id="ach"
            className="sm:w-80"
            value={type}
            onChange={setType}
            options={[
              { value: 'ACADEMIC', label: '🎓 Academic' },
              { value: 'PROFESSIONAL', label: '🏆 Professional' },
            ]}
          />
          {type === 'ACADEMIC' && (
            <div className="flex gap-2">
              <select className="field w-auto" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
                <option value="">All years</option>
                {years.data?.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <select className="field w-auto" value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Class">
                <option value="">All classes</option>
                <option>10th</option>
                <option>12th</option>
                <option>Graduation</option>
              </select>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="star" title="No achievers listed yet" action={<Link to="/achievers/new" className="btn btn-primary">Nominate someone</Link>}>
            Know a student who topped their class or a professional making the community proud?
          </EmptyState>
        ) : (
          <Stagger key={JSON.stringify(params)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a, i) => (
              <StaggerItem key={a.id} className="h-full">
                <AchieverCard a={a} rank={type === 'ACADEMIC' && year ? i + 1 : null} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
        <LoadMoreSentinel onVisible={fetchNextPage} hasMore={hasNextPage} loading={isFetchingNextPage} />
      </div>
    </>
  );
}
