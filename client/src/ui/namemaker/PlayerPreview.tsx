import { useEffect, useRef } from 'react';
import { NameStyle } from '../../game/nameStyles';
import { PixiNamePreview } from './pixiPreview';

interface PlayerPreviewProps {
  name: string;
  clan?: string;
  nameStyle: NameStyle;
  skinId: number;
  width?: number;
  height?: number;
}

export default function PlayerPreview({
  name,
  clan = '',
  nameStyle,
  skinId,
  width = 540,
  height = 440,
}: PlayerPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<PixiNamePreview | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const preview = new PixiNamePreview(hostRef.current, width, height);
    preview.setGrass('grass.jpg');
    previewRef.current = preview;
    return () => {
      preview.destroy();
      previewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { previewRef.current?.setName(name); }, [name]);
  useEffect(() => { previewRef.current?.setClan(clan); }, [clan]);
  useEffect(() => { previewRef.current?.setStyle(nameStyle); }, [nameStyle]);
  useEffect(() => { previewRef.current?.setSkin(skinId); }, [skinId]);

  return <div ref={hostRef} className="nm-pixi-host" style={{ width, height }} />;
}
