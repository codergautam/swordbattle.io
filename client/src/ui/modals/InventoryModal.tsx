import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AccountState, setAccount, updateAccountAsync } from '../../redux/account/slice';
import { Settings, settingsList } from '../../game/Settings';
import api from '../../api';
import * as cosmetics from '../../game/cosmetics.json'

import './InventoryModal.scss'
import { buyFormats, numberWithCommas, sinceFrom } from '../../helpers';
import { Id } from '@reduxjs/toolkit/dist/tsHelpers';
let { skins } = cosmetics;

const basePath = 'assets/game/player/';

interface InventoryModalProps {
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
}

const rotate = false;

const InventoryModal: React.FC<InventoryModalProps> = ({ account }) => {
  const dispatch = useDispatch();
  const [skinStatus, setSkinStatus] = useState<{ [id: number]: string }>({});
  const [skinCounts, setSkinCounts] = useState<{ [id: number]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('norm');

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

  function handleActionClick(id: number) {
    if (skinStatus[id]) return;

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

    const modal = document.querySelector('.inventory-modal');
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

  return account?.isLoggedIn ? (
    <div className="inventory-modal">
      <div className="shop-extra">
      <h1 className='shop-title'>Inventory</h1>
      <h1 className='shop-desc'>Owned Skins: {numberWithCommas(account.skins.owned.length)}</h1>

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
  <div className="settings-line">
        <label htmlFor="showUltimate">Show ultimate skins {' '} </label>
        <label className="switch">
          <input type="checkbox" name="showUltimate" id="showUltimate"
            checked={showUltimate}
            onChange={(e) => updateUltimate(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>
      <br />
      <div className="settings-line">
        <label htmlFor="showEvent">Show event skins {' '} </label>
        <label className="switch">
          <input type="checkbox" name="showEvent" id="showEvent"
            checked={showEvent}
            onChange={(e) => updateEvent(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>
      <br />
      { Object.values(skins).filter((skinData: any) =>  skinData.og && account?.skins.owned.includes(skinData.id)).length > 0 && (
        <>
        <div className="settings-line">
        <label htmlFor="showOG">Show OG skins {' '} </label>
        <label className="switch">
          <input type="checkbox" name="showOG" id="showOG"
            checked={showOG}
            onChange={(e) => updateOG(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>
      </>
      )}
      <br /><br /><br /><br />
      <div className="settings-line">
      <label htmlFor="skinSort">Sort skins using:</label>
      <select name="skinSort" id="skinSort"
        value={skinSort}
        onChange={(e) => updateSkinSort(e.target.value)}
      >
        <option value="low">Price (Low to High)</option>
        <option value="high">Price (High to Low)</option>
        <option value="name">Name</option>
      </select>
      </div>
      
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
        if (!account?.skins.owned.includes(skin.id)) return false;
        if (!Settings.showUltimate && skin.ultimate) return false;
        if (!Settings.showEvent && skin.event) return false;
        if (!Settings.showEvent && skin.eventoffsale) return false;
        if (!Settings.showOG && skin.og) return false;
        
        return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a, b) => sortSkins(a as Skin, b as Skin)).map((skinData: any, index) => {
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
      <button className="buy-button" onClick={() => handleActionClick(skin.id)}>
        {skinStatus[skin.id]
          ? skinStatus[skin.id]
          : equippedSkinId === skin.id
            ? 'Equipped'
            : account.skins.owned.includes(skin.id)
              ? 'Equip'
              : skin.ultimate
                ? 'Unlock'
                : 'Buy'}
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
        <div ref={targetElementRef1}></div>
        <span>Owned Skins</span><hr></hr>
        <p style={{color: '#999999'}}>Use settings at the left to filter skins</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (!account?.skins.owned.includes(skin.id)) return false;
        if (!Settings.showUltimate && skin.ultimate) return false;
        if (!Settings.showEvent && skin.event) return false;
        if (!Settings.showEvent && skin.eventoffsale) return false;
        if (!Settings.showOG && skin.og) return false;
        return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a, b) => sortSkins(a as Skin, b as Skin)).map((skinData: any, index) => {
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
      <button className="buy-button" onClick={() => handleActionClick(skin.id)}>
        {skinStatus[skin.id]
          ? skinStatus[skin.id]
          : equippedSkinId === skin.id
            ? 'Equipped'
            : account.skins.owned.includes(skin.id)
              ? 'Equip'
              : skin.ultimate
                ? 'Unlock'
                : 'Buy'}
      </button>
))}
        </div>
      )
      }
      )}
      </div>
      </div>
          </>
        )}
      
    </div>
  ) : <p>Login to view inventory</p>;
}

InventoryModal.displayName = 'InventoryModal';

export default InventoryModal;
