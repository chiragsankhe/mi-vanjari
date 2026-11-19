import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from '../ui';

/**
 * Shows a photo completely — nothing is cropped, whatever shape the photo has.
 * The empty space around a tall or wide photo is filled with a soft blurred copy of the same photo, so cards still look full.
 *  • default: fills its parent (the parent sets the height)
 *  • natural: takes the photo's own height (up to maxClass), for posts
 */
export default function FitImage({ src, alt = '', fallbackIcon = 'image', className, imgClassName, natural = false, maxClass = 'max-h-[480px]', ...rest }) {
  const [broken, setBroken] = useState(!src);
  useEffect(() => setBroken(!src), [src]);
  if (broken)
    return (
      <div className={cn('grid size-full place-items-center bg-[linear-gradient(135deg,#f4eadc,#fbe7de)] text-primary/60', className)}>
        <Icon name={fallbackIcon} size={36} />
      </div>
    );
  return (
    <div className={cn('relative overflow-hidden bg-sand', natural ? 'w-full' : 'size-full', className)}>
      <img src={src} alt="" aria-hidden="true" draggable={false} loading="lazy" className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-60 blur-2xl" />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onError={() => setBroken(true)}
        className={cn('relative mx-auto block', natural ? cn('h-auto w-auto max-w-full object-contain', maxClass) : 'size-full object-contain', imgClassName)}
        {...rest}
      />
    </div>
  );
}
