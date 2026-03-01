import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AccountState, setAccount, updateAccountAsync } from '../../redux/account/slice';
import { Settings, settingsList } from '../../game/Settings';
import api from '../../api';
import * as cosmetics from '../../game/cosmetics.json'

import './LeaderboardModal.scss'
import { buyFormats, numberWithCommas, sinceFrom } from '../../helpers';
import { Id } from '@reduxjs/toolkit/dist/tsHelpers';
let { skins } = cosmetics;

const basePath = 'assets/game/player/';

function abbrNumber(n: number | string) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) {
    const v = +(num / 1_000_000).toFixed(1);
    return (v % 1 === 0 ? v.toFixed(0) : v.toString()) + 'm';
  }
  if (num >= 1_000) {
    const v = +(num / 1_000).toFixed(1);
    return (v % 1 === 0 ? v.toFixed(0) : v.toString()) + 'k';
  }
  return num.toString();
}

function timeSinceShort(dateLike?: string | Date | null) {
  if (!dateLike) return 'unknown';
  const d = new Date(dateLike).getTime();
  if (isNaN(d)) return 'unknown';
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '<1min';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

interface LeaderboardModalProps {
  account: AccountState;
}

interface Skin {
  name: string;
  displayName: string;
  id: number;
  buyable: boolean;
  swordFileName: string;
  bodyFileName: string;
  price?: number;
  description?: string;

  og: boolean;

  ultimate: boolean;
  tag: string;
  original?: number;
  
  event: boolean;
  eventoffsale: boolean;
  eventtag: string;
  
  sale: boolean;
  saletag: string;
  ogprice?: number;

  currency?: boolean;
}

const rotate = false;

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ account }) => {
  const dispatch = useDispatch();
  const [skinStatus, setSkinStatus] = useState<{ [id: number]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [skinCounts, setSkinCounts] = useState<{ [id: number]: number }>({});
  const [selectedBadge, setSelectedBadge] = useState('norm');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // title synced from iframe
  const [leaderboardTitle, setLeaderboardTitle] = useState('Leaderboard');

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'leaderboard-type' && typeof e.data.title === 'string') {
        setLeaderboardTitle(e.data.title);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // username search
  const [usernameSearch, setUsernameSearch] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!usernameSearch || usernameSearch.trim().length === 0) {
      setSearchSuggestions([]);
      setSearching(false);
      return;
    }
    const q = usernameSearch.trim();
    setSearching(true);
    const timeout = setTimeout(() => {
      api.post(`${api.endpoint}/profile/search?${Date.now()}`, { q, limit: 25 }, (res: any) => {
        if (!Array.isArray(res)) {
          setSearchSuggestions([]);
          setSearching(false);
          return;
        }
        setSearchSuggestions(res.slice(0, 25));
        setSearching(false);
      });
    }, 250);
    return () => {
      clearTimeout(timeout);
      setSearching(false);
    };
  }, [usernameSearch]);

  const navigateToProfile = (username: string) => {
    setShowSuggestions(false);
    setUsernameSearch('');
    if (iframeRef.current) {
      iframeRef.current.src = `#/profile?username=${encodeURIComponent(username)}`;
    }
  };

  const [showUltimate, setUltimate] = useState(Settings.showUltimate);
  const [showEvent, setEvent] = useState(Settings.showEvent);
  const [showOG, setOG] = useState(Settings.showOG);
  const [skinSort, setSkinSort] = useState(Settings.skinSort);

  const updateUltimate = (value: any) => {
    setUltimate(value);
    Settings.showUltimate = value;
  }
  const updateEvent = (value: any) => {
    setEvent(value);
    Settings.showEvent = value;
  }
  const updateOG = (value: any) => {
    setOG(value);
    Settings.showOG = value;
  }
  const updateSkinSort = (value: any) => {
    setSkinSort(value);
    Settings.skinSort = value;
  }

  const sortSkins = (a: Skin, b: Skin) => {
    const priceA = a.og ? 0 : (a.price ?? 0);
    const priceB = b.og ? 0 : (b.price ?? 0);

    switch (skinSort) {
      case "low":
        return priceA - priceB;
      case "high":
        return priceB - priceA;
      case "name":
        return a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase());
      default:
        return 0;
    }
  };



  const skinRefs = useRef<(HTMLImageElement | null)[]>(new Array(Object.keys(skins).length).fill(null));
  // const swordRefs = useRef<(HTMLImageElement | null)[]>(new Array(Object.keys(skins).length).fill(null));

  const highlightSearchTerm = (text: string, term: string) => {
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  };

  const assignRef = useCallback((element: HTMLImageElement, index: number) => {
    skinRefs.current[index] = element;
  }, []);
  
  const [equippedSkinId, setEquippedSkinId] = useState<number | null>(account.skins.equipped ?? null);

  useEffect(() => {
    setEquippedSkinId(account.skins.equipped ?? null);
  }, [account.skins.equipped]);

  function accountHasBan() {
    return account?.isLoggedIn && account?.username?.startsWith(".");
  }

  function handleActionClick(id: number) {
    if (skinStatus[id]) return;

    if (accountHasBan() && equippedSkinId !== id && account.skins.owned.includes(id)) {
      alert("Skins cannot be equipped");
      return;
    }

    if (equippedSkinId === id) return; // Already equipped

    const isOwned = account.skins.owned.includes(id);
    const actionText = isOwned ? 'Equipping...' : 'Getting...';

    setEquippedSkinId(id);

    setSkinStatus(prev => ({
      ...prev,
      [id]: actionText,
      ...(equippedSkinId !== null ? { [equippedSkinId]: 'Equip' } : {})
    }));

    const apiPath = isOwned ? '/equip/' : '/buy/';
    api.post(`${api.endpoint}/profile/cosmetics/skins${apiPath}${id}`, null, (data) => {
      if (data.error) {
        alert(data.error);
        setSkinStatus(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        setEquippedSkinId(account.skins.equipped ?? null);
        return;
      }

      dispatch(updateAccountAsync() as any).then(() => {
        setSkinStatus({ [id]: 'Equipped' });
        setEquippedSkinId(id);
      });
    });
  }

  useEffect(() => {
    const handleMouseMove = (event: any) => {
      skinRefs.current.forEach((skinRef, index) => {


        // const swordRef = swordRefs.current[index];
        if (skinRef) {
          const skinRect = skinRef.getBoundingClientRect();
          // const swordRect = swordRef.getBoundingClientRect();

          const { left, top, width, height } = skinRect;
          const x = (left + width / 2);
          const y = (top + height / 2);
          let rad = Math.atan2(event.clientX - x, event.clientY - y);
          let degree = rad * (180 / Math.PI) * -1;

          skinRef.style.transform = `rotate(${degree}deg)`;

        //   const skinCenterX = skinRect.left + skinRect.width / 2;
        //   const skinCenterY = skinRect.top + skinRect.height / 2;

        //    rad = Math.atan2(event.clientX - skinCenterX, event.clientY - skinCenterY);
        //    degree = rad * (180 / Math.PI) * -1 + 140;

        //    const skinRadius = 300; // Adjust as needed
        // const leftOffset = 200; // Adjust as needed
        // const translateX = skinRadius * Math.sin(rad) - leftOffset;
        // const translateY = skinRadius * Math.cos(rad);

        // swordRef.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${degree}deg)`;
        }
      });
    };

    const modal = document.querySelector('.leaderboard-modal');
    if (!modal) return;
    if(rotate) {
    modal.addEventListener('mousemove', handleMouseMove);
    }

    // Fetch skin counts
      api.get(`${api.endpoint}/profile/skins/buys?${Date.now()}`, (data) => {
        if (data.error) return alert('Error fetching skin cnts '+ data.error);
        setSkinCounts(data);
      });

    return () => {
      if (modal && rotate) {
        modal.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  const targetParentRef = useRef<HTMLDivElement>(null);
  const targetElementRef1 = useRef<HTMLDivElement>(null);

  const scrollToTarget = () => {
    if (targetParentRef.current && targetElementRef1.current) {
      targetElementRef1.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error("Target element not found");
    }
  };

  const targetElementRef2 = useRef<HTMLDivElement>(null);

  const scrollToTarget2 = () => {
    if (targetParentRef.current && targetElementRef2.current) {
      targetElementRef2.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error("Target element not found");
    }
  };

  const targetElementRef3 = useRef<HTMLDivElement>(null);

  const scrollToTarget3 = () => {
    if (targetParentRef.current && targetElementRef3.current) {
      targetElementRef3.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error("Target element not found");
    }
  };

  const targetElementRef4 = useRef<HTMLDivElement>(null);

  const scrollToTarget4 = () => {
    if (targetParentRef.current && targetElementRef4.current) {
      targetElementRef4.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error("Target element not found");
    }
  };

  const targetElementRef5 = useRef<HTMLDivElement>(null);

  const scrollToTarget5 = () => {
    if (targetParentRef.current && targetElementRef5.current) {
      targetElementRef5.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error("Target element not found");
    }
  };

  return (
    <div className="leaderboard-modal">
      <div className="leaderboard-header">
        <h1 className='shop-title'>{leaderboardTitle}</h1>
        <div className="leaderboard-search">
          <input
            type="text"
            placeholder="Search for players..."
            value={usernameSearch}
            onChange={(e) => { setUsernameSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="search-input"
            aria-label="Search usernames"
          />
          {showSuggestions && (
            <div className="search-suggestions">
              {usernameSearch.trim().length === 0 ? (
                <div className="suggestion-hint">Type to search usernames</div>
              ) : searching ? (
                <div className="suggestion-hint">Searching...</div>
              ) : searchSuggestions.length === 0 ? (
                <div className="suggestion-hint">No accounts found</div>
              ) : (
                searchSuggestions.map((s: any) => {
                  const u = s.username;
                  const createdAt = s.created_at ?? s.createdAt ?? null;
                  const lastSeen = s.last_seen ?? s.lastSeen ?? null;
                  const xp = s.xp ?? 0;
                  return (
                    <div
                      key={u}
                      className="search-suggestion"
                      onMouseDown={(ev) => { ev.preventDefault(); navigateToProfile(u); }}
                    >
                      <div className="suggestion-left">
                        <div className="suggestion-name">{u}</div>
                        <div className="suggestion-meta">
                          <span>Joined {timeSinceShort(createdAt)} ago</span>
                          {(() => {
                            const lastSeenText = timeSinceShort(lastSeen);
                            if (lastSeen && lastSeenText !== 'unknown') {
                              return <span>• Online {lastSeenText} ago</span>;
                            }
                            return null;
                          })()}
                          <span>• {xp >= 1_000_000 ? <strong>{abbrNumber(xp)} XP</strong> : `${abbrNumber(xp)} XP`}</span>
                        </div>
                      </div>
                      <div />
                    </div>
                  );
                })
              )}
              {!searching && searchSuggestions.length >= 25 && (
                <div className="search-more">... more results</div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* <p className='loadingleaderboard'>Loading...</p> */}
      <iframe ref={iframeRef} title="Leaderboard" src="#/leaderboard" width="100%" height="100%" style={{border: 'none'}}></iframe>
    </div>
  )
}

LeaderboardModal.displayName = 'LeaderboardModal';

export default LeaderboardModal;
