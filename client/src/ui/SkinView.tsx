import './SkinView.scss';

const base = 'assets/game/player/';

const shadowScale = 1.07;
const shadowAlpha = 0.17;
const shadowShift = 0.05;

export default function SkinView({
  body,
  sword,
  bodyRatio = 0.62,
  swordRatio = 0.62,
  offsetXRatio = -0.5,
  offsetYRatio = 0.5,
  shiftYPct = 9,
  bodyAngle = 0,
  swordAngle = 135,
  shadow = false,
  scale = 1,
}: {
  body: string;
  sword: string;
  bodyRatio?: number;
  swordRatio?: number;
  offsetXRatio?: number;
  offsetYRatio?: number;
  shiftYPct?: number;
  bodyAngle?: number;
  swordAngle?: number;
  shadow?: boolean;
  scale?: number;
}) {
  const pct = (n: number) => `${n}%`;
  const bodyLeft = 55 - bodyRatio * 50;
  const bodyTop = 35 - bodyRatio * 50 - shiftYPct;
  const offX = bodyRatio * offsetXRatio * 100;
  const offY = bodyRatio * offsetYRatio * 100;
  const swordLeft = 55 + offX - swordRatio * 50;
  const swordTop = 35 + offY - swordRatio * 50 - shiftYPct;

  const bodyShift = bodyRatio * 100 * shadowShift;
  const swordShift = swordRatio * 100 * shadowShift;

  return (
    <div className="skin-view">
      {shadow && (
        <>
          <img
            className="sv-shadow"
            src={base + sword}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            style={{ width: pct(swordRatio * 100), height: pct(swordRatio * 100), left: pct(swordLeft), top: pct(swordTop + swordShift), opacity: shadowAlpha, transform: `rotate(${swordAngle}deg) scale(${shadowScale})` }}
          />
          <img
            className="sv-shadow"
            src={base + body}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            style={{ width: pct(bodyRatio * 100), height: pct(bodyRatio * 100), left: pct(bodyLeft), top: pct(bodyTop + bodyShift), opacity: shadowAlpha, transform: `rotate(${bodyAngle}deg) scale(${shadowScale * scale})` }}
          />
        </>
      )}
      <img
        className="sv-sword"
        src={base + sword}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        style={{ width: pct(swordRatio * 100), height: pct(swordRatio * 100), left: pct(swordLeft), top: pct(swordTop), transform: `rotate(${swordAngle}deg)` }}
      />
      <img
        className="sv-body"
        src={base + body}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        style={{ width: pct(bodyRatio * 100), height: pct(bodyRatio * 100), left: pct(bodyLeft), top: pct(bodyTop), transform: `rotate(${bodyAngle}deg) scale(${scale})` }}
      />
    </div>
  );
}
