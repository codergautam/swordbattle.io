import gemRewardImg from '../assets/img/gem-reward.png';
import { withAssetVersion } from '../assetVersion';

const textOutline = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 0 #000';

export default function AdblockPromo({ w, h, centerOnOverflow }: { w: number; h: number; centerOnOverflow?: number }) {
  const titleSize = Math.max(13, Math.min(38, Math.round(h * 0.2)));
  const subSize = Math.round(titleSize * 0.72);
  const gemSize = Math.min(Math.round(h * 0.72), 140);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => window.alert('Turn off your ad blocker on swordbattle.io to earn 2× Gems!\n\nAds are how we keep the game free — thanks for the support.')}
      style={{
        boxSizing: 'border-box',
        width: w,
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Math.max(10, Math.round(w * 0.03)),
        padding: '0 16px',
        border: '4px solid #000',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        backgroundColor: '#4c8f34',
        backgroundImage: `url('${withAssetVersion('assets/game/tiles/alpine.jpg')}')`,
        backgroundSize: '350px',
        backgroundRepeat: 'repeat',
        fontFamily: "'Saira', sans-serif",
        transform: centerOnOverflow && centerOnOverflow < w
          ? `translateX(calc(-1 * (${w}px - ${centerOnOverflow}px) / 2))`
          : undefined,
      }}
    >
      <img
        src={gemRewardImg}
        alt=""
        style={{ width: gemSize, height: gemSize, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', color: '#fff', textShadow: textOutline, lineHeight: 1.05 }}>
        <span style={{ fontSize: titleSize, fontWeight: 800 }}>Disable your ad blocker</span>
        <span style={{ fontSize: subSize, fontWeight: 700 }}>for 2&#215; Gems</span>
      </div>
    </div>
  );
}
