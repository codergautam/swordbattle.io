import { useEffect, useState } from 'react';
import Ad from './Ad';

export default function ModalAd({ placement, minWidth = 900, minHeight = 640 }: { placement: string; minWidth?: number; minHeight?: number }) {
  const [dims, setDims] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 0,
    h: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const on = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);

  const isMobile = typeof document !== 'undefined' && document.body?.classList?.contains('sb-mobile');
  if (isMobile || dims.w < minWidth || dims.h < minHeight) return null;

  return (
    <div className="modal-ad" style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, margin: '4px 0 10px' }}>
      <Ad screenW={dims.w} screenH={dims.h} types={[[728, 90]]} horizThresh={0.2} placement={placement} />
    </div>
  );
}
