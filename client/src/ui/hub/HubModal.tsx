import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faTrophy, faGift } from '@fortawesome/free-solid-svg-icons';

import ShopModal from '../modals/ShopModal';
import InventoryModal from '../modals/InventoryModal';
import RewardsModal from '../modals/RewardsModal';
import RankingsTab from './RankingsTab';
import BackpackImg from '../../assets/img/backpack.png';
import './HubModal.scss';
import './hubTabs.scss';

export type HubTab = 'shop' | 'inventory' | 'rankings' | 'rewards';

function BackpackIcon() {
  return (
    <span
      className="hub-tab-img"
      style={{ WebkitMaskImage: `url(${BackpackImg})`, maskImage: `url(${BackpackImg})` }}
    />
  );
}

const tabs: { key: HubTab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'shop', label: 'Shop', icon: <FontAwesomeIcon icon={faStore} />, color: '#3aa83a' },
  { key: 'inventory', label: 'Inventory', icon: <BackpackIcon />, color: '#a8743c' },
  { key: 'rankings', label: 'Leaderboard', icon: <FontAwesomeIcon icon={faTrophy} />, color: '#f5c542' },
  { key: 'rewards', label: 'Rewards', icon: <FontAwesomeIcon icon={faGift} />, color: '#4f8fd6' },
];

function HubModal({ account, initialTab = 'shop', onViewProfile, onPreviewSkin }: { account: any; initialTab?: HubTab; onViewProfile?: (u: string) => void; onPreviewSkin?: (id: number) => void }) {
  const [active, setActive] = useState<HubTab>(initialTab);
  const [visited, setVisited] = useState<Set<HubTab>>(new Set([initialTab]));

  const switchTab = (key: HubTab) => {
    setActive(key);
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
  };

  const renderTab = (key: HubTab) => {
    switch (key) {
      case 'shop': return <ShopModal account={account} onPreviewSkin={onPreviewSkin} />;
      case 'inventory': return <InventoryModal account={account} onPreviewSkin={onPreviewSkin} />;
      case 'rankings': return <RankingsTab onViewProfile={onViewProfile} />;
      case 'rewards': return <RewardsModal account={account} />;
    }
  };

  return (
    <div className={`hub tab-${active}`}>
      <div className="hub-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`hub-tab ${active === t.key ? 'active' : ''}`}
            style={{ ['--tab-color' as any]: t.color }}
            title={t.label}
            onClick={() => switchTab(t.key)}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="hub-content">
        {tabs.map((t) => visited.has(t.key) && (
          <div key={t.key} className={`hub-panel ${active === t.key ? 'active' : ''}`}>
            {renderTab(t.key)}
          </div>
        ))}
      </div>
    </div>
  );
}

HubModal.displayName = 'HubModal';

export default HubModal;
