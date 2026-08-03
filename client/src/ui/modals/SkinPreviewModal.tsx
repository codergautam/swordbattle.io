import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as cosmetics from '../../game/cosmetics.json';
import { updateAccountAsync } from '../../redux/account/slice';
import api from '../../api';
import { getSkinScale } from '../../game/skinScales';
import './SkinPreviewModal.scss';

const { skins } = cosmetics as any;
const playerBase = 'assets/game/player/';
const tileBase = 'assets/game/tiles/';
const evoBase = 'assets/game/evolutions/';

const swingKeys = new Set(['SPACE', 'C', 'E', 'SHIFT']);

const biomes: { key: string; label: string; img: string }[] = [
  { key: 'alpine', label: 'Alpine', img: 'alpine.jpg' },
  { key: 'grass', label: 'Grass', img: 'grass.jpg' },
  { key: 'savanna', label: 'Savanna', img: 'savanna.jpg' },
  { key: 'desert', label: 'Desert', img: 'desert.png' },
  { key: 'snow', label: 'Snow', img: 'ice-new.png' },
];
const defaultBg = 'grass.jpg';

type Evo = { name: string; img: string; scale: number; origin: [number, number] };
const evolutions: Evo[] = [
  { name: 'Tank', img: 'tank.png', scale: 1, origin: [0.5, 0.55] },
  { name: 'Knight', img: 'knight.png', scale: 1.09, origin: [0.5, 0.53] },
  { name: 'Berserker', img: 'berserker.png', scale: 1.18, origin: [0.47, 0.6] },
  { name: 'Vampire', img: 'vampire.png', scale: 1.09, origin: [0.5, 0.53] },
  { name: 'Rook', img: 'rook.png', scale: 1.09, origin: [0.5, 0.53] },
  { name: 'Samurai', img: 'samurai.png', scale: 1.09, origin: [0.5, 0.53] },
  { name: 'Archer', img: 'archer.png', scale: 1.09, origin: [0.49, 0.5] },
  { name: 'Defender', img: 'defender.png', scale: 1.4535, origin: [0.5, 0.53] },
  { name: 'Warrior', img: 'warrior.png', scale: 1.09, origin: [0.5, 0.53] },
  { name: 'Lumberjack', img: 'lumberjack.png', scale: 1.09, origin: [0.5, 0.53] },
  { name: 'Fighter', img: 'fighter.png', scale: 1.2717, origin: [0.5, 0.53] },
  { name: 'Fisherman', img: 'fisherman.png', scale: 1.09, origin: [0.5, 0.53] },
  { name: 'Stalker', img: 'stalker.png', scale: 1.09, origin: [0.5, 0.53] },
  { name: 'Butcher', img: 'butcher.png', scale: 1.4535, origin: [0.5, 0.53] },
  { name: 'Disco', img: 'disco.png', scale: 1.4535, origin: [0.5, 0.53] },
  { name: 'Juggernaut', img: 'juggernaut.png', scale: 1.09, origin: [0.5, 0.53] },
  { name: 'Sniper', img: 'sniper.png', scale: 1.4535, origin: [0.5, 0.53] },
  { name: 'Archergod', img: 'superarcher.png', scale: 1.09, origin: [0.49, 0.5] },
];

const swingArcDeg = (-Math.PI / 3) * (180 / Math.PI);
const swingDurationMs = 150;

const shadowScale = 1.07;
const shadowAlpha = 0.17;
const shadowShiftPct = 1.8;

function overlayStyle(evo: Evo, shadow: boolean): React.CSSProperties {
  const s = evo.scale * (shadow ? shadowScale : 1);
  const [ox, oy] = evo.origin;
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `${s * 100}%`,
    height: 'auto',
    transformOrigin: `${ox * 100}% ${oy * 100}%`,
    transform: `translate(${-ox * 100}%, ${-oy * 100}%) rotate(-90deg)`,
  };
}

function SkinPreviewStage({ body, sword, scale, bg, evo }: { body: string; sword: string; scale: number; bg: string; evo: Evo | null }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const swordWrapRef = useRef<HTMLDivElement>(null);
  const shadowPlayerRef = useRef<HTMLDivElement>(null);
  const shadowSwordWrapRef = useRef<HTMLDivElement>(null);
  const mouse = useRef<{ x: number; y: number; has: boolean }>({ x: 0, y: 0, has: false });
  const held = useRef<Set<string>>(new Set());
  const raising = useRef(false);
  const progress = useRef(0);
  const rafRef = useRef<number>(0);

  const press = useCallback((id: string) => { held.current.add(id); }, []);
  const release = useCallback((id: string) => { held.current.delete(id); }, []);

  useEffect(() => {
    let last = 0;
    const loop = (t: number) => {
      const dt = last ? t - last : 16; last = t;

      const stage = stageRef.current;
      let aimDeg = 90;
      if (stage && mouse.current.has) {
        const r = stage.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        aimDeg = Math.atan2(mouse.current.y - cy, mouse.current.x - cx) * 180 / Math.PI;
      }
      const aimTf = `translate(-50%, -50%) rotate(${aimDeg}deg)`;
      if (playerRef.current) playerRef.current.style.transform = aimTf;
      if (shadowPlayerRef.current) shadowPlayerRef.current.style.transform = aimTf;

      const isHeld = held.current.size > 0;
      if (isHeld && !raising.current && progress.current === 0) raising.current = true;
      if (raising.current) {
        progress.current = Math.min(1, progress.current + dt / swingDurationMs);
        if (progress.current >= 1) raising.current = false;
      } else if (!isHeld && progress.current > 0) {
        progress.current = Math.max(0, progress.current - dt / swingDurationMs);
      }
      const swingTf = `rotate(${swingArcDeg * progress.current}deg)`;
      if (swordWrapRef.current) swordWrapRef.current.style.transform = swingTf;
      if (shadowSwordWrapRef.current) shadowSwordWrapRef.current.style.transform = swingTf;

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY, has: true }; };
    const onDown = (e: MouseEvent) => { if (e.button === 0 || e.button === 2) press('mouse'); };
    const onUp = () => release('mouse');
    const onCtx = (e: MouseEvent) => e.preventDefault();
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTyping()) return;
      const k = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();
      if (swingKeys.has(k)) { if (k === 'SPACE') e.preventDefault(); press(k); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();
      if (swingKeys.has(k)) release(k);
    };
    const onBlur = () => held.current.clear();

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('contextmenu', onCtx);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('contextmenu', onCtx);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [press, release]);

  const bodyTf = `rotate(-90deg) scale(${scale})`;
  const bodyShTf = `rotate(-90deg) scale(${scale * shadowScale})`;
  const swordTf = `translate(50%, 50%) rotate(45deg)`;
  const swordShTf = `translate(50%, 50%) rotate(45deg) scale(${shadowScale})`;

  return (
    <div className="sps-stage" ref={stageRef}>
      <div className="sps-bg" style={{ backgroundImage: `url(${tileBase}${bg})` }} />

      <div className="sps-shadowlayer" style={{ transform: `translateY(${shadowShiftPct}%)` }}>
        <div className="sps-player" ref={shadowPlayerRef}>
          <div className="sps-swordwrap" ref={shadowSwordWrapRef}>
            <img className="sps-sword-sh" src={playerBase + sword} alt="" draggable={false} style={{ transform: swordShTf }} />
          </div>
          <img className="sps-body-sh" src={playerBase + body} alt="" draggable={false} style={{ transform: bodyShTf }} />
          {evo && <img className="sps-overlay-sh" src={evoBase + evo.img} alt="" draggable={false} style={overlayStyle(evo, true)} />}
        </div>
      </div>

      <div className="sps-player sps-player-main" ref={playerRef}>
        <div className="sps-swordwrap" ref={swordWrapRef}>
          <img className="sps-sword" src={playerBase + sword} alt="" draggable={false} style={{ transform: swordTf }} />
        </div>
        <img className="sps-body" src={playerBase + body} alt="" draggable={false} style={{ transform: bodyTf }} />
        {evo && <img className="sps-overlay" src={evoBase + evo.img} alt="" draggable={false} style={overlayStyle(evo, false)} />}
      </div>
    </div>
  );
}

export default function SkinPreviewModal({ skinId }: { skinId: number }) {
  const account = useSelector((s: any) => s.account);
  const dispatch = useDispatch();
  const [status, setStatus] = useState('');
  const [bg, setBg] = useState(defaultBg);
  const [evo, setEvo] = useState<Evo | null>(null);

  const evosRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = evosRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta = e.deltaY || e.deltaX;
      if (!delta) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const skin: any = Object.values(skins).find((s: any) => s.id === skinId);
  if (!skin) return null;

  const isLoggedIn: boolean = !!account?.isLoggedIn;
  const owned: boolean = !!account?.skins?.owned?.includes(skinId);
  const equipped: boolean = account?.skins?.equipped === skinId;
  const price: number = skin.price ?? 0;
  const isUlt = !!skin.ultimate;
  const isEvent = !!(skin.event || skin.eventoffsale) && !!skin.eventtag;
  const isSale = !!skin.sale;

  const currencyIcon = isUlt ? 'assets/game/ultimacy.png' : 'assets/game/gem.png';
  const currencyBal: number = isUlt ? (account?.mastery ?? 0) : (account?.gems ?? 0);
  const afford = price <= 0 || currencyBal >= price;
  const cantAfford = isLoggedIn && !afford && price > 0;

  const original: any = skin.original ? Object.values(skins).find((s: any) => s.id === skin.original) : null;
  const ownsOriginal: boolean = original ? !!account?.skins?.owned?.includes(original.id) : true;

  const buttonState = equipped ? 'equipped' : owned ? 'owned' : afford ? 'afford' : 'cantafford';
  const buttonLabel = status || (equipped ? 'Equipped' : owned ? 'Equip' : isUlt ? 'Unlock' : (price > 0 ? 'Buy' : 'Get'));

  function commit() {
    if (status || equipped || !isLoggedIn) return;
    if (account?.username?.startsWith('.') && owned) { alert('Skins cannot be equipped'); return; }
    if (!owned) {
      if (isUlt && skin.original && !ownsOriginal) {
        alert(`You need to own the "${original?.displayName ?? 'original'}" skin before you can unlock the "${skin.displayName}" skin!`);
        return;
      }
      if (!window.confirm(`Do you want to ${isUlt ? 'unlock' : 'buy'} the "${skin.displayName}" skin?`)) return;
    }
    const action = owned ? 'Equipping...' : (isUlt ? 'Unlocking...' : 'Buying...');
    setStatus(action);
    const apiPath = owned ? '/equip/' : '/buy/';
    api.post(`${api.endpoint}/profile/cosmetics/skins${apiPath}${skinId}`, null, (data: any) => {
      if (data?.error) alert(data.error);
      dispatch(updateAccountAsync() as any);
      setStatus('');
    });
  }

  return (
    <div className="skinpreview">
      <div className="sp-left">
        <div className="sp-stage-wrap">
          <SkinPreviewStage body={skin.bodyFileName} sword={skin.swordFileName} scale={getSkinScale(skinId)} bg={bg} evo={evo} />
        </div>

        <div className="sp-selectors">
          <div className="sp-selrow">
            <span className="sp-sellabel">Biome</span>
            <div className="sp-biomes">
              {biomes.map((b) => (
                <button
                  key={b.key}
                  className={`sp-biome ${bg === b.img ? 'active' : ''}`}
                  style={{ backgroundImage: `url(${tileBase}${b.img})` }}
                  title={b.label}
                  onClick={() => setBg(b.img)}
                />
              ))}
            </div>
          </div>

          <div className="sp-selrow">
            <span className="sp-sellabel">Evolution</span>
            <div className="sp-evos" ref={evosRef}>
              <button className={`sp-evo sp-evo-none ${!evo ? 'active' : ''}`} title="None" onClick={() => setEvo(null)}>None</button>
              {evolutions.map((e) => (
                <button
                  key={e.name}
                  className={`sp-evo ${evo?.name === e.name ? 'active' : ''}`}
                  title={e.name}
                  onClick={() => setEvo(e)}
                >
                  <img src={evoBase + e.img} alt={e.name} draggable={false} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="sp-right">
        <div className="sp-info">
          <h1 className="sp-name">{skin.displayName}</h1>

          <div className="sp-tags">
            {isUlt && skin.tag && <span className="sp-tag sp-tag-ult">{skin.tag}</span>}
            {isEvent && <span className="sp-tag sp-tag-event">EVENT SKIN: {skin.eventtag}</span>}
            {isSale && <span className="sp-tag sp-tag-sale">ON SALE{skin.saletag ? `: ${skin.saletag}` : ''}</span>}
          </div>
          {isUlt && original && (
            <div className={`sp-unlock-hint ${ownsOriginal ? 'owned' : 'missing'}`}>
              Buy the {original.displayName} skin first to unlock
            </div>
          )}

          {skin.description && <p className="sp-desc">&ldquo;{skin.description}&rdquo;</p>}
        </div>

        <div className="sp-bottom">
          <div className="sp-have">
            You have:
            <span className="sp-have-cur">{currencyBal.toLocaleString()}<img src={currencyIcon} alt="" width={18} height={18} /></span>
            {skin.tokenprice ? (
              <span className="sp-have-cur">{(account?.tokens ?? 0).toLocaleString()}<img src="assets/game/snowtoken.png" alt="" width={18} height={18} /></span>
            ) : null}
          </div>

          <div className="sp-buyrow">
            <div className="sp-price">
              {price > 0 ? (
                <>
                  {isSale && skin.ogprice ? <span className="sp-ogprice">{skin.ogprice}</span> : null}
                  <span className={`sp-price-val ${cantAfford ? 'red' : ''}`}>{price.toLocaleString()}</span>
                  <img src={currencyIcon} alt="" width={26} height={26} />
                  {skin.tokenprice ? (
                    <>
                      <span className="sp-price-val">{skin.tokenprice.toLocaleString()}</span>
                      <img src="assets/game/snowtoken.png" alt="" width={26} height={26} />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="sp-price-val">{isUlt ? '0' : (skin.buyable ? 'Free' : '—')}</span>
                  {isUlt && <img src={currencyIcon} alt="" width={26} height={26} />}
                </>
              )}
            </div>

            {isLoggedIn ? (
              <button className={`sp-buy buy-${buttonState}`} onClick={commit} disabled={equipped || !!status}>
                {buttonLabel}
              </button>
            ) : (
              <span className="sp-login-note">Log in to {isUlt ? 'unlock' : 'buy'}!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
