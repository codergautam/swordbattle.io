import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AccountState, setAccount, updateAccountAsync } from '../../redux/account/slice';
import { Settings } from '../../game/Settings';
import api from '../../api';
import * as cosmetics from '../../game/cosmetics.json'

import './ShopModal.scss'
import SkinView from '../SkinView';
import ModalAd from '../ModalAd';
import { getSkinScale } from '../../game/skinScales';
import { buyFormats, numberWithCommas, sinceFrom } from '../../helpers';
import { confirmDialog, showDialog } from '../PromptDialog';
let { skins } = cosmetics;

const basePath = 'assets/game/player/';

const RESET_HOUR = 23;

interface ShopModalProps {
  account: AccountState;
  onPreviewSkin?: (id: number, viewOnly?: boolean) => void;
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
  onActionClick?: (id: number, viewOnly?: boolean) => void;
  showTokenPrice?: boolean;
  buttonMode?: (skin: Skin) => 'action' | 'view' | 'none';
}

const SkinGrid: React.FC<SkinGridProps> = ({
  skins, filter, sort, searchTerm, highlightSearchTerm, skinCounts,
  assignRef, showButton, account, skinStatus, onActionClick, showTokenPrice, buttonMode,
}) => {
  const filtered = Object.values(skins)
    .filter((skinData: any) => filter(skinData as Skin))
    .sort((a: any, b: any) => sort(a as Skin, b as Skin));

  return (
    <div className='skins'>
      {filtered.map((skinData: any, index) => {
        const skin = skinData as Skin;
        const mode = buttonMode
          ? buttonMode(skin)
          : showButton && (skin.buyable || account?.skins?.owned?.includes(skin.id)) ? 'action' : 'none';
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
            {mode === 'view' && (
              <button className="buy-button" onClick={() => onActionClick?.(skin.id, true)}>View</button>
            )}
            {mode === 'action' && (() => {
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
  const [showAllSkins, setShowAllSkins] = useState(false);
  const [showUltimate, setShowUltimate] = useState(Settings.showUltimate);
  const [showEvent, setShowEvent] = useState(Settings.showEvent);
  const [allSkinSort, setAllSkinSort] = useState('price-low');

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

  async function handleActionClick(id: number, viewOnly = false) {
    if (onPreviewSkin) { onPreviewSkin(id, viewOnly); return; }
    // If there is action already happening, don't do anything
    if (skinStatus[id]) return;

    if (accountHasBan() && account.skins.equipped !== id && account.skins.owned.includes(id)) {
      await showDialog('Skins cannot be equipped.');
      return;
    }

    const skinObj: any = Object.values(skins).find((s: any) => s.id === id);
    const owned = account.skins.owned.includes(id);

    if (!owned) {
      if (skinObj?.ultimate && skinObj?.original && !account.skins.owned.includes(skinObj.original)) {
        const orig: any = Object.values(skins).find((s: any) => s.id === skinObj.original);
        await showDialog(`You need to own the "${orig?.displayName ?? 'original'}" skin before you can unlock the "${skinObj?.displayName ?? 'this'}" skin!`);
        return;
      }
      if (!await confirmDialog(`Do you want to ${skinObj?.ultimate ? 'unlock' : 'buy'} the "${skinObj?.displayName ?? 'this'}" skin?`, 'Confirm purchase', skinObj?.ultimate ? 'Unlock' : 'Buy')) return;
    }

    const skinAction = account.skins.equipped === id ? null :
                      owned ? 'Equipping...' : 'Getting...';

    if (skinAction) {
      setSkinStatus(prev => ({ ...prev, [id]: skinAction }));

      const apiPath = skinAction === 'Equipping...' ? '/equip/' : '/buy/';
      api.post(`${api.endpoint}/profile/cosmetics/skins${apiPath}${id}`, null, (data) => {
        if (data.error) void showDialog(data.error, 'Shop');
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
      if (data.error) { void showDialog('Could not fetch skin counts.', 'Shop'); return; }
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
        if (data.error) { void showDialog('Could not fetch skin counts.', 'Shop'); return; }
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

  const updateShowUltimate = (value: boolean) => {
    setShowUltimate(value);
    Settings.showUltimate = value;
  };
  const updateShowEvent = (value: boolean) => {
    setShowEvent(value);
    Settings.showEvent = value;
  };
  const sortAllSkins = (a: Skin, b: Skin) => {
    switch (allSkinSort) {
      case 'price-high': return (b.price ?? 0) - (a.price ?? 0);
      case 'buys': return (skinCounts[b.id] ?? 0) - (skinCounts[a.id] ?? 0);
      case 'name-az': return a.displayName.localeCompare(b.displayName);
      case 'name-za': return b.displayName.localeCompare(a.displayName);
      default: return (a.price ?? 0) - (b.price ?? 0);
    }
  };

  if (showAllSkins) {
    return (
      <div className="shop-modal all-skins-modal">
        <div className="shop-extra">
          <div className="all-skins-toolbar">
            <h1 className="shop-title">All Skins</h1>
            <button className="all-skins-back" onClick={() => setShowAllSkins(false)}>Back to Shop</button>
            <div className="all-skins-toggle">
              <span>Show Ultimate Skins</span>
              <label className="switch"><input type="checkbox" checked={showUltimate} onChange={(e) => updateShowUltimate(e.target.checked)} /><span className="slider round" /></label>
            </div>
            <div className="all-skins-toggle">
              <span>Show Event Skins</span>
              <label className="switch"><input type="checkbox" checked={showEvent} onChange={(e) => updateShowEvent(e.target.checked)} /><span className="slider round" /></label>
            </div>
            <label className="all-skins-sort">Sort by
              <select value={allSkinSort} onChange={(e) => setAllSkinSort(e.target.value)}>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="buys">Most buys</option>
                <option value="name-az">Name: A to Z</option>
                <option value="name-za">Name: Z to A</option>
              </select>
            </label>
          </div>
        </div>
        <div className="scroll">
          <SkinGrid
            skins={skins}
            filter={(skin) => !skin.og && !skin.currency && (showUltimate || !skin.ultimate) && (showEvent || (!skin.event && !skin.eventoffsale))}
            sort={sortAllSkins}
            searchTerm=""
            highlightSearchTerm={highlightSearchTerm}
            skinCounts={skinCounts}
            assignRef={assignRef}
            buttonMode={() => 'view'}
            onActionClick={(id) => onPreviewSkin?.(id, true)}
            showTokenPrice
          />
        </div>
      </div>
    );
  }

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
          <div className='shop-counters shop-counters-login'><b>Log in or Signup</b> to buy skins &amp; earn gems!</div>
        )}
      </div>

<div className='search-bar'>
<input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
</div>

<div className="badges">
<button onClick={scrollToTarget}>Today's<span className="badge-long"> Skins</span></button>
<button onClick={scrollToTarget2} data-selected-badge="ultimate">Ultimate<span className="badge-long"> Skins</span></button>
<button onClick={scrollToTarget3} data-selected-badge="event">Event<span className="badge-long"> Skins</span></button>
<span className="shop-loadnote">(Skins may take a while to fully load)</span>
      </div>
      </div>
      <ModalAd placement="shop" />
      {searchTerm && (
        <>
        <div className='scroll' ref={targetParentRef}>
        <SkinGrid
          skins={skins}
          filter={(skin) => {
            if (skin.og) return false;
            if (skin.currency) return false;
            if (!todaysGlobalSkinList?.includes(skin.id) && !skin.eventoffsale) return false;
            return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
          }}
          sort={(a, b) => (a.price ?? 0) - (b.price ?? 0)}
          searchTerm={searchTerm}
          highlightSearchTerm={highlightSearchTerm}
          skinCounts={skinCounts}
          assignRef={assignRef}
          buttonMode={(skin) => skin.eventoffsale || !skin.buyable ? 'view' : 'action'}
          account={account}
          skinStatus={skinStatus}
          onActionClick={handleActionClick}
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
            if (!todaysGlobalSkinList || !todaysGlobalSkinList.includes(skin.id)) return false;
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
          buttonMode={(skin) => skin.eventoffsale || !skin.buyable ? 'view' : 'action'}
          showTokenPrice={false}
        />
      <br /><br /><br /><br /><br /><br /><br /><br />
        <div ref={targetElementRef2}></div>
        <div className='label'>
        <span>Ultimate Skins</span><hr></hr>
        <p>Ultimate skins are remakes of normal skins and are obtained by earning mastery instead of spending gems.<br /><span style={{color: 'red'}}>Unlocking ultimate skins DOES NOT take away any mastery. The original skin must be owned before unlocking the ultimate version.</span></p>
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
          buttonMode={(skin) => skin.eventoffsale || !skin.buyable ? 'view' : 'action'}
          showTokenPrice
        />
        <button className="view-all-skins" onClick={() => setShowAllSkins(true)}>View All Skins</button>
      <br /><br /><br /><br /><br /><br /><br /><br />
      </div>
          </>
        )}
      
    </div>
  );
}

ShopModal.displayName = 'ShopModal';

export default ShopModal;
