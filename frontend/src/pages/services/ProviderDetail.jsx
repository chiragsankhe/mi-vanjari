import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PackagesSection from './Packages';
import { toast } from 'sonner';
import { ContactButtons, Stars } from '../../components/common/Listing';
import { Avatar, Badge, EmptyState, Icon, Img, PageLoader, Reveal, SampleTag, Spinner } from '../../components/ui';
import { errorMessage, get, post } from '../../lib/api';
import { cn, formatINR, timeAgo } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';

function ReviewForm({ providerId, mine }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(mine?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(mine?.comment || '');
  const m = useMutation({
    mutationFn: () => post(`/services/provider/${providerId}/reviews`, { rating, comment: comment || undefined }),
    onSuccess: () => {
      toast.success('Thank you for your review!');
      qc.invalidateQueries({ queryKey: ['provider', providerId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="card p-5">
      <b className="text-sm">{mine ? 'Update your review' : 'Rate this service'}</b>
      <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.button key={i} whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.15 }} onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} className="text-gold" aria-label={`${i} stars`}>
            <Icon name="star" size={26} filled={i <= (hover || rating)} strokeWidth={1.5} />
          </motion.button>
        ))}
      </div>
      <textarea className="field mt-3" placeholder="Share your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={800} />
      <button className="btn btn-primary btn-sm mt-3" disabled={!rating || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? <Spinner size={15} /> : 'Submit review'}
      </button>
    </div>
  );
}

export default function ProviderDetail() {
  const { id } = useParams();
  const authed = useAuth((s) => s.status === 'authed');
  const openAuth = useUI((s) => s.openAuth);
  const [img, setImg] = useState(0);
  const { data: p, isLoading, isError } = useQuery({ queryKey: ['provider', id], queryFn: () => get(`/services/provider/${id}`) });

  if (isLoading) return <PageLoader />;
  if (isError) return <EmptyState icon="tent" title="Service not found" action={<Link to="/services" className="btn btn-outline">Back to services</Link>} />;

  return (
    <div className="bg-[#fbf7f1] pb-14">
      <div className="container-page pt-6">
        <Link to={`/services/category/${p.category.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
          <Icon name="arrow-left" size={16} /> {p.category.name}
        </Link>
      </div>
      <div className="container-page mt-4 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* On phones the order is: photos → About → info card → packages → reviews. On desktop the info card is a sticky right column. */}
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden p-2.5">
            <div className="aspect-[16/9] overflow-hidden rounded-lg sm:aspect-[16/10]">
              <Img src={p.photos?.[img]} alt={p.businessName} fallbackIcon={p.category.icon} className="size-full object-cover" />
            </div>
            {p.photos?.length > 1 && (
              <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
                {p.photos.map((u, i) => (
                  <button key={u} onClick={() => setImg(i)} className={cn('size-16 shrink-0 overflow-hidden rounded-md border-2', i === img ? 'border-primary' : 'border-transparent opacity-70')}>
                    <img src={u} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
          <Reveal className="card p-4 sm:p-6">
            <h2 className="font-serif text-lg font-semibold">About</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-[#4b4641]">{p.description || 'No description yet.'}</p>
          </Reveal>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-max">
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="card p-4 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone="red">{p.category.name}</Badge>
              {p.subcategories?.map((s) => (
                <Badge key={s.id} tone="gray">
                  {s.name}
                </Badge>
              ))}
              {p.isFeatured && <Badge>Featured</Badge>}
              {p.status !== 'APPROVED' && <Badge tone="gray">{p.status === 'PENDING' ? 'Awaiting approval' : 'Needs changes'}</Badge>}
            </div>
            <h1 className="mt-2.5 font-serif text-2xl font-semibold sm:mt-3 sm:text-3xl">
              {p.businessName} {p.isSample && <SampleTag className="align-middle" />}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <Icon name="map" size={15} /> {p.location}
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Stars value={p.ratingAvg} />
              <b>{p.ratingAvg ? p.ratingAvg.toFixed(1) : 'New'}</b>
              <span className="text-muted">· {p.ratingCount} reviews</span>
            </div>
            {p.priceFrom != null && (
              <p className="mt-4 rounded-lg bg-sand px-4 py-3 text-sm">
                Starting at <b className="font-serif text-xl">{formatINR(p.priceFrom)}</b>
              </p>
            )}
            {authed || p.isSample ? (
              <ContactButtons sample={p.isSample} phone={p.phone} whatsapp={p.whatsapp} name={p.businessName} className="mt-5" chat={{ type: 'SERVICE', id: p.id, ownerId: p.userId }} />
            ) : (
              <button className="btn btn-primary mt-5 w-full" onClick={() => openAuth()}>
                <Icon name="lock" size={16} /> Log in to see contact
              </button>
            )}
            {p.isOwner && (
              <Link to={`/services/edit/${p.id}`} className="btn btn-outline mt-3 w-full">
                <Icon name="edit" size={16} /> Edit listing
              </Link>
            )}
          </motion.div>
          {p.packages?.length > 0 && (
            <div className="card p-5">
              <b className="text-sm">Part of combo packages</b>
              {p.packages.map((pk) => (
                <Link key={pk.id} to="/services/combos" className="mt-3 flex items-center justify-between rounded-lg bg-sand px-3 py-2.5 text-sm hover:bg-primary-soft">
                  <span>{pk.title}</span>
                  <b>{formatINR(pk.price)}</b>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5 lg:col-start-1 lg:row-start-2">
          <PackagesSection provider={p} authed={authed} onLogin={() => openAuth()} />
          <Reveal className="space-y-4">
            <h2 className="flex items-center gap-3 font-serif text-xl font-semibold">
              Reviews <span className="text-sm font-normal text-muted">({p.ratingCount})</span>
            </h2>
            {authed && !p.isOwner && <ReviewForm providerId={p.id} mine={p.myReview} />}
            {!authed && (
              <button className="btn btn-outline btn-sm" onClick={() => openAuth()}>
                Log in to write a review
              </button>
            )}
            {p.reviews.length === 0 ? (
              <p className="text-sm text-muted">No written reviews yet.</p>
            ) : (
              p.reviews.map((r) => (
                <div key={r.id} className="card flex gap-3 p-4">
                  <Avatar src={r.user.photoUrl} name={r.user.fullName} size={38} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-sm">{r.user.fullName}</b>
                      <Stars value={r.rating} size={12} />
                      <small className="text-xs text-muted">{timeAgo(r.createdAt)}</small>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-[#4b4641]">{r.comment}</p>}
                  </div>
                </div>
              ))
            )}
          </Reveal>
        </div>

      </div>
    </div>
  );
}
