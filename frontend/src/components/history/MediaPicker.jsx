import { useState } from 'react';
import { toast } from 'sonner';
import { api, errorMessage } from '../../lib/api';
import { compressImage } from '../../lib/image';
import { Icon } from '../ui';

/**
 * Upload an image or a video for a history entry (admin). Shows a preview, upload progress and a remove button.
 * Images: any size (shrunk in the browser, re-encoded on the server). Videos: MP4 / WebM / MOV up to 300 MB.
 */
export function MediaPicker({ kind, value, onChange }) {
  const [progress, setProgress] = useState(null);
  const isVideo = kind === 'video';

  const pick = async (file) => {
    if (!file) return;
    if (isVideo && file.size > 300 * 1024 * 1024) return toast.error('Videos can be up to 300 MB — please export a smaller file.');
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append(kind, isVideo ? file : await compressImage(file));
      const { data } = await api.post(`/admin/history/media/${kind}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0, // large videos on slow connections
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      onChange(data.url);
      toast.success(isVideo ? 'Video uploaded' : 'Image uploaded');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div>
      <span className="field-label">{isVideo ? 'Video (optional)' : 'Image (optional)'}</span>
      {value ? (
        <div className="relative w-fit overflow-hidden rounded-lg border border-line bg-black">
          {isVideo ? <video src={value} controls preload="metadata" className="h-36 w-64 object-contain" /> : <img src={value} alt="" className="h-36 w-64 object-cover" />}
          <button type="button" onClick={() => onChange('')} className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-white/90 text-primary shadow" aria-label={`Remove ${kind}`}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      ) : (
        <label className="flex h-36 w-64 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg px-4 text-center border-2 border-dashed border-line text-xs text-muted transition hover:border-primary hover:text-primary">
          {progress != null ? (
            <>
              <span className="font-semibold">Uploading… {progress}%</span>
              <span className="h-1.5 w-40 overflow-hidden rounded-full bg-line">
                <span className="block h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </span>
            </>
          ) : (
            <>
              <Icon name={isVideo ? 'image' : 'camera'} size={24} />
              {isVideo ? 'Upload video · MP4, WebM, MOV (≤ 300 MB)' : 'Upload image · any size'}
            </>
          )}
          <input type="file" hidden accept={isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/*'} disabled={progress != null} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}
