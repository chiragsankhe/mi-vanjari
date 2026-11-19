import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ContactButtons } from '../../components/common/Listing';
import { LocationCard, MapAddress } from '../../components/common/LocationCard';
import { RichText } from '../../components/common/RichText';
import { PhotoGallery } from '../../components/profile/PhotoGallery';
import { ReportDialogBody } from '../../components/profile/ProfileBits';
import { Avatar, ConfirmDialog, EmptyState, Icon, Modal, PageLoader, SampleTag, VerifiedDot } from '../../components/ui';
import { del, errorMessage, get } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';

export default function BusinessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authed = useAuth((s) => s.status === 'authed');
  const openAuth = useUI((s) => s.openAuth);
  const [confirm, setConfirm] = useState(false);
  const [report, setReport] = useState(false);
  const { data: b, isLoading, isError } = useQuery({ queryKey: ['business', id], queryFn: () => get(`/business/${id}`) });
  const remove = useMutation({
    mutationFn: () => del(`/business/${id}`),
    onSuccess: () => {
      toast.success('Business removed');
      navigate('/business');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <PageLoader />;
  if (isError) return <EmptyState icon="briefcase" title="Business not found" action={<Link to="/business" className="btn btn-outline">Back to directory</Link>} />;

  return (
    <div className="bg-[#fbf7f1] pb-14">
      <div className="container-page pt-4 sm:pt-6">
        <Link to="/business" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary sm:text-sm">
          <Icon name="arrow-left" size={16} /> Business directory
        </Link>
      </div>
      {/* Phones show: photos → details → About → Location. Computers: a left column and a sticky details column. */}
      <div className="container-page mt-3 grid gap-3 sm:gap-5 lg:grid-cols-[1.3fr_1fr] lg:gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card min-w-0 overflow-hidden p-2 sm:p-2.5 lg:col-start-1 lg:row-start-1">
          <PhotoGallery photos={b.photos || []} alt={b.name} aspect="aspect-[16/10] sm:aspect-[16/10]" fit="object-center" fallbackIcon="briefcase" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:h-max">
          <div className="card p-3.5 shadow-[var(--shadow-card)] sm:p-6">
            <span className="inline-block rounded-full bg-[#fff0d0] px-2.5 py-0.5 text-[10.5px] font-bold text-[#8b6100]">{b.category}</span>
            <h1 className="mt-2 font-serif text-[22px] leading-tight font-semibold sm:text-3xl">
              {b.name} {b.isSample && <SampleTag className="align-middle" />}
            </h1>
            <MapAddress address={b.location} mapUrl={b.mapUrl} className="mt-2.5" />
            {b.website && (
              <a href={b.website} target="_blank" rel="noreferrer noopener" className="mt-2 flex items-center gap-1.5 text-[13px] text-primary hover:underline">
                <Icon name="link" size={15} /> {b.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {b.owner && (
              <Link to={`/profile/${b.owner.userId}`} className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-sand p-2 hover:bg-primary-soft">
                <Avatar src={b.owner.profilePhotoUrl} name={b.owner.fullName} size={34} />
                <span className="text-sm">
                  <small className="block text-[10.5px] leading-none text-muted">Owned by</small>
                  <b className="flex items-center gap-1 text-[13.5px]">
                    {b.owner.fullName} {b.owner.isVerified && <VerifiedDot size={13} />}
                  </b>
                </span>
              </Link>
            )}
            {authed || b.isSample ? (
              <ContactButtons sample={b.isSample} phone={b.phone} contactName={b.contactName} extraContacts={b.extraContacts || []} whatsapp={b.whatsapp} name={b.name} className="mt-3" chat={{ type: 'BUSINESS', id: b.id, ownerId: b.owner?.userId || b.userId }} />
            ) : (
              <button className="btn btn-primary mt-3 w-full" onClick={() => openAuth()}>
                <Icon name="lock" size={16} /> Log in to see contact
              </button>
            )}
            {b.canEdit || b.isOwner ? (
              <div className="mt-2.5 flex gap-2">
                <Link to={`/business/edit/${b.id}`} className="btn btn-outline btn-sm flex-1">
                  <Icon name="edit" size={15} /> Edit
                </Link>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirm(true)} aria-label="Delete">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ) : (
              authed && (
                <button className="mt-2.5 flex items-center gap-1.5 text-xs text-muted hover:text-primary" onClick={() => setReport(true)}>
                  <Icon name="flag" size={13} /> Report this listing
                </button>
              )
            )}
          </div>
        </motion.div>

        <div className="min-w-0 space-y-3 sm:space-y-5 lg:col-start-1 lg:row-start-2">
          <div className="card p-4 sm:p-6">
            <h2 className="flex items-center gap-2.5 font-serif text-[17px] font-semibold sm:text-lg">
              <span className="section-icon">
                <Icon name="info" size={16} />
              </span>
              About the business
            </h2>
            <RichText className="mt-3" text={b.description} empty={<p className="mt-3 text-sm text-muted">No description yet.</p>} />
          </div>
          <LocationCard address={b.location} mapUrl={b.mapUrl} />
        </div>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => remove.mutate()} loading={remove.isPending} danger title="Delete this business?" confirmLabel="Delete">
        This removes the listing permanently. This cannot be undone.
      </ConfirmDialog>
      <Modal open={report} onClose={() => setReport(false)}>
        <ReportDialogBody targetType="BUSINESS" targetId={b.id} onDone={() => setReport(false)} />
      </Modal>
    </div>
  );
}
