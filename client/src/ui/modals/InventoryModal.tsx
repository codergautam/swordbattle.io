import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AccountState, setAccount, updateAccountAsync } from '../../redux/account/slice';
import { Settings, settingsList } from '../../game/Settings';
import api from '../../api';
import * as cosmetics from '../../game/cosmetics.json'

import './InventoryModal.scss'
import SkinView from '../SkinView';
import { getSkinScale } from '../../game/skinScales';
import { buyFormats, numberWithCommas, sinceFrom } from '../../helpers';
import { Id } from '@reduxjs/toolkit/dist/tsHelpers';
import { confirmDialog, showDialog } from '../PromptDialog';
let { skins } = cosmetics;

const basePath = 'assets/game/player/';

interface InventoryModalProps {
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

  currency?: boolean;
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
  account: AccountState;
  skinStatus: { [id: number]: string };
  equippedSkinId: number | null;
  onActionClick: (id: number) => void;
}

const SkinGrid: React.FC<SkinGridProps> = ({
  skins, filter, sort, searchTerm, highlightSearchTerm, skinCounts,
  assignRef, account, skinStatus, equippedSkinId, onActionClick,
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
                  </>
                ) : (
                  skin?.ultimate
                    ? <>{skin.buyable ? '0' : ''}<img className={'gem'} src='assets/game/ultimacy.png' alt='' width={18} height={18} /></>
                    : (skin?.buyable ? 'Free' : '')
                )}
              </span>
              <span className='skin-buys'>{Object.keys(skinCounts ?? {}).length > 0 ? buyFormats(skinCounts[skin.id] ?? 0) : '...'} buys</span>
            </div>
            {account?.isLoggedIn && (skin.buyable || account.skins.owned.includes(skin.id)) && (() => {
              const owned = account.skins.owned.includes(skin.id);
              const equipped = equippedSkinId === skin.id;
              const price = skin.price ?? 0;
              const currency = skin.ultimate ? account.mastery : account.gems;
              const afford = price <= 0 || currency >= price;
              const state = equipped ? 'equipped' : owned ? 'owned' : afford ? 'afford' : 'cantafford';
              return (
                <button className={`buy-button buy-${state}`} onClick={() => onActionClick(skin.id)}>
                  {skinStatus[skin.id] ? skinStatus[skin.id] : equipped ? 'Equipped' : owned ? 'Equip' : skin.ultimate ? 'Unlock' : 'Buy'}
                </button>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
};

const InventoryModal: React.FC<InventoryModalProps> = ({ account, onPreviewSkin }) => {
  const dispatch = useDispatch();
  const [skinStatus, setSkinStatus] = useState<{ [id: number]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [skinCounts, setSkinCounts] = useState<{ [id: number]: number }>({});
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

  function accountHasBan() {
    return account?.isLoggedIn && account?.username?.startsWith(".");
  }

  async function handleActionClick(id: number) {
    if (onPreviewSkin) { onPreviewSkin(id); return; }
    if (skinStatus[id]) return;

    if (accountHasBan() && equippedSkinId !== id && account.skins.owned.includes(id)) {
      await showDialog('Skins cannot be equipped.');
      return;
    }

    if (equippedSkinId === id) return; // Already equipped

    const isOwned = account.skins.owned.includes(id);
    const skinObj: any = Object.values(skins).find((s: any) => s.id === id);

    if (!isOwned) {
      if (skinObj?.ultimate && skinObj?.original && !account.skins.owned.includes(skinObj.original)) {
        const orig: any = Object.values(skins).find((s: any) => s.id === skinObj.original);
        await showDialog(`You need to own the "${orig?.displayName ?? 'original'}" skin before you can unlock the "${skinObj?.displayName ?? 'this'}" skin!`);
        return;
      }
      if (!await confirmDialog(`Do you want to ${skinObj?.ultimate ? 'unlock' : 'buy'} the "${skinObj?.displayName ?? 'this'}" skin?`, 'Confirm purchase', skinObj?.ultimate ? 'Unlock' : 'Buy')) return;
    }

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
        void showDialog(data.error, 'Inventory');
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
      api.get(`${api.endpoint}/profile/skins/buys?${Date.now()}`, (data) => {
        if (data.error) { void showDialog('Could not fetch skin counts.', 'Inventory'); return; }
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
      <div className="shop-headrow">
        <h1 className='shop-title'>Inventory</h1>
        <div className='shop-counters shop-counters-login'>Owned Skins: {numberWithCommas(account.skins.owned.length)}</div>
      </div>

<div className='search-bar'>
<input
        type="text"
        placeholder="Search skins..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
</div>

<div className="inv-filters">
  <div className="inv-toggles">
    <div className="settings-line">
      <label htmlFor="showUltimate">Show Ultimate Skins</label>
      <label className="switch">
        <input type="checkbox" name="showUltimate" id="showUltimate"
          checked={showUltimate} onChange={(e) => updateUltimate(e.target.checked)} />
        <span className="slider round"></span>
      </label>
    </div>
    <div className="settings-line">
      <label htmlFor="showEvent">Show Event Skins</label>
      <label className="switch">
        <input type="checkbox" name="showEvent" id="showEvent"
          checked={showEvent} onChange={(e) => updateEvent(e.target.checked)} />
        <span className="slider round"></span>
      </label>
    </div>
    {Object.values(skins).filter((skinData: any) => skinData.og && account?.skins.owned.includes(skinData.id)).length > 0 && (
      <div className="settings-line">
        <label htmlFor="showOG">Show OG Skins</label>
        <label className="switch">
          <input type="checkbox" name="showOG" id="showOG"
            checked={showOG} onChange={(e) => updateOG(e.target.checked)} />
          <span className="slider round"></span>
        </label>
      </div>
    )}
  </div>
  <div className="inv-sortrow">
    <div className="settings-line">
      <label htmlFor="skinSort">Sort skins using:</label>
      <select name="skinSort" id="skinSort" value={skinSort} onChange={(e) => updateSkinSort(e.target.value)}>
        <option value="low">Price (Low to High)</option>
        <option value="high">Price (High to Low)</option>
        <option value="name">Name</option>
      </select>
    </div>
    <span className="inv-loadnote">(Skins may take a while to fully load)</span>
  </div>
      </div>
      </div>
      {searchTerm && (
        <>
        <div className='scroll' ref={targetParentRef}>
        <SkinGrid
          skins={skins}
          filter={(skin) => {
            if (skin.currency) return false;
            if (!account?.skins.owned.includes(skin.id)) return false;
            return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
          }}
          sort={sortSkins}
          searchTerm={searchTerm}
          highlightSearchTerm={highlightSearchTerm}
          skinCounts={skinCounts}
          assignRef={assignRef}
          account={account}
          skinStatus={skinStatus}
          equippedSkinId={equippedSkinId}
          onActionClick={handleActionClick}
        />
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
        </div>
        <SkinGrid
          skins={skins}
          filter={(skin) => {
            if (skin.currency) return false;
            if (!account?.skins.owned.includes(skin.id)) return false;
            if (!Settings.showUltimate && skin.ultimate) return false;
            if (!Settings.showEvent && skin.event) return false;
            if (!Settings.showEvent && skin.eventoffsale) return false;
            if (!Settings.showOG && skin.og) return false;
            return skin.displayName.toLowerCase().includes(searchTerm.toLowerCase());
          }}
          sort={sortSkins}
          searchTerm={searchTerm}
          highlightSearchTerm={highlightSearchTerm}
          skinCounts={skinCounts}
          assignRef={assignRef}
          account={account}
          skinStatus={skinStatus}
          equippedSkinId={equippedSkinId}
          onActionClick={handleActionClick}
        />
      </div>
          </>
        )}
      
    </div>
  ) : <p>Login to view inventory</p>;
}

InventoryModal.displayName = 'InventoryModal';

export default InventoryModal;
