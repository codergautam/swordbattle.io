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

interface ShopModalProps {
  account: AccountState;
}

interface Skin {
  name: string;
  displayName: string;
  id: number;
  buyable: boolean;
  og: boolean;
  event: boolean;
  tag: string;
  saletag: string;
  eventtag: string;
  sale: boolean;
  freebie: boolean;
  eventoffsale: boolean;
  ultimate: boolean;
  special: boolean;
  obl: boolean;
  wip: boolean;
  swordFileName: string;
  bodyFileName: string;
  ogprice?: number;
  price?: number;
  description?: string;
  player: boolean;
  currency: boolean;
  original?: number;
  new?: boolean;
}

const rotate = false;

const ShopModal: React.FC<ShopModalProps> = ({ account }) => {
  const dispatch = useDispatch();
  const [skinStatus, setSkinStatus] = useState<{ [id: number]: string }>({});
  const [skinCounts, setSkinCounts] = useState<{ [id: number]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('norm');

  const skinRefs = useRef<(HTMLImageElement | null)[]>(new Array(Object.keys(skins).length).fill(null));
  // const swordRefs = useRef<(HTMLImageElement | null)[]>(new Array(Object.keys(skins).length).fill(null));

  const highlightSearchTerm = (text: string, term: string) => {
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  };

  const assignRef = useCallback((element: HTMLImageElement, index: number) => {
    skinRefs.current[index] = element;
  }, []);
  function handleActionClick(id: number) {

    // If there is action already happening, don't do anything
    if (skinStatus[id]) return;

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
    api.get(`${api.endpoint}/profile/skins/buys`, (data) => {
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

  const targetElementRef6 = useRef<HTMLDivElement>(null);

  const scrollToTarget6 = () => {
    if (targetParentRef.current && targetElementRef6.current) {
      targetElementRef6.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error("Target element not found");
    }
  };

  const targetElementRef7 = useRef<HTMLDivElement>(null);

  const scrollToTarget7 = () => {
    if (targetParentRef.current && targetElementRef7.current) {
      targetElementRef7.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error("Target element not found");
    }
  };


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
<button onClick={scrollToTarget2}>Today's Skins</button>
<button onClick={scrollToTarget3} data-selected-badge="ultimate">Ultimate Skins</button>
{/* <button onClick={scrollToTarget4} data-selected-badge="event">Event Skins</button> */}

{account?.isLoggedIn && Settings.owned && (
          <button onClick={scrollToTarget5} data-selected-badge="own">Owned Skins</button>
          )}

        
  { Object.values(skins).filter((skinData: any) =>  skinData.og && account?.skins.owned.includes(skinData.id)).length > 0 && (
    <>
        <button onClick={scrollToTarget6} data-selected-badge="og">OG Skins</button>
        </>
  )}
  {/* <button onClick={scrollToTarget7} data-selected-badge="player">Special Skins</button> */}
      </div>
      <center>
      {selectedBadge === 'og' && (
          <p style={{marginTop: 0}}></p>
        )}
        {selectedBadge === 'event' && (
          <p style={{marginTop: 0}}></p>
        )}
      {selectedBadge === 'own' && (
          <p style={{marginTop: 0}}>Skins you own can still be equipped from other menus, but using this menu will make it much easier to find them.</p>
        )}
      {selectedBadge === 'ultimate' && (
          <p style={{marginTop: 0}}></p>
        )}
      </center>
      </div>
      {searchTerm && (
        <>
        <div className='scroll' ref={targetParentRef}>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (skin.og) return false;
        if (skin.eventoffsale) return false;
        if (skin.special) return false;
        if (skin.wip) return false;
        
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
          {skin.freebie && (
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
          <p className='skin-desc'>{skin.description}</p>
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
      <br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br />
      </div>
        </>
      )}
      {!searchTerm && (
          <>
          <div className='scroll' ref={targetParentRef}>
        <div className='label'>
        <div ref={targetElementRef2}></div>
        <span>Today's Skins</span><hr></hr>
        {account?.isLoggedIn && account.lastDayPlayed && (() => {
          const lastPlayedDate = new Date(account.lastDayPlayed);
          if (isNaN(lastPlayedDate.getTime())) return <p>Resets in 0 seconds</p>;

          const now = Date.now();
          const resetTime = lastPlayedDate.getTime() + 24 * 60 * 60 * 1000;
          let diffMs = resetTime - now;

          if (diffMs <= 0) {
            diffMs = 24 * 60 * 60 * 1000; // Visual reset
          }

          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          if (hours === 24 && minutes === 0) {
            return <p>Resets in 1 day</p>;
          } else if (hours > 0) {
            return <p>Resets in {hours} hour{hours > 1 ? "s" : ""} {minutes} minute{minutes !== 1 ? "s" : ""}</p>;
          } else if (minutes > 0) {
            return <p>Resets in {minutes} minute{minutes !== 1 ? "s" : ""}</p>;
          } else {
            return <p>Resets in less than a minute</p>;
          }
        })()}




        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (!account?.skinList.includes(skin.id)) return false;
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
          {skin.freebie && (
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
          <p className='skin-desc'>{skin.description}</p>
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
        <span>Ultimate Skins</span><hr></hr>
        <p>Ultimate skins are remakes of normal skins and are obtained by earning mastery instead of spending gems.<br /><span style={{color: 'red'}}>Unlocking ultimate skins DOES NOT take away any mastery. The original skin must be owned before unlocking the ultimate version.</span><br />(The original version of an Ultimate is based on it's Tag. For example, the "Ultimate Blueberry" Tag means the original skin is Blueberry)</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (skin.og) return false;
        if (!skin.ultimate) return false;
        if (skin.special) return false;
        
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
          {skin.freebie && (
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
          <p className='skin-desc'>{skin.description}</p>
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
      {account?.isLoggedIn && Settings.owned && (
        <>
          <div className='label'>
        <div ref={targetElementRef5}></div>
        <span>Owned Skins</span><hr></hr>
        <p>Skins you own can still be equipped from other menus, but using this menu will make it much easier to find them.</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (skin.og) return false;
        if (skin.currency) return false;
        if (skin.eventoffsale) return false;
        if (skin.special) return false;
        if (!account?.skins.owned.includes(skin.id)) return false;
        
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
          {skin.freebie && (
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
          <p className='skin-desc'>{skin.description}</p>
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
          </>
          )}
        { Object.values(skins).filter((skinData: any) =>  skinData.og && account?.skins.owned.includes(skinData.id)).length > 0 && (
    <>
    <br /><br /><br /><br /><br /><br /><br /><br />
       <div ref={targetElementRef6}></div>
        <div className='label'>
        <span>OG Skins</span><hr></hr>
        <p>OG skins are skins that were available in the original version of the game before 2024.<br/>They are no longer obtainable, but can still be equipped from this menu.</p>
        </div>
        </>
  )}
        
      <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (!skin.og) return false;
        if (skin.ultimate) return false;
        if (!account?.skins.owned.includes(skin.id)) return false;
        
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
          {skin.freebie && (
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
          <p className='skin-desc'>{skin.description}</p>
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
      {/*<br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br />*/}
      {/*
      <div className='label'>
        <span style={{color: 'white'}}>Upcoming Skins</span><hr></hr>
        <p style={{color: 'white'}}>Some skins from this list may not be added to the game in the future.</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (!skin.wip) return false;
        
        return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a: any, b: any) => a.id - b.id).map((skinData: any, index) => {
        const skin = skinData as Skin;
        return (
        <div className="skin-card" key={skin.name}>
          {skin.player && (
            <h2 className="skin-name" style={{color: '#00aaff'}} dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          )}
          {skin.obl && (
            <h2 className="skin-name" style={{color: 'yellow'}} dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          )}
          {skin.wip && (
            <h2 className="skin-name" style={{color: 'red'}} dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          )}
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
          {skin.freebie && (
            <p className='skin-eventtag'>{skin.eventtag}</p>
          )}
          */}
          {/* Get image width from src */}
          {/*
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
          {skin.wip && (
            <>
            <h4 className='skin-count'>
            <p className='skin-desc'>{skin.description}</p>
            </h4>
            </>
          )}
          {!skin.wip && (
            <>
          <h4 className='skin-count'>{Object.keys(skinCounts ?? {}).length > 0 ? buyFormats(skinCounts[skin.id] ?? 0) : '...'} buys
          <br/>
          <p className='skin-desc'>{skin.description}</p>
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
          </>
          )}
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
      */}
      
      </div>
          </>
        )}
      
    </div>
  );
}

ShopModal.displayName = 'ShopModal';

export default ShopModal;
