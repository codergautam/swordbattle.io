import { useState, useCallback, useRef } from 'react';
import { AccountState } from '../../redux/account/slice';
import api from '../../api';

import gemRewardImg from '../../assets/img/gem-reward.png';
import ultimacyRewardImg from '../../assets/img/ultimacy-reward.png';
import twoXpRewardImg from '../../assets/img/2xp-reward.png';

import './RewardsModal.scss';

interface RewardsModalProps {
  account: AccountState;
}

type RewardType = 'gem' | 'ultimacy' | '2xp' | 'skin';
type RewardState = 'claimed' | 'claimable' | 'locked';

interface DayReward {
  day: number;
  type: RewardType;
  label: string;
  image: string;
  state: RewardState;
}

// Daily reward skins sorted by id (ascending)
const DAILY_REWARD_SKINS = [
  { displayName: 'Shiny', bodyFileName: 'shinyPlayer.png' },
  { displayName: 'Redshift', bodyFileName: 'redshiftPlayer.png' },
  { displayName: 'Watercolors', bodyFileName: 'watercolorsPlayer.png' },
  { displayName: 'Leader', bodyFileName: 'leaderPlayer.png' },
  { displayName: 'Flaming', bodyFileName: 'flamingPlayer.png' },
  { displayName: 'Fragment', bodyFileName: 'fragmentPlayer.png' },
  { displayName: 'CMYK Luminous', bodyFileName: 'cmykLuminousPlayer.png' },
  { displayName: 'Astral', bodyFileName: 'astralPlayer.png' },
];

const XP_BOOST_DURATIONS = ['10min', '20min', '30min', '15min'];

function getGemMasteryAmount(day: number): number {
  if (day <= 30) return 500 + (day - 1) * 125;
  if (day <= 180) return 500 + (day - 31) * 10;
  return Math.min(500 + (day - 181) * 2, 1250);
}

// Count total 2xp reward instances in days [1..day-1]
function count2xpBefore(day: number): number {
  const upper1 = Math.min(82, day - 1);
  const part1 = upper1 >= 6 ? Math.floor((upper1 - 6) / 7) + 1 : 0;
  if (day <= 83) return part1;

  const upper2 = day - 1;
  const pos5count = upper2 >= 83 ? Math.floor((upper2 - 83) / 7) + 1 : 0;
  const pos2count = upper2 >= 87 ? Math.floor((upper2 - 87) / 7) + 1 : 0;
  return part1 + pos5count + pos2count;
}

// Deterministic reward for each day number
function getRewardForDay(day: number): { type: RewardType; label: string; image: string } {
  const posInWeek = (day - 1) % 7;

  if (day <= 82) {
    // Original pattern: pos 0-4 = gem/mastery, pos 5 = 2xp, pos 6 = skin
    if (posInWeek === 6) {
      const skinIdx = Math.floor((day - 1) / 7) % DAILY_REWARD_SKINS.length;
      const skin = DAILY_REWARD_SKINS[skinIdx];
      return { type: 'skin', label: 'Skin', image: `assets/game/player/${skin.bodyFileName}` };
    }
    if (posInWeek === 5) {
      const xpIdx = count2xpBefore(day) % 4;
      return { type: '2xp', label: XP_BOOST_DURATIONS[xpIdx], image: twoXpRewardImg };
    }
    const weekIdx = Math.floor((day - 1) / 7);
    const isUltimacy = (posInWeek + weekIdx) % 2 === 1;
    const amount = getGemMasteryAmount(day);
    return {
      type: isUltimacy ? 'ultimacy' : 'gem',
      label: `+${amount}`,
      image: isUltimacy ? ultimacyRewardImg : gemRewardImg,
    };
  }

  // Day > 82: new weekly pattern (no skin rewards)
  // Odd week: gems, mastery, 2xp, gems, mastery, 2xp, gems
  // Even week: mastery, gems, 2xp, mastery, gems, 2xp, mastery
  const week = Math.floor((day - 1) / 7) + 1;
  const isOddWeek = week % 2 === 1;
  const oddPattern: RewardType[] = ['gem', 'ultimacy', '2xp', 'gem', 'ultimacy', '2xp', 'gem'];
  const evenPattern: RewardType[] = ['ultimacy', 'gem', '2xp', 'ultimacy', 'gem', '2xp', 'ultimacy'];
  const rewardType = (isOddWeek ? oddPattern : evenPattern)[posInWeek];

  if (rewardType === '2xp') {
    const xpIdx = count2xpBefore(day) % 4;
    return { type: '2xp', label: XP_BOOST_DURATIONS[xpIdx], image: twoXpRewardImg };
  }

  const amount = getGemMasteryAmount(day);
  return {
    type: rewardType,
    label: `+${amount}`,
    image: rewardType === 'ultimacy' ? ultimacyRewardImg : gemRewardImg,
  };
}

const DAYS_PER_PAGE = 28;

const RewardsModal: React.FC<RewardsModalProps> = ({ account }) => {
  // Internal state token to prevent replay / tampered claims
  const claimNonce = useRef(Date.now());

  // TODO: Replace mock data with actual account reward state from server
  const [currentStreak, setCurrentStreak] = useState(5);
  const [claimedDays, setClaimedDays] = useState<Set<number>>(() => new Set([1, 2, 3, 4]));
  const [nextClaimableDay, setNextClaimableDay] = useState(5);
  const [page, setPage] = useState(0);
  const [claiming, setClaiming] = useState(false);

  // Progress bar mock state
  const [playTimeSeconds] = useState(315); // 5min 15s
  const requiredSeconds = 600; // 10min

  const pageStart = page * DAYS_PER_PAGE + 1;
  const pageEnd = pageStart + DAYS_PER_PAGE - 1;

  // Build rewards for current page
  const rewards: DayReward[] = [];
  for (let i = 0; i < DAYS_PER_PAGE; i++) {
    const day = pageStart + i;
    const { type, label, image } = getRewardForDay(day);
    let state: RewardState;
    if (claimedDays.has(day)) {
      state = 'claimed';
    } else if (day === nextClaimableDay) {
      state = 'claimable';
    } else {
      state = 'locked';
    }
    rewards.push({ day, type, label, image, state });
  }

  const bonusPercent = Math.min(currentStreak, 100);
  const progressPercent = Math.min((playTimeSeconds / requiredSeconds) * 100, 100);

  // Secure claim handler — validates against React state, NOT DOM attributes
  const handleClaim = useCallback((day: number) => {
    // Guard: prevent double-click / race
    if (claiming) return;

    // Security: verify against authoritative React state
    if (day !== nextClaimableDay) {
      console.warn('[Rewards] Rejected claim for non-claimable day:', day);
      return;
    }
    if (claimedDays.has(day)) {
      console.warn('[Rewards] Day already claimed:', day);
      return;
    }
    if (!account?.isLoggedIn) {
      console.warn('[Rewards] Must be logged in to claim');
      return;
    }

    setClaiming(true);
    const nonce = ++claimNonce.current;

    // TODO: Wire to real API — server must validate claim server-side
    // api.post(`${api.endpoint}/rewards/claim`, { day, nonce }, (data) => {
    //   if (data.error) { alert(data.error); setClaiming(false); return; }
    //   // Use server response to update state
    // });

    // Temporary local state update (remove when API is wired)
    setTimeout(() => {
      // Verify nonce hasn't changed (no concurrent claim)
      if (claimNonce.current !== nonce) return;
      setClaimedDays(prev => new Set([...prev, day]));
      setNextClaimableDay(day + 1);
      setClaiming(false);
    }, 200);
  }, [nextClaimableDay, claimedDays, account, claiming]);

  const handleClaimAll = useCallback(() => {
    if (!account?.isLoggedIn || claiming) return;
    if (nextClaimableDay < pageStart || nextClaimableDay > pageEnd) return;
    handleClaim(nextClaimableDay);
  }, [account, claiming, nextClaimableDay, pageStart, pageEnd, handleClaim]);

  const handleClaimNext = useCallback(() => {
    handleClaim(nextClaimableDay);
  }, [handleClaim, nextClaimableDay]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}min ${sec}s`;
  };

  return (
    <div className="rewards-modal">
      <h1 className="rewards-title">Daily Rewards</h1>

      <div className="rewards-streak">
        <span className="streak-text">Current Streak: {currentStreak}</span>
        <span className="streak-arrow">&rarr;</span>
        <span className="streak-bonus">+{bonusPercent}% Bonus</span>
      </div>

      <div className="rewards-grid">
        {rewards.map((reward) => {
          const isClaimable = reward.state === 'claimable';

          return (
            <div
              key={reward.day}
              className={`reward-cell ${reward.state}`}
              onClick={isClaimable && !claiming ? () => handleClaim(reward.day) : undefined}
              role={isClaimable ? 'button' : undefined}
              tabIndex={isClaimable ? 0 : -1}
              onKeyDown={isClaimable ? (e) => { if (e.key === 'Enter') handleClaim(reward.day); } : undefined}
            >
              <span className="reward-label">{reward.label}</span>
              <img
                src={reward.image}
                alt={reward.type}
                className="reward-icon"
                draggable={false}
              />
            </div>
          );
        })}
      </div>

      <div className="rewards-controls">
        <button
          className="rewards-btn-action claim-all"
          onClick={handleClaimAll}
          disabled={!account?.isLoggedIn || claiming || nextClaimableDay < pageStart || nextClaimableDay > pageEnd}
        >
          Claim All
        </button>

        <button
          className="rewards-btn-nav"
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
        >
          &#9664;
        </button>

        <span className="rewards-page-label">Days {pageStart}-{pageEnd}</span>

        <button
          className="rewards-btn-nav"
          onClick={() => setPage(page + 1)}
        >
          &#9654;
        </button>

        <button
          className="rewards-btn-action claim-next"
          onClick={handleClaimNext}
          disabled={!account?.isLoggedIn || claiming || nextClaimableDay < pageStart || nextClaimableDay > pageEnd}
        >
          Claim Next
        </button>
      </div>

      <div className="rewards-progress">
        <span className="progress-text">
          Play to earn<br />another streak point!
        </span>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          <span className="progress-bar-text">
            {formatTime(playTimeSeconds)}/{formatTime(requiredSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
};

RewardsModal.displayName = 'RewardsModal';

export default RewardsModal;
