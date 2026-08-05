import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectAccount } from '../../redux/account/selector';
import { setAccount } from '../../redux/account/slice';
import api from '../../api';
import StyledName from '../StyledName';
import {
  NameStyle,
  ColorValue,
  OutlineWidth,
  resolveNameStyle,
  registryEntryToCode,
  CLAN_COLOR,
  PRESET_LOGGED_OUT,
  PRESET_LOGGED_IN,
} from '../../game/nameStyles';
import PlayerPreview from './PlayerPreview';
import '../game/Leaderboard.scss';
import './NameMaker.scss';

type Mode = 'solid' | 'gradient';
type Dir = 'vertical' | 'horizontal' | 'diag1' | 'diag2';
const dirAngle: Record<Dir, number> = { vertical: 180, horizontal: 90, diag1: 135, diag2: 225 };

interface Channel {
  mode: Mode;
  solid: string;
  g0: string;
  g1: string;
  dir: Dir;
}
interface StyleState {
  fill: Channel;
  outline: Channel;
  outlineOn: boolean;
  outlineW: OutlineWidth;
  shadow: Channel;
  shadowOn: boolean;
}

const newChannel = (color = '#ffffff'): Channel => ({
  mode: 'solid',
  solid: color,
  g0: color,
  g1: '#ff00ff',
  dir: 'vertical',
});

const channelToColor = (ch: Channel): ColorValue =>
  ch.mode === 'solid'
    ? ch.solid
    : {
        type: 'linear',
        angle: dirAngle[ch.dir],
        stops: [
          { color: ch.g0, pos: 0 },
          { color: ch.g1, pos: 1 },
        ],
      };

function angleToDir(angle: number): Dir {
  const a = ((angle % 360) + 360) % 360;
  const opts: [Dir, number][] = [
    ['vertical', 180],
    ['horizontal', 90],
    ['diag1', 135],
    ['diag2', 225],
  ];
  let best: Dir = 'vertical';
  let bd = 999;
  for (const [d, v] of opts) {
    const diff = Math.min(Math.abs(a - v), 360 - Math.abs(a - v));
    if (diff < bd) { bd = diff; best = d; }
  }
  return best;
}

function colorToChannel(c: ColorValue | null | undefined, fallback = '#ffffff'): Channel {
  if (!c) return newChannel(fallback);
  if (typeof c === 'string') return newChannel(c);
  const stops = [...c.stops].sort((a, b) => a.pos - b.pos);
  return {
    mode: 'gradient',
    solid: stops[0]?.color || fallback,
    g0: stops[0]?.color || fallback,
    g1: stops[stops.length - 1]?.color || fallback,
    dir: angleToDir(c.angle),
  };
}

const stateToNameStyle = (s: StyleState): NameStyle => ({
  fill: channelToColor(s.fill),
  outline: s.outlineOn ? channelToColor(s.outline) : null,
  outlineWidth: s.outlineOn ? s.outlineW : undefined,
  shadow: s.shadowOn ? channelToColor(s.shadow) : null,
});

const nameStyleToState = (ns: NameStyle): StyleState => ({
  fill: colorToChannel(ns.fill, '#ffffff'),
  outline: colorToChannel(ns.outline, '#000000'),
  outlineOn: !!ns.outline,
  outlineW: ns.outlineWidth || 'thin',
  shadow: colorToChannel(ns.shadow, '#000000'),
  shadowOn: !!ns.shadow,
});

function randomNickname(): string {
  const consonants = 'bcdfghjklmnprstvwxyz'.split('');
  const vowels = 'aeiou'.split('');
  const pairs = 2 + Math.floor(Math.random() * 4);
  let code = '';
  for (let i = 0; i < pairs; i++) {
    code += consonants[Math.floor(Math.random() * consonants.length)];
    code += vowels[Math.floor(Math.random() * vowels.length)];
  }
  return code[0].toUpperCase() + code.slice(1);
}

const formatScore = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;

function ColorControl({ ch, onChange }: { ch: Channel; onChange: (c: Channel) => void }) {
  return (
    <>
      <div className="nm-row">
        <label>
          <input type="radio" checked={ch.mode === 'solid'} onChange={() => onChange({ ...ch, mode: 'solid' })} /> Solid
        </label>
        <label>
          <input type="radio" checked={ch.mode === 'gradient'} onChange={() => onChange({ ...ch, mode: 'gradient' })} /> Gradient
        </label>
      </div>
      {ch.mode === 'solid' ? (
        <div className="nm-row">
          <span>Colour</span>
          <input type="color" value={ch.solid} onChange={(e) => onChange({ ...ch, solid: e.target.value })} />
        </div>
      ) : (
        <>
          <div className="nm-row">
            <span>From</span>
            <input type="color" value={ch.g0} onChange={(e) => onChange({ ...ch, g0: e.target.value })} />
            <span>To</span>
            <input type="color" value={ch.g1} onChange={(e) => onChange({ ...ch, g1: e.target.value })} />
          </div>
          <div className="nm-row">
            <span>Direction</span>
            <select value={ch.dir} onChange={(e) => onChange({ ...ch, dir: e.target.value as Dir })}>
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
              <option value="diag1">Diagonal ↘</option>
              <option value="diag2">Diagonal ↙</option>
            </select>
          </div>
        </>
      )}
    </>
  );
}

function StyleControls({ state, onChange }: { state: StyleState; onChange: (s: StyleState) => void }) {
  const set = (patch: Partial<StyleState>) => onChange({ ...state, ...patch });
  return (
    <div className="nm-style-controls">
      <div className="nm-subsection">
        <div className="nm-sublabel">Name colour</div>
        <ColorControl ch={state.fill} onChange={(c) => set({ fill: c })} />
      </div>
      <div className="nm-subsection">
        <label className="nm-sublabel">
          <input type="checkbox" checked={state.outlineOn} onChange={(e) => set({ outlineOn: e.target.checked })} /> Outline
        </label>
        {state.outlineOn && (
          <>
            <div className="nm-row">
              <span>Thickness</span>
              <select value={state.outlineW} onChange={(e) => set({ outlineW: e.target.value as OutlineWidth })}>
                <option value="thin">Thin</option>
                <option value="medium">Medium</option>
                <option value="thick">Thick</option>
              </select>
            </div>
            <ColorControl ch={state.outline} onChange={(c) => set({ outline: c })} />
          </>
        )}
      </div>
      <div className="nm-subsection">
        <label className="nm-sublabel">
          <input type="checkbox" checked={state.shadowOn} onChange={(e) => set({ shadowOn: e.target.checked })} /> Shadow
        </label>
        {state.shadowOn && <ColorControl ch={state.shadow} onChange={(c) => set({ shadow: c })} />}
      </div>
    </div>
  );
}

interface Row {
  key: string;
  name: string;
  clan?: string;
  account: boolean;
  self?: boolean;
  score: number;
}

function LeaderboardPreview({
  bots,
  selfName,
  selfClan,
  selfStyle,
}: {
  bots: string[];
  selfName: string;
  selfClan: string;
  selfStyle: NameStyle;
}) {
  const rows: Row[] = [
    { key: 'p1', name: 'Player1', clan: 'CLAN', account: true, score: 2_450_000 },
    { key: 'p2', name: 'Player2', clan: 'TAG', account: true, score: 1_980_000 },
    { key: 'p3', name: 'Player3', account: true, score: 1_540_000 },
    { key: 'p4', name: 'Player4', account: true, score: 1_210_000 },
    ...bots.map((n, i) => ({ key: `b${i}`, name: n, account: false, score: 980_000 - i * 150_000 })),
    { key: 'self', name: selfName || 'Player', clan: selfClan || undefined, account: true, self: true, score: 742_000 },
  ].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div className="nm-lb-backdrop">
      <div className="leaderboard">
        <div className="lb-header open">
          <span className="lb-arrow">▼</span>
          <span className="lb-title">Leaderboard</span>
          <span className="lb-arrow">▼</span>
        </div>
        <div className="lb-list">
          {rows.map((r, i) => {
            const style = r.self ? selfStyle : resolveNameStyle(r.name, r.account, 'leaderboard');
            return (
              <div className={`lb-row ${r.self ? 'self' : ''}`} key={r.key}>
                <span className="lb-place">{i + 1}</span>
                <span className="lb-name" style={{ fontSize: 17 }}>
                  {r.clan && <span className="lb-clan" style={{ color: CLAN_COLOR }}>[{r.clan}] </span>}
                  <StyledName name={r.name} style={style} fontSize={17} />
                </span>
                <span className="lb-score">{formatScore(r.score)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function NameMaker() {
  useEffect(() => { document.title = 'SB Name Maker'; }, []);
  const dispatch = useDispatch();
  const account: any = useSelector(selectAccount);

  const [name, setName] = useState('Player');
  const [clan, setClan] = useState('');
  const nameEdited = useRef(false);
  const [bots] = useState(() => Array.from({ length: 5 }, randomNickname));

  const [lbState, setLbState] = useState<StyleState>(() => nameStyleToState(PRESET_LOGGED_OUT.leaderboard));
  const [gameState, setGameState] = useState<StyleState>(() => nameStyleToState(PRESET_LOGGED_OUT.game));

  useEffect(() => {
    if (account?.isLoggedIn) return;
    let secret: string | null = null;
    try { secret = localStorage.getItem('secret'); } catch (e) {}
    if (!secret || secret === 'undefined' || secret === 'null') return;
    api.post(`${api.endpoint}/auth/loginWithSecret`, null, (data: any) => {
      if (data?.account) {
        data.account.secret = data.secret;
        dispatch(setAccount(data.account));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!nameEdited.current && account?.isLoggedIn && account.username) {
      setName(account.username);
    }
    if (account?.isLoggedIn && account.clan) {
      const tag = typeof account.clan === 'object' ? account.clan.clan?.tag || account.clan.tag : account.clan;
      if (tag) setClan(String(tag).toUpperCase());
    }
  }, [account?.isLoggedIn, account?.username, account?.clan]);

  const applyPreset = (preset: { leaderboard: NameStyle; game: NameStyle }) => {
    setLbState(nameStyleToState(preset.leaderboard));
    setGameState(nameStyleToState(preset.game));
  };

  const lbStyle = useMemo(() => stateToNameStyle(lbState), [lbState]);
  const gameStyle = useMemo(() => stateToNameStyle(gameState), [gameState]);
  const skinId = account?.isLoggedIn ? (account.skins?.equipped ?? 1) : 1;

  const registryCode = useMemo(
    () => registryEntryToCode(name || 'name', lbStyle, gameStyle),
    [name, lbStyle, gameStyle],
  );
  const [copied, setCopied] = useState(false);
  const copyCode = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(registryCode).then(done).catch(done);
      else done();
    } catch (e) { done(); }
  };

  return (
    <div className="namemaker">
      <h1>Name Maker</h1>
      <p className="nm-sub">
        <Link to="/">Back to game</Link>
      </p>

      <div className="nm-section nm-shared">
        <div className="nm-row">
          <label>Name</label>
          <input
            type="text"
            value={name}
            maxLength={20}
            placeholder="Enter name..."
            onChange={(e) => { nameEdited.current = true; setName(e.target.value); }}
          />
          <label>Clan tag</label>
          <input
            type="text"
            value={clan}
            maxLength={5}
            placeholder="(optional)"
            onChange={(e) => setClan(e.target.value)}
          />
        </div>
        <div className="nm-row nm-preset-btns">
          <button onClick={() => applyPreset(PRESET_LOGGED_OUT)}>Logged out preset</button>
          <button onClick={() => applyPreset(PRESET_LOGGED_IN)}>Logged in preset</button>
        </div>
      </div>

      <div className="nm-columns">
        <div className="nm-preview-block">
          <h3>Leaderboard</h3>
          <StyleControls state={lbState} onChange={setLbState} />
          <LeaderboardPreview bots={bots} selfName={name} selfClan={clan} selfStyle={lbStyle} />
        </div>

        <div className="nm-preview-block">
          <h3>In-game</h3>
          <StyleControls state={gameState} onChange={setGameState} />
          <PlayerPreview name={name} clan={clan} nameStyle={gameStyle} skinId={skinId} />
          <p className="nm-hint">
            {account?.isLoggedIn ? ' Using your equipped skin' : ' Log in in the game to preview your equipped skin'}
          </p>
        </div>
      </div>

      <div className="nm-section nm-codegen">
        <div className="nm-sublabel">Special name code</div>
        <p className="nm-hint">
          nameStyles.ts
        </p>
        <textarea className="nm-code" readOnly rows={6} value={registryCode} onFocus={(e) => e.currentTarget.select()} />
        <div className="nm-row">
          <button onClick={copyCode}>{copied ? 'Copied!' : 'Copy code'}</button>
        </div>
      </div>
    </div>
  );
}
