import React from 'react';
import { ReactComponent as Frame1 } from './frames/frame_1.svg';
import { ReactComponent as Frame2 } from './frames/frame_2.svg';
import { ReactComponent as Frame3 } from './frames/frame_3.svg';
import { ReactComponent as Frame4 } from './frames/frame_4.svg';
import { ReactComponent as Frame5 } from './frames/frame_5.svg';
import { getIconRecolorFilter } from './constants';

const frames: Record<number, React.FC<React.SVGProps<SVGSVGElement>>> = {
  1: Frame1, 2: Frame2, 3: Frame3, 4: Frame4, 5: Frame5,
};

const iconsBase = 'assets/game/clans/icons/';

interface ClanEmblemProps {
  frameId: number;
  iconId: number;
  frameColor: string;
  iconColor?: string;
  size?: number;
}

export default function ClanEmblem({ frameId, iconId, frameColor, iconColor, size = 64 }: ClanEmblemProps) {
  const Frame = frames[frameId] ?? frames[1];
  const iconFilter = iconColor ? getIconRecolorFilter(iconId, iconColor) : undefined;
  return (
    <div
      className="clan-emblem"
      style={{
        position: 'relative',
        width: size,
        height: size,
        color: frameColor,
        display: 'inline-block',
        flexShrink: 0,
      }}
    >
      <Frame
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '22%',
          pointerEvents: 'none',
        }}
      >
        <img
          src={`${iconsBase}icon_${iconId}.png`}
          alt=""
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
          style={{
            width: '65%',
            height: '65%',
            objectFit: 'contain',
            filter: iconFilter,
          }}
        />
      </div>
    </div>
  );
}
