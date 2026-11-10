import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { del, errorMessage, inBatches, put, upload } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { Icon, Spinner } from '../ui';

/**
 * Add / reorder / delete the signed-in member's profile photos.
 * Used in onboarding (matrimony step) and in Edit profile → Photos.
 */
export function PhotoManager({ intro = true }) {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total } while uploading
  const photos = user?.profile?.photos || [];

  const run = async (fn) => {
    setBusy(true);
    try {
      setUser(await fn());
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // no limit on how many photos — they upload a few at a time and appear as each batch finishes
  const add = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    setBusy(true);
    setProgress({ done: 0, total: files.length });
    try {
      for (const batch of inBatches(files)) {
        setUser(await upload('/users/me/photos', batch));
        setProgress((p) => ({ ...p, done: p.done + batch.length }));
      }
      if (files.length > 1) toast.success(`${files.length} photos added`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div>
      {intro && (
        <p className="mb-4 text-sm text-muted">
          Add as many clear photos as you like — any size, straight from your phone camera. You can select several at once. The first photo is your profile picture. Photos are compressed and location data (EXIF) is removed automatically.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <AnimatePresence>
          {photos.map((ph, i) => (
            <motion.div key={ph.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-line">
              <img src={ph.url} alt="" className="size-full object-cover" />
              {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Main</span>}
              <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/60 p-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                {i > 0 && (
                  <button type="button" className="flex-1 rounded-md bg-white/90 py-1 text-[11px] font-semibold" disabled={busy} onClick={() => run(() => put(`/users/me/photos/${ph.id}/primary`))}>
                    Make main
                  </button>
                )}
                <button type="button" className="ml-auto grid size-7 place-items-center rounded-md bg-white/90 text-primary" disabled={busy} onClick={() => run(() => del(`/users/me/photos/${ph.id}`))} aria-label="Delete photo">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {(
          <label className="grid aspect-[4/5] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted transition hover:border-primary hover:text-primary">
            {busy ? (
              <span className="text-center text-xs">
                <Spinner className="mx-auto mb-1" />
                {progress ? `Uploading ${progress.done}/${progress.total}…` : 'Saving…'}
              </span>
            ) : (
              <span className="text-center text-xs">
                <Icon name="camera" size={28} className="mx-auto mb-1" />
                Add photo
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => {
                if (e.target.files?.length) add(e.target.files);
                e.target.value = ''; // allow choosing the same file again
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
