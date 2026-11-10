import { toPng } from 'html-to-image';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Icon, Spinner } from '../ui';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * "Download" button that renders a purpose-built share card off-screen and saves it as a PNG.
 * The card has a fixed width, so the image looks the same whether it's made on a phone or a desktop.
 *
 *   <DownloadCardButton filename="kundali.png" card={() => <KundaliShareCard … />} />
 */
export function DownloadCardButton({ filename, card, label = 'Download', className }) {
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  const run = async () => {
    setBusy(true);
    try {
      await nextFrame(); // let the off-screen card mount
      await document.fonts?.ready;
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#fdf6ec' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
      toast.success('Downloaded — check your downloads folder');
    } catch (err) {
      console.error(err);
      toast.error('Could not create the image. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={run} disabled={busy} className={cn('btn btn-outline btn-sm', className)}>
        {busy ? <Spinner size={15} /> : <Icon name="download" size={16} />} {label}
      </button>
      {busy &&
        createPortal(
          <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
            <div ref={ref}>{card()}</div>
          </div>,
          document.body,
        )}
    </>
  );
}
