import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../redux/store';
import { fetchChatHistory, postChat } from '../../../../redux/clans/slice';
import { clanChatMaxLength } from '../constants';
import cosmetics from '../../../../game/cosmetics.json';

const skinBase = 'assets/game/player/';
const pollIntervalMs = 3000;

function skinImage(skinId: number | null): string | null {
  if (skinId == null) return null;
  const skin = Object.values((cosmetics as any).skins).find((s: any) => s.id === skinId) as any;
  return skin ? `${skinBase}${skin.bodyFileName}` : null;
}

export default function ChatTab() {
  const dispatch = useDispatch();
  const myClan = useSelector((s: RootState) => s.account.clan);
  const messages = useSelector((s: RootState) => s.clans.chat);
  const loading = useSelector((s: RootState) => s.clans.chatLoading);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number>(0);
  const stickToBottomRef = useRef(true);

  const clanId = myClan?.clan?.id ?? null;

  useEffect(() => {
    if (!clanId) return;
    dispatch(fetchChatHistory(clanId) as any);
    const interval = setInterval(() => {
      dispatch(fetchChatHistory(clanId) as any);
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [dispatch, clanId]);

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
    setSending(true);
    try {
      const res: any = await dispatch(postChat(clanId, input.trim()) as any);
      if (res?.message || res?.error) alert(res?.message ?? res?.error);
      else setInput('');
      stickToBottomRef.current = true;
    } finally {
      setSending(false);
    }
  };

  if (!clanId) return <p>You are not in a clan.</p>;

  const remaining = clanChatMaxLength - input.length;

  return (
    <div className="clan-chat">
      <div className="clan-chat__messages" ref={messagesRef} onScroll={onScroll}>
        {loading && messages.length === 0 && <p style={{ color: '#888' }}>Loading messages...</p>}
        {messages.map((m) => {
          const isSystem = m.accountId == null;
          if (isSystem) {
            return (
              <div key={m.id} className="clan-chat__msg clan-chat__msg--system">
                {m.content}
              </div>
            );
          }
          const skin = skinImage(m.skinId);
          return (
            <div key={m.id} className="clan-chat__msg">
              {skin ? <img className="skin" src={skin} alt="" /> : <div className="skin" />}
              <div className="body">
                <div className="top">
                  <span className="username">{m.username}</span>
                  <span className="time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text">{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>

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
        <button disabled={sending || !input.trim()} onClick={send}>Send</button>
      </div>
    </div>
  );
}
