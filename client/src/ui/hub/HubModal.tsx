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
  { key: 'rewards', label: 'Daily Rewards', icon: <FontAwesomeIcon icon={faGift} />, color: '#4f8fd6' },
];

const loggedInOnly: HubTab[] = ['inventory', 'rewards'];

function HubModal({ account, initialTab = 'shop', onViewProfile, onPreviewSkin }: { account: any; initialTab?: HubTab; onViewProfile?: (u: string) => void; onPreviewSkin?: (id: number) => void }) {
  const loggedIn = !!account?.isLoggedIn;
  const visibleTabs = tabs.filter((t) => loggedIn || !loggedInOnly.includes(t.key));

  const firstVisible = visibleTabs[0]?.key ?? 'shop';
  const safeInitial = visibleTabs.some((t) => t.key === initialTab) ? initialTab : firstVisible;

  const [active, setActive] = useState<HubTab>(safeInitial);
  const [visited, setVisited] = useState<Set<HubTab>>(new Set([safeInitial]));

  const activeTab = visibleTabs.some((t) => t.key === active) ? active : firstVisible;

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
    <div className={`hub tab-${activeTab}`}>
      <div className="hub-tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            className={`hub-tab ${activeTab === t.key ? 'active' : ''}`}
            style={{ ['--tab-color' as any]: t.color }}
            title={t.label}
            onClick={() => switchTab(t.key)}
          >
            <span className="hub-tab-icon">{t.icon}</span>
            <span className="hub-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="hub-content">
        {visibleTabs.map((t) => (visited.has(t.key) || t.key === activeTab) && (
          <div key={t.key} className={`hub-panel ${activeTab === t.key ? 'active' : ''}`}>
            {renderTab(t.key)}
          </div>
        ))}
      </div>
    </div>
  );
}

HubModal.displayName = 'HubModal';

export default HubModal;
