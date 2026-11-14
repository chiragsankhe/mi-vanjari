import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, put, upload } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { Icon, Spinner } from '../ui';

/**
 * Pick one photo and make it the profile picture — nothing else to do.
 * The photo is added to the member's photos and moved to the front (older photos stay in their gallery).
 */
export function useChangeProfilePhoto() {
  const setUser = useAuth((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const change = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const before = new Set((useAuth.getState().user?.profile?.photos || []).map((p) => p.id));
      let user = await upload('/users/me/photos', [file]);
      setUser(user);
      const added = (user.profile?.photos || []).find((p) => !before.has(p.id));
      if (added && user.profile.photos[0]?.id !== added.id) {
        user = await put(`/users/me/photos/${added.id}/primary`);
        setUser(user);
      }
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return { change, busy };
}

/** A button (or round camera badge when `badge`) that opens the photo picker. */
export function ChangePhotoButton({ badge = false, className = '', label = 'Change photo' }) {
  const { change, busy } = useChangeProfilePhoto();
  return (
    <label
      className={
        badge
          ? `grid size-9 cursor-pointer place-items-center rounded-full border-2 border-white bg-primary text-white shadow-md transition hover:bg-primary-dark ${busy ? 'opacity-70' : ''} ${className}`
          : `btn btn-outline btn-sm cursor-pointer ${busy ? 'opacity-70' : ''} ${className}`
      }
      title={label}
    >
      {busy ? <Spinner size={16} /> : <Icon name="camera" size={badge ? 17 : 15} />}
      {!badge && <span>{busy ? 'Uploading…' : label}</span>}
      <span className="sr-only">{label}</span>
      <input
        type="file"
        accept="image/*"
        hidden
        disabled={busy}
        onChange={(e) => {
          change(e.target.files?.[0]);
          e.target.value = ''; // allow choosing the same file again
        }}
      />
    </label>
  );
}
