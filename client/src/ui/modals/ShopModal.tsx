import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AccountState, setAccount, updateAccountAsync } from '../../redux/account/slice';
import { Settings } from '../../game/Settings';
import api from '../../api';
import * as cosmetics from '../../game/cosmetics.json'

import './ShopModal.scss'
import SkinView from '../SkinView';
import { getSkinScale } from '../../game/skinScales';
import { buyFormats, numberWithCommas, sinceFrom } from '../../helpers';
import { Id } from '@reduxjs/toolkit/dist/tsHelpers';
let { skins } = cosmetics;

const basePath = 'assets/game/player/';

const RESET_HOUR = 23;

interface ShopModalProps {
  account: AccountState;
  onPreviewSkin?: (id: number) => void;
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

  currency: boolean;

  tokenprice: number;
}

const rotate = false;

interface SkinGridProps {
  skins: any;
  filter: (skin: Skin) => boolean;
  sort: (a: Skin, b: Skin) => number;
  searchTerm: string;
  highlightSearchTerm: (text: string, term: string) => string;
  skinCounts: { [id: number]: number };
  assignRef: (element: HTMLImageElement, index: number) => void;
  showButton?: boolean;
  account?: AccountState;
  skinStatus?: { [id: number]: string };
  onActionClick?: (id: number) => void;
  showTokenPrice?: boolean;
}

const SkinGrid: React.FC<SkinGridProps> = ({
  skins, filter, sort, searchTerm, highlightSearchTerm, skinCounts,
  assignRef, showButton, account, skinStatus, onActionClick, showTokenPrice,
}) => {
  const filtered = Object.values(skins)
    .filter((skinData: any) => filter(skinData as Skin))
    .sort((a: any, b: any) => sort(a as Skin, b as Skin));

  return (
    <div className='skins'>
      {filtered.map((skinData: any, index) => {
        const skin = skinData as Skin;
        return (
          <div className="skin-card" key={skin.name}>
            <h2 className="skin-name" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
            {skin.ultimate && <p className='skin-tag'>{skin.tag}</p>}
            {skin.sale && <p className='skin-saletag'>{skin.saletag}</p>}
            {skin.event && <p className='skin-eventtag'>{skin.eventtag}</p>}
            {skin.eventoffsale && <p className='skin-eventtag'>{skin.eventtag}</p>}

            <SkinView body={skin.bodyFileName} sword={skin.swordFileName} scale={getSkinScale(skin.id)} />
            <div className='skin-meta'>
              <span className='skin-price'>
                {(skin?.price ?? 0) > 0 ? (
                  <>
                    {skin?.sale && <span className="sale">{skin?.ogprice}</span>}
                    {skin?.price}
                    <img className={'gem'} src={skin?.ultimate ? 'assets/game/ultimacy.png' : 'assets/game/gem.png'} alt='' width={18} height={18} />
                    {showTokenPrice && skin?.tokenprice ? (
                      <> {skin.tokenprice}<img className={'gem'} src='assets/game/snowtoken.png' alt='' width={18} height={18} /></>
                    ) : null}
                  </>
                ) : (
                  skin?.ultimate
                    ? <>{skin.buyable ? '0' : ''}<img className={'gem'} src='assets/game/ultimacy.png' alt='' width={18} height={18} /></>
                    : (skin?.buyable ? 'Free' : '')
                )}
              </span>
              <span className='skin-buys'>{Object.keys(skinCounts ?? {}).length > 0 ? buyFormats(skinCounts[skin.id] ?? 0) : '...'} buys</span>
            </div>
            {showButton && (skin.buyable || account?.skins?.owned?.includes(skin.id)) && (() => {
              const owned = !!account?.skins?.owned?.includes(skin.id);
              const equipped = account?.skins?.equipped === skin.id;
              const price = skin.price ?? 0;
              const currency = skin.ultimate ? (account?.mastery ?? 0) : (account?.gems ?? 0);
              const afford = price <= 0 || currency >= price;
              const state = equipped ? 'equipped' : owned ? 'owned' : afford ? 'afford' : 'cantafford';
              return (
                <button className={`buy-button buy-${state}`} onClick={() => onActionClick?.(skin.id)}>
                  {skinStatus?.[skin.id] || (equipped ? 'Equipped' : owned ? 'Equip' : skin.ultimate ? 'Unlock' : 'Buy')}
                </button>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
};

const ShopModal: React.FC<ShopModalProps> = ({ account, onPreviewSkin }) => {
  const dispatch = useDispatch();
  const [skinStatus, setSkinStatus] = useState<{ [id: number]: string }>({});
  const [skinCounts, setSkinCounts] = useState<{ [id: number]: number }>({});
  const [todaysGlobalSkinList, setTodaysGlobalSkinList] = useState<number[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('norm');
  const [shopDayKey, setShopDayKey] = useState<string>(() => getShopDayKey());
  const [timeUntilResetMs, setTimeUntilResetMs] = useState<number>(() => msUntilNextReset());

  const skinRefs = useRef<(HTMLImageElement | null)[]>(new Array(Object.keys(skins).length).fill(null));
  // const swordRefs = useRef<(HTMLImageElement | null)[]>(new Array(Object.keys(skins).length).fill(null));

  const highlightSearchTerm = (text: string, term: string) => {
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  };

  const assignRef = useCallback((element: HTMLImageElement, index: number) => {
    skinRefs.current[index] = element;
  }, []);

  function accountHasBan() {
    return account?.isLoggedIn && account?.username?.startsWith(".");
  }

  function handleActionClick(id: number) {
    if (onPreviewSkin) { onPreviewSkin(id); return; }
    // If there is action already happening, don't do anything
    if (skinStatus[id]) return;

    if (accountHasBan() && account.skins.equipped !== id && account.skins.owned.includes(id)) {
      alert("Skins cannot be equipped");
      return;
    }

    const skinObj: any = Object.values(skins).find((s: any) => s.id === id);
    const owned = account.skins.owned.includes(id);

    if (!owned) {
      if (skinObj?.ultimate && skinObj?.original && !account.skins.owned.includes(skinObj.original)) {
        const orig: any = Object.values(skins).find((s: any) => s.id === skinObj.original);
        alert(`You need to own the "${orig?.displayName ?? 'original'}" skin before you can unlock the "${skinObj?.displayName ?? 'this'}" skin!`);
        return;
      }
      if (!window.confirm(`Do you want to ${skinObj?.ultimate ? 'unlock' : 'buy'} the "${skinObj?.displayName ?? 'this'}" skin?`)) return;
    }

    const skinAction = account.skins.equipped === id ? null :
                      owned ? 'Equipping...' : 'Getting...';

    if (skinAction) {
      setSkinStatus(prev => ({ ...prev, [id]: skinAction }));

      const apiPath = skinAction === 'Equipping...' ? '/equip/' : '/buy/';
      api.post(`${api.endpoint}/profile/cosmetics/skins${apiPath}${id}`, null, (data) => {
        if (data.error) alert(data.error);
        dispatch(updateAccountAsync() as any);
        setSkinStatus(prev => ({ ...prev, [id]: '' }));
      });
    }
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

    const modal = document.querySelector('.shop-modal');
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

  function getShopDayKey(now = new Date()) {
    const shifted = new Date(now.getTime() - RESET_HOUR * 60 * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(shifted.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function msUntilNextReset(now = Date.now()) {
    const nowDate = new Date(now);
    const year = nowDate.getUTCFullYear();
    const month = nowDate.getUTCMonth();
    const date = nowDate.getUTCDate();
    let resetMs = Date.UTC(year, month, date, RESET_HOUR, 0, 0);
    if (now >= resetMs) resetMs += 24 * 60 * 60 * 1000;
    return resetMs - now;
  }
  useEffect(() => {
    // Fetch daily skins
    const fetchDailySkins = () => {
      api.get(`${api.endpoint}/profile/skins/daily`, (data) => {
        if (data.error) {
          console.error('Error fetching daily skins:', data.error);
          setTodaysGlobalSkinList([]);
        } else if (Array.isArray(data)) {
          setTodaysGlobalSkinList(data);
        }
      });
    };

    // Fetch buy counts
    const fetchBuyCounts = () => {
      api.get(`${api.endpoint}/profile/skins/buys?${Date.now()}`, (data) => {
        if (data.error) return alert('Error fetching skin cnts '+ data.error);
        setSkinCounts(data);
      });
    };

    // Initial fetch
    fetchDailySkins();
    fetchBuyCounts();

    // Countdown update every second
    const tick = () => {
      setTimeUntilResetMs(msUntilNextReset());
    };
    tick();
    const intervalId = setInterval(tick, 1000);

    // Schedule exact reset action
    let timeoutId: any;
    const schedule = () => {
      const ms = msUntilNextReset();
      timeoutId = setTimeout(() => {
        // Fetch new daily skins and counts on reset
        fetchDailySkins();
        fetchBuyCounts();
        // Re-schedule for next day
        schedule();
      }, ms + 50); // slight buffer
    };
    schedule();

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="shop-modal">
      <div className="shop-extra">
      <div className="shop-headrow">
        <h1 className='shop-title'>Shop</h1>
        {account?.isLoggedIn ? (
          <div className='shop-counters'>
            <span>{numberWithCommas(account.gems)}<img className={'gem'} src='assets/game/gem.png' alt='Gems' width={28} height={28} /></span>
            <span>{numberWithCommas(account.mastery)}<img className={'gem'} src='assets/game/ultimacy.png' alt='Mastery' width={28} height={28} /></span>
          </div>
        ) : (
          <div className='shop-counters shop-counters-login'><b>Login or Signup</b> to buy skins &amp; earn gems!</div>
        )}
      </div>

<div className='search-bar'>
<input
        type="text"
        placeholder="Search skins..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
</div>

<div className="badges">
<button onClick={scrollToTarget}>Today's Skins</button>
<button onClick={scrollToTarget2} data-selected-badge="ultimate">Ultimate Skins</button>
<button onClick={scrollToTarget3} data-selected-badge="event">Event Skins</button>
<span className="shop-loadnote">(Skins may take a while to fully load)</span>
      </div>
      </div>
      {searchTerm && (
        <>
        <div className='scroll' ref={targetParentRef}>
        <SkinGrid
          skins={skins}
          filter={(skin) => {
            if (skin.og) return false;
            if (skin.eventoffsale) return false;
            if (skin.price === 0) return false;
            if (skin.description?.includes("Given")) return false;
            if (skin.currency) return false;
            return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
          }}
          sort={(a, b) => (a.price ?? 0) - (b.price ?? 0)}
          searchTerm={searchTerm}
          highlightSearchTerm={highlightSearchTerm}
          skinCounts={skinCounts}
          assignRef={assignRef}
          showTokenPrice={false}
        />
      <br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br />
      </div>
        </>
      )}
      {!searchTerm && (
          <>
          <div className='scroll' ref={targetParentRef}>
        <div ref={targetElementRef1}></div>
        <div className='label'>
        <span>Today's Skins</span><hr></hr>
        {(() => {
          const ms = timeUntilResetMs;
          if (ms <= 0) return <p>Resets in less than a minute</p>;
          const hours = Math.floor(ms / (1000 * 60 * 60));
          const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
          if (hours >= 1) return <p>Resets in {hours} hour{hours > 1 ? 's' : ''} {minutes} minute{minutes !== 1 ? 's' : ''}</p>;
          if (minutes >= 1) return <p>Resets in {minutes} minute{minutes !== 1 ? 's' : ''}</p>;
          return <p>Resets in less than a minute</p>;
        })()}
        {todaysGlobalSkinList === null && (
          <p style={{ color: '#aaa', fontSize: '0.9em', fontStyle: 'italic' }}>Loading Skins...</p>
        )}
        </div>
        <SkinGrid
          skins={skins}
          filter={(skin) => {
            if (skin.og) return false;
            if (skin.sale) return false;
            return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
          }}
          sort={(a, b) => (a.price ?? 0) - (b.price ?? 0)}
          searchTerm={searchTerm}
          highlightSearchTerm={highlightSearchTerm}
          skinCounts={skinCounts}
          assignRef={assignRef}
          showButton
          account={account}
          skinStatus={skinStatus}
          onActionClick={handleActionClick}
          showTokenPrice={false}
        />
      <br /><br /><br /><br /><br /><br /><br /><br />
        <div ref={targetElementRef2}></div>
        <div className='label'>
        <span>Ultimate Skins</span><hr></hr>
        <p>Ultimate skins are remakes of normal skins and are obtained by earning mastery instead of spending gems.<br /><span style={{color: 'red'}}>Unlocking ultimate skins DOES NOT take away any mastery. The original skin must be owned before unlocking the ultimate version.</span><br />(The original version of an Ultimate is based on it's Tag. For example, the "Ultimate Blueberry" Tag means the original skin is Blueberry)</p>
        </div>
        <SkinGrid
          skins={skins}
          filter={(skin) => {
            if (skin.og) return false;
            if (!skin.ultimate) return false;
            return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
          }}
          sort={(a, b) => (a.price ?? 0) - (b.price ?? 0)}
          searchTerm={searchTerm}
          highlightSearchTerm={highlightSearchTerm}
          skinCounts={skinCounts}
          assignRef={assignRef}
          showButton
          account={account}
          skinStatus={skinStatus}
          onActionClick={handleActionClick}
          showTokenPrice={false}
        />
      <br /><br /><br /><br /><br /><br /><br /><br />
      <div ref={targetElementRef3}></div>
        <div className='label'>
        <span>Event Skins</span><hr></hr>
        <p style={{color: 'white'}}>Event skins can be purchased/obtained during seasonal events or holiday skin sales. Stick around for holiday seasons to get some of these event skins!</p>
        </div>
        <SkinGrid
          skins={skins}
          filter={(skin) => {
            if (skin.og) return false;
            if (!skin.event && !skin.eventoffsale) return false;
            return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
          }}
          sort={(a, b) => {
            const aTag = a.eventtag || '';
            const bTag = b.eventtag || '';
            if (aTag.includes('WINTER 2024') && !bTag.includes('WINTER 2024')) return 1;
            if (!aTag.includes('WINTER 2024') && bTag.includes('WINTER 2024')) return -1;
            return (a.price ?? 0) - (b.price ?? 0);
          }}
          searchTerm={searchTerm}
          highlightSearchTerm={highlightSearchTerm}
          skinCounts={skinCounts}
          assignRef={assignRef}
          showButton
          account={account}
          skinStatus={skinStatus}
          onActionClick={handleActionClick}
          showTokenPrice
        />
      <br /><br /><br /><br /><br /><br /><br /><br />
      </div>
          </>
        )}
      
    </div>
  );
}

ShopModal.displayName = 'ShopModal';

export default ShopModal;
