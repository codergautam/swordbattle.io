import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AccountState, setAccount, updateAccountAsync } from '../../redux/account/slice';
import { Settings } from '../../game/Settings';
import api from '../../api';
import * as cosmetics from '../../game/cosmetics.json'

import './ShopModal.scss'
import { buyFormats, numberWithCommas, sinceFrom } from '../../helpers';
import { Id } from '@reduxjs/toolkit/dist/tsHelpers';
let { skins } = cosmetics;

const basePath = 'assets/game/player/';

const RESET_HOUR = 23;

interface ShopModalProps {
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

  currency: boolean;

  tokenprice: number;
}

const rotate = false;

const ShopModal: React.FC<ShopModalProps> = ({ account }) => {
  const dispatch = useDispatch();
  const [skinStatus, setSkinStatus] = useState<{ [id: number]: string }>({});
  const [skinCounts, setSkinCounts] = useState<{ [id: number]: number }>({});
  const [todaysGlobalSkinList, setTodaysGlobalSkinList] = useState<number[]>([]);
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
    // If there is action already happening, don't do anything
    if (skinStatus[id]) return;

    if (accountHasBan() && account.skins.equipped !== id && account.skins.owned.includes(id)) {
      alert("Skins cannot be equipped");
      return;
    }

    const skinAction = account.skins.equipped === id ? null :
                      account.skins.owned.includes(id) ? 'Equipping...' : 'Getting...';

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
      <h1 className='shop-title'>Shop</h1>
      {account?.isLoggedIn ? (
      <h1 className='shop-desc'>Gems: {numberWithCommas(account.gems)}<img className={'gem'} src='assets/game/gem.png' alt='Gems' width={30} height={30} /><br />Mastery: {numberWithCommas(account.mastery)}<img className={'gem'} src='assets/game/ultimacy.png' alt='Gems' width={30} height={30} /></h1>
       ) : (
        <h1 className='shop-desc'><b>Login or Signup</b> to buy stuff from the shop!<br/>Earn gems by stabbing players and collecting coins around the map!</h1>
      )}

<div className='search-bar'>
<input
        type="text"
        placeholder="Search skins..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
</div>

<h1 className='shop-desc-extra'>(Skins may take a while to fully load)</h1>
<div className="badges">
<button onClick={scrollToTarget}>Today's Skins</button>
<button onClick={scrollToTarget2} data-selected-badge="ultimate">Ultimate Skins</button>
<button onClick={scrollToTarget3} data-selected-badge="event">Event Skins</button>
      </div>
      </div>
      {searchTerm && (
        <>
        <div className='scroll' ref={targetParentRef}>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (skin.og) return false;
        if (skin.eventoffsale) return false;
        if (skin.price === 0) return false;
        if (skin.description?.includes("Given")) return false;
        if (skin.currency) return false;
        
        return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a: any, b: any) => a.price - b.price).map((skinData: any, index) => {
        const skin = skinData as Skin;
        return (
        <div className="skin-card" key={skin.name}>
          <h2 className="skin-name" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          {skin.ultimate && (
            <p className='skin-tag'>{skin.tag}</p>
          )}
          {skin.sale && (
            <p className='skin-saletag'>{skin.saletag}</p>
          )}
          {skin.event && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}
          {skin.eventoffsale && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}

          {/* Get image width from src */}
            {(() => {
            // Create a variable to store the width
            let imgWidth = 0;
            const img = new window.Image();
            img.src = basePath + skin.bodyFileName;
            img.onload = () => {
              imgWidth = img.naturalWidth;
            };
            // This will not be reactive, but will be used below
            return null;
            })()}

            <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-img-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-img';
                } else {
                el.className = 'skin-img-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
            <img
            src={basePath + skin.swordFileName}
            alt={skin.name}
           ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-sword-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-sword';
                } else {
                el.className = 'skin-sword-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
          <h4 className='skin-count'>{Object.keys(skinCounts ?? {}).length > 0 ? buyFormats(skinCounts[skin.id] ?? 0) : '...'} buys
          <br/>
          <span className='skin-desc'>{skin.description}</span>
          {
  (skin?.price ?? 0) > 0 ? (
    <>
      {skin?.sale 
        && <> <span className="sale">
        {skin?.ogprice}
      </span><span>‎ ‎ ‎</span> </>
      }
      {skin?.price} 
      {skin?.ultimate 
        ? <img className={'gem'} src='assets/game/ultimacy.png' alt='Mastery' width={20} height={20} />
        : <img className={'gem'} src='assets/game/gem.png' alt='Gems' width={20} height={20} />
      }
    </>
  ) : (
    <>
      <p style={{ marginLeft: 0, marginRight: 0, marginBottom: 0, marginTop: 7 }}>
      {skin?.sale 
        && <> <span className="sale">
        {skin?.ogprice}
      </span><span>‎ ‎ ‎</span> </>
      }
        {skin?.ultimate ? (
  <>
    {skin.buyable ? '0' : ''}
    <img className="gem" src="assets/game/ultimacy.png" alt="Mastery" width={30} height={30} />
  </>
) : (
  skin?.buyable ? 'Free' : ''
)}
      </p>
    </>
  )
}
          </h4>
        </div>
      )
      }
      )}
      </div>
      <br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br />
      </div>
        </>
      )}
      {!searchTerm && (
          <>
          <div className='scroll' ref={targetParentRef}>
        <div className='label'>
          <div ref={targetElementRef2}></div>
        <div className='label'>
        <span>New Skins</span><hr></hr>
        <p>All new skins from the 2/8 update, always available for a week!</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (!skin.sale) return false;
        
        return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a: any, b: any) => a.price - b.price).map((skinData: any, index) => {
        const skin = skinData as Skin;
        return (
        <div className="skin-card" key={skin.name}>
          <h2 className="skin-name" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          {skin.ultimate && (
            <p className='skin-tag'>{skin.tag}</p>
          )}
          {skin.sale && (
            <p className='skin-saletag'>{skin.saletag}</p>
          )}
          {skin.event && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}
          {skin.eventoffsale && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}

          {/* Get image width from src */}
            {(() => {
            // Create a variable to store the width
            let imgWidth = 0;
            const img = new window.Image();
            img.src = basePath + skin.bodyFileName;
            img.onload = () => {
              imgWidth = img.naturalWidth;
            };
            // This will not be reactive, but will be used below
            return null;
            })()}

            <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-img-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-img';
                } else {
                el.className = 'skin-img-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
            <img
            src={basePath + skin.swordFileName}
            alt={skin.name}
           ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-sword-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-sword';
                } else {
                el.className = 'skin-sword-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
          <h4 className='skin-count'>{Object.keys(skinCounts ?? {}).length > 0 ? buyFormats(skinCounts[skin.id] ?? 0) : '...'} buys
          <br/>
          <span className='skin-desc'>{skin.description}</span>
          {
  (skin?.price ?? 0) > 0 ? (
    <>
      {skin?.sale 
        && <> <span className="sale">
        {skin?.ogprice}
      </span><span>‎ ‎ ‎</span> </>
      }
      {skin?.price} 
      {skin?.ultimate 
        ? <img className={'gem'} src='assets/game/ultimacy.png' alt='Mastery' width={20} height={20} />
        : <img className={'gem'} src='assets/game/gem.png' alt='Gems' width={20} height={20} />
      }
    </>
  ) : (
    <>
      <p style={{ marginLeft: 0, marginRight: 0, marginBottom: 0, marginTop: 7 }}>
      {skin?.sale 
        && <> <span className="sale">
        {skin?.ogprice}
      </span><span>‎ ‎ ‎</span> </>
      }
        {skin?.ultimate ? (
  <>
    {skin.buyable ? '0' : ''}
    <img className="gem" src="assets/game/ultimacy.png" alt="Mastery" width={30} height={30} />
  </>
) : (
  skin?.buyable ? 'Free' : ''
)}
      </p>
    </>
  )
}
          </h4>
          {(account?.isLoggedIn && (skin.buyable || account.skins.owned.includes(skin.id)) && (
  <button className='buy-button' onClick={() => handleActionClick(skin.id)}>
    {skinStatus[skin.id] || (account.skins.equipped === skin.id ? 'Equipped' :
      account.skins.owned.includes(skin.id) ? 'Equip' : skin.ultimate ? 'Unlock' : 'Buy')}
  </button>
))}
        </div>
      )
      }
      )}
      </div>
      <br /><br /><br /><br /><br /><br /><br /><br />
        <div ref={targetElementRef1}></div>
        <span>Today's Skins</span><hr></hr>
        {(() => {
          const ms = timeUntilResetMs;
          if (ms <= 0) return <p>Resets in less than a minute</p>;
          const hours = Math.floor(ms / (1000 * 60 * 60));
          const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
          if (hours >= 1) return <p>Resets in {hours} hour{hours > 1 ? 's' : ''} {minutes} minute{minutes !== 1 ? 's' : ''}</p>;
          if (minutes >= 1) return <p>Resets in {minutes} minute{minutes !== 1 ? 's' : ''}</p>;
          return <p>Resets in less than a minute</p>;
        })()}</div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (!todaysGlobalSkinList.includes(skin.id)) return false;
        if (skin.sale) return false; {
          return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
        }
      }).sort((a: any, b: any) => a.price - b.price).map((skinData: any, index) => {
        const skin = skinData as Skin;
        return (
        <div className="skin-card" key={skin.name}>
          <h2 className="skin-name" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          {skin.ultimate && (
            <p className='skin-tag'>{skin.tag}</p>
          )}
          {skin.sale && (
            <p className='skin-saletag'>{skin.saletag}</p>
          )}
          {skin.event && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}
          {skin.eventoffsale && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}

            {/* Get image width from src */}
            {(() => {
            // Create a variable to store the width
            let imgWidth = 0;
            const img = new window.Image();
            img.src = basePath + skin.bodyFileName;
            img.onload = () => {
              imgWidth = img.naturalWidth;
            };
            // This will not be reactive, but will be used below
            return null;
            })()}

            <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-img-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-img';
                } else {
                el.className = 'skin-img-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
            <img
            src={basePath + skin.swordFileName}
            alt={skin.name}
           ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-sword-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-sword';
                } else {
                el.className = 'skin-sword-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
          <h4 className='skin-count'>{Object.keys(skinCounts ?? {}).length > 0 ? buyFormats(skinCounts[skin.id] ?? 0) : '...'} buys
          <br/>
          <span className='skin-desc'>{skin.description}</span>
          {
  (skin?.price ?? 0) > 0 ? (
    <>
      {skin?.sale 
        && <> <span className="sale">
        {skin?.ogprice}
      </span><span>‎ ‎ ‎</span> </>
      }
      {skin?.price} 
      {skin?.ultimate 
        ? <img className={'gem'} src='assets/game/ultimacy.png' alt='Mastery' width={20} height={20} />
        : <img className={'gem'} src='assets/game/gem.png' alt='Gems' width={20} height={20} />
      }
    </>
  ) : (
    <>
      <p style={{ marginLeft: 0, marginRight: 0, marginBottom: 0, marginTop: 7 }}>
      {skin?.sale 
        && <> <span className="sale">
        {skin?.ogprice}
      </span><span>‎ ‎ ‎</span> </>
      }
        {skin?.ultimate ? (
  <>
    {skin.buyable ? '0' : ''}
    <img className="gem" src="assets/game/ultimacy.png" alt="Mastery" width={30} height={30} />
  </>
) : (
  skin?.buyable ? 'Free' : ''
)}
      </p>
    </>
  )
}
          </h4>
          {(account?.isLoggedIn && (skin.buyable || account.skins.owned.includes(skin.id)) && (
  <button className='buy-button' onClick={() => handleActionClick(skin.id)}>
    {skinStatus[skin.id] || (account.skins.equipped === skin.id ? 'Equipped' :
      account.skins.owned.includes(skin.id) ? 'Equip' : skin.ultimate ? 'Unlock' : 'Buy')}
  </button>
))}
        </div>
      )
      }
      )}
      </div>
      <br /><br /><br /><br /><br /><br /><br /><br />
        <div ref={targetElementRef2}></div>
        <div className='label'>
        <span>Ultimate Skins</span><hr></hr>
        <p>Ultimate skins are remakes of normal skins and are obtained by earning mastery instead of spending gems.<br /><span style={{color: 'red'}}>Unlocking ultimate skins DOES NOT take away any mastery. The original skin must be owned before unlocking the ultimate version.</span><br />(The original version of an Ultimate is based on it's Tag. For example, the "Ultimate Blueberry" Tag means the original skin is Blueberry)</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (skin.og) return false;
        if (!skin.ultimate) return false;
        
        return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a: any, b: any) => a.price - b.price).map((skinData: any, index) => {
        const skin = skinData as Skin;
        return (
        <div className="skin-card" key={skin.name}>
          <h2 className="skin-name" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          {skin.ultimate && (
            <p className='skin-tag'>{skin.tag}</p>
          )}
          {skin.sale && (
            <p className='skin-saletag'>{skin.saletag}</p>
          )}
          {skin.event && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}
          {skin.eventoffsale && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}

          {/* Get image width from src */}
            {(() => {
            // Create a variable to store the width
            let imgWidth = 0;
            const img = new window.Image();
            img.src = basePath + skin.bodyFileName;
            img.onload = () => {
              imgWidth = img.naturalWidth;
            };
            // This will not be reactive, but will be used below
            return null;
            })()}

            <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-img-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-img';
                } else {
                el.className = 'skin-img-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
            <img
            src={basePath + skin.swordFileName}
            alt={skin.name}
           ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-sword-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-sword';
                } else {
                el.className = 'skin-sword-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
          <h4 className='skin-count'>{Object.keys(skinCounts ?? {}).length > 0 ? buyFormats(skinCounts[skin.id] ?? 0) : '...'} buys
          <br/>
          <span className='skin-desc'>{skin.description}</span>
          {
  (skin?.price ?? 0) > 0 ? (
    <>
      {skin?.sale 
        && <> <span className="sale">
        {skin?.ogprice}
      </span><span>‎ ‎ ‎</span> </>
      }
      {skin?.price} 
      {skin?.ultimate 
        ? <img className={'gem'} src='assets/game/ultimacy.png' alt='Mastery' width={20} height={20} />
        : <img className={'gem'} src='assets/game/gem.png' alt='Gems' width={20} height={20} />
      }
    </>
  ) : (
    <>
      <p style={{ marginLeft: 0, marginRight: 0, marginBottom: 0, marginTop: 7 }}>
      {skin?.sale 
        && <> <span className="sale">
        {skin?.ogprice}
      </span><span>‎ ‎ ‎</span> </>
      }
        {skin?.ultimate ? (
  <>
    {skin.buyable ? '0' : ''}
    <img className="gem" src="assets/game/ultimacy.png" alt="Mastery" width={30} height={30} />
  </>
) : (
  skin?.buyable ? 'Free' : ''
)}
      </p>
    </>
  )
}
          </h4>
          {(account?.isLoggedIn && (skin.buyable || account.skins.owned.includes(skin.id)) && (
  <button className='buy-button' onClick={() => handleActionClick(skin.id)}>
    {skinStatus[skin.id] || (account.skins.equipped === skin.id ? 'Equipped' :
      account.skins.owned.includes(skin.id) ? 'Equip' : skin.ultimate ? 'Unlock' : 'Buy')}
  </button>
))}
        </div>
      )
      }
      )}
      </div>
      <br /><br /><br /><br /><br /><br /><br /><br />
      <div ref={targetElementRef3}></div>
        <div className='label'>
        <span>Event Skins</span><hr></hr>
        <p style={{color: 'white'}}>Event skins can be purchased/obtained during seasonal events or holiday skin sales. Stick around for holiday seasons to get some of these event skins!</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (skin.og) return false;
        if (!skin.event && !skin.eventoffsale) return false;
        // if (!skin.eventtag?.includes('WINTER')) return false;
        
        return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a: any, b: any) => {
        const aTag = (a as Skin).eventtag || '';
        const bTag = (b as Skin).eventtag || '';
        
        // "WINTER 2024" goes to bottom (higher number = lower priority)
        if (aTag.includes('WINTER 2024') && !bTag.includes('WINTER 2024')) return 1;
        if (!aTag.includes('WINTER 2024') && bTag.includes('WINTER 2024')) return -1;
        
        // If same tag, sort by price
        return ((a as Skin).price ?? 0) - ((b as Skin).price ?? 0);
      }).map((skinData: any, index) => {
        const skin = skinData as Skin;
        return (
        <div className="skin-card" key={skin.name}>
          <h2 className="skin-name" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          {skin.ultimate && (
            <p className='skin-tag'>{skin.tag}</p>
          )}
          {skin.sale && (
            <p className='skin-saletag'>{skin.saletag}</p>
          )}
          {skin.event && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}
          {skin.eventoffsale && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}

          {/* Get image width from src */}
            {(() => {
            // Create a variable to store the width
            let imgWidth = 0;
            const img = new window.Image();
            img.src = basePath + skin.bodyFileName;
            img.onload = () => {
              imgWidth = img.naturalWidth;
            };
            // This will not be reactive, but will be used below
            return null;
            })()}

            <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-img-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-img';
                } else {
                el.className = 'skin-img-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
            <img
            src={basePath + skin.swordFileName}
            alt={skin.name}
           ref={(el) => {
              assignRef(el as HTMLImageElement, index);
              if (el) {
              // Get width from the image src instead of el.naturalWidth
              const tempImg = new window.Image();
              tempImg.src = basePath + skin.bodyFileName;
              tempImg.onload = () => {
                if (tempImg.naturalWidth === 300) {
                el.className = 'skin-sword-large';
                } else if (tempImg.naturalWidth === 274) {
                el.className = 'skin-sword';
                } else {
                el.className = 'skin-sword-small';
                }
              };
              }
            }}
            data-selected='skin'
            />
            <h4 className='skin-count'>{Object.keys(skinCounts ?? {}).length > 0 ? buyFormats(skinCounts[skin.id] ?? 0) : '...'} buys
            <br/>
            <span className='skin-desc'>{skin.description}</span>
            {
        (skin?.price ?? 0) > 0 ? (
        <>
          {skin?.sale 
          && <> <span className="sale">
          {skin?.ogprice}
          </span><span>‎ ‎ ‎</span> </>
          }
          {skin?.price} 
          {skin?.ultimate 
          ? <img className={'gem'} src='assets/game/ultimacy.png' alt='Mastery' width={20} height={20} />
          : <img className={'gem'} src='assets/game/gem.png' alt='Gems' width={20} height={20} />
          }
          {skin?.tokenprice && (
          <>
            <span>‎ ‎ ‎</span>
            {skin.tokenprice}
            <img className={'gem'} src='assets/game/snowtoken.png' alt='Snowtokens' width={20} height={20} />
          </>
          )}
        </>
        ) : (
        <>
          <p style={{ marginLeft: 0, marginRight: 0, marginBottom: 0, marginTop: 7 }}>
          {skin?.sale 
          && <> <span className="sale">
          {skin?.ogprice}
          </span><span>‎ ‎ ‎</span> </>
          }
          {skin?.ultimate ? (
        <>
        {skin.buyable ? '0' : ''}
        <img className="gem" src="assets/game/ultimacy.png" alt="Mastery" width={30} height={30} />
        </>
      ) : (
        skin?.buyable ? 'Free' : ''
      )}
          </p>
          {skin?.tokenprice && (
          <>
            <span>‎ ‎ ‎</span>
            {skin.tokenprice}
            <img className={'gem'} src='assets/game/snowtoken.png' alt='Snowtokens' width={20} height={20} />
          </>
          )}
        </>
        )
      }
            </h4>
          {(account?.isLoggedIn && (skin.buyable || account.skins.owned.includes(skin.id)) && (
  <button className='buy-button' onClick={() => handleActionClick(skin.id)}>
    {skinStatus[skin.id] || (account.skins.equipped === skin.id ? 'Equipped' :
      account.skins.owned.includes(skin.id) ? 'Equip' : skin.ultimate ? 'Unlock' : 'Buy')}
  </button>
))}
        </div>
      )
      }
      )}
      </div>
      <br /><br /><br /><br /><br /><br /><br /><br />
      </div>
          </>
        )}
      
    </div>
  );
}

ShopModal.displayName = 'ShopModal';

export default ShopModal;
