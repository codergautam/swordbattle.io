import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AccountState, setAccount, updateAccountAsync } from '../../redux/account/slice';
import { Settings } from '../../game/Settings';
import api from '../../api';
import * as cosmetics from '../../game/cosmetics.json'

import './ShopModal.scss'
import { buyFormats, numberWithCommas } from '../../helpers';
import { Id } from '@reduxjs/toolkit/dist/tsHelpers';
let { skins } = cosmetics;
let { crates } = cosmetics;

const basePath = 'assets/game/player/';
const crateBasePath = 'assets/game/crate/';

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
  crates: number[];
}

interface Crate {
  name: string;
  displayName: string;
  id: number;
  buyable: boolean;
  price?: number;
  description?: string;
  crateFileName: string;
  rarityChances?: { [key: string]: number };
  noquotes?: boolean;
  unlisted?: boolean;
}

const rotate = false;

const ShopModal: React.FC<ShopModalProps> = ({ account }) => {
  const dispatch = useDispatch();
  const [skinStatus, setSkinStatus] = useState<{ [id: number]: string }>({});
  const [skinCounts, setSkinCounts] = useState<{ [id: number]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('skin');
   const [badgeID, setBadgeID] = useState<number>(0);

  useEffect(() => {
    console.log('selectedBadge:', selectedBadge, 'badgeID:', badgeID);
  }, [selectedBadge, badgeID]);

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

  const scrollToTarget = () => {
    if (selectedBadge !== 'skin') {
      setSelectedBadge('skin');
    }
  };

  const targetElementRef1 = useRef<HTMLDivElement>(null);

  const [pendingScrollToTarget1, setPendingScrollToTarget1] = useState(false);

  const scrollToTarget1 = () => {
    if (selectedBadge !== 'skin') {
      setSelectedBadge('skin');
      setPendingScrollToTarget1(true);
    } else {
      if (targetParentRef.current && targetElementRef1.current) {
        targetElementRef1.current.scrollIntoView({ behavior: 'smooth' });
      } else {
        console.error("Target element not found");
      }
    }
  };

  useEffect(() => {
    if (pendingScrollToTarget1 && selectedBadge === 'skin') {
      if (targetParentRef.current && targetElementRef1.current) {
        targetElementRef1.current.scrollIntoView({ behavior: 'smooth' });
        setPendingScrollToTarget1(false);
      }
    }
  }, [pendingScrollToTarget1, selectedBadge]);

  const targetElementRef2 = useRef<HTMLDivElement>(null);

  const [pendingScrollToTarget2, setPendingScrollToTarget2] = useState(false);

  const scrollToTarget2 = () => {
    if (selectedBadge !== 'skin') {
      setSelectedBadge('skin');
      setPendingScrollToTarget2(true);
    } else {
      if (targetParentRef.current && targetElementRef2.current) {
        targetElementRef2.current.scrollIntoView({ behavior: 'smooth' });
      } else {
        console.error("Target element not found");
      }
    }
  };

  useEffect(() => {
    if (pendingScrollToTarget2 && selectedBadge === 'skin') {
      if (targetParentRef.current && targetElementRef2.current) {
        targetElementRef2.current.scrollIntoView({ behavior: 'smooth' });
        setPendingScrollToTarget2(false);
      }
    }
  }, [pendingScrollToTarget2, selectedBadge]);

  const targetElementRef3 = useRef<HTMLDivElement>(null);

  const scrollToTarget3 = () => {
    if (targetParentRef.current && targetElementRef3.current) {
      targetElementRef3.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error("Target element not found");
    }
  };

  const targetElementRef4 = useRef<HTMLDivElement>(null);

  const [pendingScrollToTarget4, setPendingScrollToTarget4] = useState(false);

  const scrollToTarget4 = () => {
    if (selectedBadge !== 'ult') {
      setSelectedBadge('ult');
      setPendingScrollToTarget4(true);
    } else {
      if (targetParentRef.current && targetElementRef4.current) {
        targetElementRef4.current.scrollIntoView({ behavior: 'smooth' });
      } else {
        console.error("Target element not found");
      }
    }
  };

  useEffect(() => {
    if (pendingScrollToTarget4 && selectedBadge === 'ult') {
      if (targetParentRef.current && targetElementRef4.current) {
        targetElementRef4.current.scrollIntoView({ behavior: 'smooth' });
        setPendingScrollToTarget4(false);
      }
    }
  }, [pendingScrollToTarget4, selectedBadge]);

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
      {selectedBadge === 'crate' ? (
        <>
        <div className='crate-extra'>
        <h1 className='main-text'>
          {Object.values(crates).find((crate: any) => crate.id === badgeID)?.displayName || 'Crate not found'}
        </h1>
        <img
            src={
              crateBasePath +
              (Object.values(crates).find((crate: any) => crate.id === badgeID)?.crateFileName || 'Crate not found')
            }
            alt={Object.values(crates).find((crate: any) => crate.id === badgeID)?.name || 'Crate not found'}
            ref={(el) => assignRef(el as HTMLImageElement, 0)}
            className='crate-img'
            data-selected='crate'
          />
        <p>
          {(() => {
            const crate = Object.values(crates).find((crate: any) => crate.id === badgeID);
            if (!crate) return 'Crate';
            if (crate.noquotes) {
              return crate.description;
            }
            return `"${crate.description}"`;
          })()}
        </p>
        {/* Rarity chances list */}
        <div className="crate-rarities">
          <h3 style={{ marginBottom: 8 }}>Rarity Chances</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(() => {
              const crate = Object.values(crates).find((crate: any) => crate.id === badgeID);
              if (!crate || !crate.rarityChances) return null;
              const rarityOrder = [
                { key: 'common', label: 'Common', color: '#b0b0b0' },
                { key: 'uncommon', label: 'Uncommon', color: '#4caf50' },
                { key: 'rare', label: 'Rare', color: '#4fc3f7' },
                { key: 'epic', label: 'Epic', color: '#a259e6' },
                { key: 'legendary', label: 'Legendary', color: '#ffe066' },
                { key: 'mythical', label: 'Mythical', color: '#ff5252' },
                { key: 'master', label: 'Master', color: 'linear-gradient(90deg, #ff5252, #ffe066, #4fc3f7, #4caf50, #a259e6)' }
              ];
              return rarityOrder.map(rarity => {
                const chance = crate.rarityChances[rarity.key as keyof typeof crate.rarityChances];
                if (!chance || chance <= 0) return null;
                const style = rarity.key === 'master'
                  ? { background: rarity.color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }
                  : { color: rarity.color, fontWeight: 600 };
                return (
                  <li key={rarity.key} style={{ marginBottom: 2 }}>
                    <span style={style}>{rarity.label}</span>: {chance}%
                  </li>
                );
              });
            })()}
          </ul>
        </div>
        <div className='crate-price'>
        <span>
          {Object.values(crates).find((crate: any) => crate.id === badgeID)?.price || 'Crate'}
        <img className={'gem'} src='assets/game/gem.png' alt='Gems' width={23} height={23} /></span><br></br><br></br>
        <button
          className='buy-button'
          onClick={() => {
            // Buy the crate with the current badgeID
            handleActionClick(badgeID);
          }}
        >
          {skinStatus[badgeID] || 'Buy'}
        </button>
        </div>
        </div>
        </>
        ) : (
          <>
          <div className="shop-extra">
      <h1 className='shop-title'>Shop</h1>
      {account?.isLoggedIn ? (
      <h1 className='shop-desc'>Gems: {numberWithCommas(account.gems)}<img className={'gem'} src='assets/game/gem.png' alt='Gems' width={30} height={30} /><br></br>Mastery: {numberWithCommas(account.ultimacy)}<img className={'gem'} src='assets/game/ultimacy.png' alt='Gems' width={30} height={30} /></h1>
      ) : (
        <h1 className='shop-desc'><b>Login or Signup</b> to buy stuff from the shop!<br/>Earn gems by stabbing players and collecting coins around the map!</h1>
      )}
{/*
<div className='search-bar'>
<input
        type="text"
        placeholder="Search skins..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
</div>
*/}
<div className="badges">
<button onClick={scrollToTarget1} data-selected-badge="sale">Crates</button>
<button onClick={scrollToTarget2}>Normal Skins</button>
<button onClick={() => setSelectedBadge('ult')} data-selected-badge="ultimate">Ultimate Skins</button>
<button onClick={() => setSelectedBadge('event')} data-selected-badge="event">Event Skins</button>

{account?.isLoggedIn && (
          <button onClick={() => setSelectedBadge('own')} data-selected-badge="own">Owned Skins</button>
          )}

        
  { Object.values(skins).filter((skinData: any) =>  skinData.og && account?.skins.owned.includes(skinData.id)).length > -1 && (
    <>
        <button onClick={() => setSelectedBadge('og')} data-selected-badge="og">OG Skins</button>
        </>
  )}
<button onClick={scrollToTarget7} data-selected-badge="player">Special Skins</button>
      </div>
      </div>
          </>
        )}
      
      {searchTerm && (
        <>
        <div className='scroll' ref={targetParentRef}>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (skin.og) return false;
        
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
      <br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br>
      </div>
        </>
      )}
       {selectedBadge === 'skin' && (
          <>
          <div className='scroll' ref={targetParentRef}>
            <div className='label'>
        <span style={{color: 'yellow'}}>New Skins</span><hr></hr>
        <p style={{color: '#ffffaa'}}>All new skins from Part 1 of the Summer Update</p>
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
          {(() => {
            let rarityBg = '';
            let rarityText = '';
            let rarityColor = '';
            if ((skin?.price ?? 0) < 1000) {
              rarityBg = '#b0b0b0';
              rarityText = 'Common';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 4000) {
              rarityBg = '#4cbf50';
              rarityText = 'Uncommon';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 10000) {
              rarityBg = '#4fc3f7';
              rarityText = 'Rare';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 35000) {
              rarityBg = '#a222e6';
              rarityText = 'Epic';
              rarityColor = '#ffffffbb';
            } else if ((skin?.price ?? 0) < 100000) {
                rarityBg = '#e0d000';
              rarityText = 'Legendary';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 400000) {
              rarityBg = '#b71c1c';
              rarityText = 'Mythical';
              rarityColor = '#ffffffcc';
            } else {
              rarityBg = 'linear-gradient(90deg, #ff5252, #ffe066, #4fc3f7, #4caf50, #a259e6)';
              rarityText = 'Master';
              rarityColor = '#000000bb';
            }
            return !skin.ultimate && (
                  <div
                    style={{
                      background: rarityBg,
                      borderRadius: 10,
                      padding: 8,
                      marginBottom: 8,
                      marginTop: 0,
                      marginLeft: 0,
                      marginRight: 0,
                      width: '95%',
                      textAlign: 'center',
                      ...(typeof rarityBg === 'string' && rarityBg.startsWith('linear-gradient') ? { color: '#fff' } : {}),
                    }}
                  >
                    <span
                      style={
                        typeof rarityColor === 'string' && rarityColor.startsWith('linear-gradient')
                          ? {
                              background: rarityColor,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              fontWeight: 600,
                              fontSize: 16,
                              display: 'inline-block',
                            }
                          : {
                              color: rarityColor,
                              fontWeight: 600,
                              fontSize: 16,
                              display: 'inline-block',
                            }
                      }
                    >
                      {rarityText}
                    </span>
                  </div>
                );
          })()}
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
      <br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br>
      <div className='label'>
        <div ref={targetElementRef1}></div>
        <span style={{color: 'orange'}}>Crates</span><hr></hr>
        <p style={{color: '#ffffff'}}>Open crates to receive skins! Each crate comes with its own set of skins that you can obtain.</p>
        </div>
        <div className='skins'>
      {Object.values(crates).filter((crateData: any) => {
        const crate = crateData as Crate;
        if (crate.unlisted) return false;
        
        return crate.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a: any, b: any) => a.price - b.price).map((crateData: any, index) => {
        const crate = crateData as Crate;
        return (
        <div className="skin-card" key={crate.name}>
          <h2 className="skin-name" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(crate.displayName, searchTerm) }}></h2>

          <img
            src={crateBasePath + crate.crateFileName}
            alt={crate.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
                <h4 className='skin-count'>
                <br/>
                
                {
        (crate?.price ?? 0) > 0 ? (
          <>
            {crate?.price} 
            <img className={'gem'} src='assets/game/gem.png' alt='Gems' width={20} height={20} />
          </>
        ) : (
          <>
            <p style={{ marginLeft: 0, marginRight: 0, marginBottom: 0, marginTop: 7 }}>
              {crate?.buyable ? 'Free' : ''}
            </p>
          </>
        )
      }
                </h4>
          {(account?.isLoggedIn && crate.buyable && (
  <button onClick={() => { setSelectedBadge('crate'); setBadgeID(crate.id); }} className='buy-button'>View</button>
))}
      </div>
      )
      }
      )}
      </div>
        <div className='label'>
        <div ref={targetElementRef2}></div>
        <span>Normal Skins</span><hr></hr>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (skin.special) return false;
        if (skin.wip) return false;
        if (skin.ultimate) return false;
        if (skin.player) return false;
        if (skin.freebie) return false;
        if (skin.eventoffsale) return false;
        if (skin.event) return false;
        if (skin.og) return false;
        if (skin.currency) return false;
        return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a: any, b: any) => a.price - b.price).map((skinData: any, index) => {
        const skin = skinData as Skin;
        return (
        <div className="skin-card" key={skin.name}>
          <h2 className="skin-name" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          {(() => {
            let rarityBg = '';
            let rarityText = '';
            let rarityColor = '';
            if ((skin?.price ?? 0) < 1000) {
              rarityBg = '#b0b0b0';
              rarityText = 'Common';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 4000) {
              rarityBg = '#4cbf50';
              rarityText = 'Uncommon';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 10000) {
              rarityBg = '#4fc3f7';
              rarityText = 'Rare';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 35000) {
              rarityBg = '#a222e6';
              rarityText = 'Epic';
              rarityColor = '#ffffffbb';
            } else if ((skin?.price ?? 0) < 100000) {
                rarityBg = '#e0d000';
              rarityText = 'Legendary';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 400000) {
              rarityBg = '#b71c1c';
              rarityText = 'Mythical';
              rarityColor = '#ffffffcc';
            } else {
              rarityBg = 'linear-gradient(90deg, #ff5252, #ffe066, #4fc3f7, #4caf50, #a259e6)';
              rarityText = 'Master';
              rarityColor = '#000000bb';
            }
            return (
                <div
                style={{
                  background: rarityBg,
                  borderRadius: 10,
                  padding: 8,
                  marginBottom: 8,
                  marginTop: 0,
                  marginLeft: 0,
                  marginRight: 0,
                  width: '95%',
                  textAlign: 'center',
                  ...(typeof rarityBg === 'string' && rarityBg.startsWith('linear-gradient') ? { color: '#fff' } : {}),
                }}
                >
                <span
                  style={
                  typeof rarityColor === 'string' && rarityColor.startsWith('linear-gradient')
                    ? {
                      background: rarityColor,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 600,
                      fontSize: 16,
                      display: 'inline-block',
                    }
                    : {
                      color: rarityColor,
                      fontWeight: 600,
                      fontSize: 16,
                      display: 'inline-block',
                    }
                  }
                >
                  {rarityText}
                </span>
                </div>
            );
          })()}
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
      <br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br>
      <div className='label'>
        <div ref={targetElementRef7}></div>
        <span style={{color: 'blue'}}>Special Skins</span><hr></hr>
        <p style={{color: 'white'}}>Special skins are miscellaneous skins that are (currently) either skins for random skin events or are temporary skins that may or may not be fully added to the game.</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (!skin.special) return false;
        
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
          {skin.ultimate && !skin.obl && (
            <h2 className="skin-name" style={{color: 'white'}} dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
      <br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br>
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
      </div>
          </>
        )}
      
      {selectedBadge === 'crate' && (
      <>
      <div className='scroll-crate' ref={targetParentRef}>
        <span><button className="back-button" onClick={() =>{
       setSelectedBadge('skin');
      }}>X</button><h1 className='crate-desc'>Gems: {numberWithCommas(account.gems)}<img className={'gem'} src='assets/game/gem.png' alt='Gems' width={30} height={30} /> | Skins in crate: {Object.values(skins).filter((skinData: any) => {
          const skin = skinData as Skin;
          return Array.isArray(skin.crates) && skin.crates.includes(badgeID);
        }).length}</h1></span>
      <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (!skin.crates || !(skin.crates as number[]).includes(badgeID)) return false;

        return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      }).sort((a: any, b: any) => a.price - b.price).map((skinData: any, index) => {
        const skin = skinData as Skin;
        console.log('Skin crates:', skin.crates); // Log skin.crates
        return (
        <div className="skin-card" key={skin.name}>
          <h2 className="skin-name" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(skin.displayName, searchTerm) }}></h2>
          {(() => {
            let rarityBg = '';
            let rarityText = '';
            let rarityColor = '';
            if ((skin?.price ?? 0) < 1000) {
              rarityBg = '#b0b0b0';
              rarityText = 'Common';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 4000) {
              rarityBg = '#4cbf50';
              rarityText = 'Uncommon';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 10000) {
              rarityBg = '#4fc3f7';
              rarityText = 'Rare';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 35000) {
              rarityBg = '#a222e6';
              rarityText = 'Epic';
              rarityColor = '#ffffffbb';
            } else if ((skin?.price ?? 0) < 100000) {
                rarityBg = '#e0d000';
              rarityText = 'Legendary';
              rarityColor = '#ffffff';
            } else if ((skin?.price ?? 0) < 400000) {
              rarityBg = '#b71c1c';
              rarityText = 'Mythical';
              rarityColor = '#ffffffcc';
            } else {
              rarityBg = 'linear-gradient(90deg, #ff5252, #ffe066, #4fc3f7, #4caf50, #a259e6)';
              rarityText = 'Master';
              rarityColor = '#000000bb';
            }
            return (
                <div
                style={{
                  background: rarityBg,
                  borderRadius: 10,
                  padding: 8,
                  marginBottom: 8,
                  marginTop: 0,
                  marginLeft: 0,
                  marginRight: 0,
                  width: '95%',
                  textAlign: 'center',
                  ...(typeof rarityBg === 'string' && rarityBg.startsWith('linear-gradient') ? { color: '#fff' } : {}),
                }}
                >
                <span
                  style={
                  typeof rarityColor === 'string' && rarityColor.startsWith('linear-gradient')
                    ? {
                      background: rarityColor,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 600,
                      fontSize: 16,
                      display: 'inline-block',
                    }
                    : {
                      color: rarityColor,
                      fontWeight: 600,
                      fontSize: 16,
                      display: 'inline-block',
                    }
                  }
                >
                  {rarityText}
                </span>
                </div>
            );
          })()}
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
        </div>
      )
      }
      )}
      </div>
      </div>
      </>
    )}
    {selectedBadge === 'own' && (
        <>
        {account?.isLoggedIn && (
        <>
        <div className='scroll'>
          <div className='label'>
        <span>Owned Skins</span><hr></hr>
        <p>Skins you own can still be equipped from other menus, but using this menu will make it much easier to find them.</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (skin.og) return false;
        if (skin.currency) return false;
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
      </div>
          </>
          )}
        </>
    )}
    {selectedBadge === 'og' && (
      <>
      <div className='scroll'>
      { Object.values(skins).filter((skinData: any) =>  skinData.og && account?.skins.owned.includes(skinData.id)).length > -1 && (
    <>
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
        if (!account?.skins.owned.includes(skin.id)) return true;
        
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
<br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br>
        </div>
      )
      }
      )}
      </div>
      </div>
      </>)}
      {selectedBadge === 'ult' && (
      <>
      <div className='scroll'>
      <div className='label'>
        <span>Ultimate Skins</span><hr></hr>
        <p>Ultimate skins are remakes of normal skins and are obtained by earning mastery instead of spending gems. <br></br><span style={{color: 'red'}}>Unlocking ultimate skins DOES NOT take away any mastery. The original skin must be owned before unlocking the ultimate version.</span><br></br>(The original version of an Ultimate is based on it's Tag. For example, the "Ultimate Blueberry" Tag means the original skin is Blueberry)</p>
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
      </div>
      </>)}
      {selectedBadge === 'event' && (
        <>
        <div className='scroll'>
        <div className='label'>
        <span>Event Skins</span><hr></hr>
        <p>Event skins are available from holidays or seasonal events that happen annually, and can no longer be bought once the event ends.<br></br> They'll never be unbuyable permanently, so make sure to drop by during these events to claim them!</p>
        </div>
        <div className='skins'>
      {Object.values(skins).filter((skinData: any) => {
        const skin = skinData as Skin;
        if (!skin.eventoffsale) return false;
        if (skin.currency) return false;
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

          <img
            src={basePath + skin.bodyFileName}
            alt={skin.name}
            ref={(el) => assignRef(el as HTMLImageElement, index)}
            className='skin-img'
            data-selected='skin'
          />
          {Settings.swords && (
          <img
          src={basePath + skin.swordFileName}
          alt={skin.name}
          ref={(el) => assignRef(el as HTMLImageElement, index)}
          className='skin-sword'
          data-selected='skin'
        />
          )}
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
      </div>
        </>)}
    </div>
  );
}

ShopModal.displayName = 'ShopModal';

export default ShopModal;
