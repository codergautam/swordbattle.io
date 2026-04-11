import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../redux/store';
import { postChat } from '../../../../redux/clans/slice';
import { clanChatMaxLength } from '../constants';
import cosmetics from '../../../../game/cosmetics.json';

const skinBase = 'assets/game/player/';
const sendCooldownMs = 1500;
const dividerGapMs = 60 * 60 * 1000;

function dividerLabel(date: Date): string {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  if (wasYesterday) return `Yesterday ${time}`;
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (daysAgo < 7) {
    return `${date.toLocaleDateString([], { weekday: 'long' })} ${time}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const skinUrlCache: Record<number, string> = {};
function skinImage(skinId: number | null): string | null {
  if (skinId == null) return null;
  if (skinUrlCache[skinId]) return skinUrlCache[skinId];
  const skin = Object.values((cosmetics as any).skins).find((s: any) => s.id === skinId) as any;
  if (!skin) return null;
  const url = `${skinBase}${skin.bodyFileName}`;
  skinUrlCache[skinId] = url;
  return url;
}

function relativeTime(date: Date, now: number): string {
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 14) return 'last week';
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

interface ChatTabProps {
  onOpenUserProfile: (username: string) => void;
}

export default function ChatTab({ onOpenUserProfile }: ChatTabProps) {
  const dispatch = useDispatch();
  const myClan = useSelector((s: RootState) => s.account.clan);
  const messages = useSelector((s: RootState) => s.clans.chat);
  const loading = useSelector((s: RootState) => s.clans.chatLoading);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const messagesRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number>(0);
  const stickToBottomRef = useRef(true);
  const lastSendTimeRef = useRef<number>(0);

  const clanId = myClan?.clan?.id ?? null;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => {
      const remaining = lastSendTimeRef.current + sendCooldownMs - Date.now();
      if (remaining <= 0) {
        setCooldownLeft(0);
        clearInterval(t);
      } else {
        setCooldownLeft(remaining);
      }
    }, 100);
    return () => clearInterval(t);
  }, [cooldownLeft > 0]);

  useEffect(() => {
    if (!messagesRef.current) return;
    const el = messagesRef.current;
    const newest = messages[messages.length - 1]?.id ?? 0;
    if (newest !== lastIdRef.current && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      lastIdRef.current = newest;
    }
  }, [messages]);

  const onScroll = () => {
    if (!messagesRef.current) return;
    const el = messagesRef.current;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };

  const send = async () => {
    if (!clanId || !input.trim() || sending) return;
    const since = Date.now() - lastSendTimeRef.current;
    if (since < sendCooldownMs) {
      setCooldownLeft(sendCooldownMs - since);
      return;
    }
    setSending(true);
    setError(null);
    lastSendTimeRef.current = Date.now();
    setCooldownLeft(sendCooldownMs);
    try {
      const res: any = await dispatch(postChat(clanId, input.trim()) as any);
      if (res?.message || res?.error) {
        setError(res?.message ?? res?.error);
      } else {
        setInput('');
      }
      stickToBottomRef.current = true;
    } finally {
      setSending(false);
    }
  };

  const messageList = useMemo(() => {
    const nodes: JSX.Element[] = [];
    let previousDate: Date | null = null;
    for (const m of messages) {
      const currentDate = new Date(m.created_at);
      if (previousDate && currentDate.getTime() - previousDate.getTime() >= dividerGapMs) {
        nodes.push(
          <div key={`divider-${m.id}`} className="clan-chat__divider">
            <span>{dividerLabel(currentDate)}</span>
          </div>
        );
      }
      previousDate = currentDate;
      const isSystem = m.accountId == null;
      if (isSystem) {
        nodes.push(
          <div key={m.id} className="clan-chat__msg clan-chat__msg--system">
            {m.content}
          </div>
        );
        continue;
      }
      const skin = skinImage(m.skinId);
      nodes.push(
        <div key={m.id} className="clan-chat__msg">
          {skin ? <img className="skin" src={skin} alt="" /> : <div className="skin" />}
          <div className="body">
            <div className="top">
              <a className="username user-link" onClick={() => m.username && onOpenUserProfile(m.username)}>
                {m.username}
              </a>
              <span className="time" title={currentDate.toLocaleString()}>
                {relativeTime(currentDate, now)}
              </span>
            </div>
            <div className="text">{m.content}</div>
          </div>
        </div>
      );
    }
    return nodes;
  }, [messages, now, onOpenUserProfile]);

  if (!clanId) return <p>You are not in a clan.</p>;

  const remaining = clanChatMaxLength - input.length;
  const canSend = !sending && !!input.trim() && cooldownLeft <= 0;

  return (
    <div className="clan-chat">
      <div className="clan-chat__messages" ref={messagesRef} onScroll={onScroll}>
        {loading && messages.length === 0 && <p style={{ color: '#888' }}>Loading messages...</p>}
        {messageList}
      </div>

      {error && <div className="clan-chat__error">{error}</div>}

      <div className="clan-chat__input">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          maxLength={clanChatMaxLength}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <span className="counter">{remaining}</span>
        <button disabled={!canSend} onClick={send}>
          {cooldownLeft > 0 ? `${(cooldownLeft / 1000).toFixed(1)}s` : 'Send'}
        </button>
      </div>
    </div>
  );
}
