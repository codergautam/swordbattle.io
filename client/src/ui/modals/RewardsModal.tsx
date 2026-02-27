import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AccountState, claimDailyLoginAsync } from '../../redux/account/slice';

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
  { displayName: 'Mountain', bodyFileName: 'mountainPlayer.png' },
  { displayName: 'Classic Mountain', bodyFileName: 'classicMountainPlayer.png' },
  { displayName: 'Boreal Mountain', bodyFileName: 'borealMountainPlayer.png' },
  { displayName: 'Inferno Mountain', bodyFileName: 'infernoMountainPlayer.png' },
  { displayName: 'Yin Yang v2', bodyFileName: 'yinyangV2Player.png' },
  { displayName: 'Bullseye v2', bodyFileName: 'bullseyeV2Player.png' },
  { displayName: 'Bubble v2', bodyFileName: 'bubbleV2Player.png' },
  { displayName: 'Hacker v2', bodyFileName: 'hackerV2Player.png' },

];

const XP_BOOST_DURATIONS = ['10min', '20min', '30min', '15min'];

function getGemMasteryAmount(day: number): number {
  if (day <= 30) return 500 + (day - 1) * 125;
  if (day <= 180) return 500 + (day - 31) * 10;
  return Math.min(500 + (day - 181) * 2, 1250);
}

// Count total 2xp reward instances in days [1..day-1]
function count2xpBefore(day: number): number {
  const upper1 = Math.min(112, day - 1);
  const part1 = upper1 >= 6 ? Math.floor((upper1 - 6) / 7) + 1 : 0;
  if (day <= 113) return part1;

  const upper2 = day - 1;
  const pos5count = upper2 >= 83 ? Math.floor((upper2 - 83) / 7) + 1 : 0;
  const pos2count = upper2 >= 87 ? Math.floor((upper2 - 87) / 7) + 1 : 0;
  return part1 + pos5count + pos2count;
}

// Deterministic reward for each day number
function getRewardForDay(day: number): { type: RewardType; label: string; image: string } {
  const posInWeek = (day - 1) % 7;

  if (day <= 112) {
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

function getStreakColor(streak: number): React.CSSProperties {
  if (streak <= 3) return { color: '#ffffff' };
  if (streak <= 6) return { color: '#b2ff59' };
  if (streak <= 10) return { color: '#76ff03' };
  if (streak <= 15) return { color: '#ffeb3b' };
  if (streak <= 20) return { color: '#ff9800' };
  if (streak <= 30) return { color: '#f44336' };
  if (streak <= 40) return { color: '#e91e63' };
  if (streak <= 60) return { color: '#9c27b0' };
  if (streak <= 90) return { color: '#2152f3' };
  if (streak <= 120) return { color: '#00e1ff' };
  return {
    background: 'linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties;
}

const DAYS_PER_PAGE = 28;

const RewardsModal: React.FC<RewardsModalProps> = ({ account }) => {
  const dispatch = useDispatch();

  const dl = account.dailyLogin;
  const currentStreak = dl.streak;
  const claimedTo = dl.claimedTo;
  const claimableTo = dl.claimableTo;
  const playBonusEarned = dl.checkedIn >= 2;
  const playtimeSeconds = dl.playtime || 0;
  const playtimeMinutes = Math.floor(playtimeSeconds / 60);

  const [page, setPage] = useState(() => Math.floor(Math.max(0, claimableTo - 1) / DAYS_PER_PAGE));
  const [claiming, setClaiming] = useState(false);

  const pageStart = page * DAYS_PER_PAGE + 1;
  const pageEnd = pageStart + DAYS_PER_PAGE - 1;

  // Build rewards for current page
  const rewards: DayReward[] = [];
  for (let i = 0; i < DAYS_PER_PAGE; i++) {
    const day = pageStart + i;
    const { type, label, image } = getRewardForDay(day);
    let state: RewardState;
    if (day <= claimedTo) {
      state = 'claimed';
    } else if (day <= claimableTo) {
      state = 'claimable';
    } else {
      state = 'locked';
    }
    rewards.push({ day, type, label, image, state });
  }

  const bonusPercent = Math.min(currentStreak, 50);
  const hasClaimable = claimedTo < claimableTo;
  const nextClaimDay = claimedTo + 1;
  const progressPercent = playBonusEarned ? 100 : Math.min(100, Math.round((playtimeSeconds / 900) * 100));

  const handleClaim = useCallback(async (count?: number) => {
    if (!account?.isLoggedIn || claiming || !hasClaimable) return;
    setClaiming(true);
    try {
      await dispatch(claimDailyLoginAsync(count) as any);
    } catch (e) {
      console.error('[Rewards] Claim error:', e);
    }
    setClaiming(false);
  }, [account, claiming, hasClaimable, dispatch]);

  return (
    <div className="rewards-modal">
      <h1 className="rewards-title">Daily Rewards</h1>

      <div className="rewards-streak">
        <span className="streak-text" style={getStreakColor(currentStreak)}>
          Current Streak: {currentStreak}
        </span>
        <span className="streak-arrow">&rarr;</span>
        <span className="streak-bonus">+{bonusPercent}% Bonus</span>
      </div>

      <div className="rewards-grid">
        {rewards.map((reward) => {
          const isNextClaim = reward.day === nextClaimDay;
          const isClaimable = reward.state === 'claimable';

          const onCellClick = isNextClaim && !claiming
            ? () => handleClaim(1)
            : isClaimable
              ? () => window.alert('Claim the previous rewards first!')
              : reward.state === 'locked'
                ? () => window.alert('This reward is locked! Check in daily to unlock more rewards.')
                : undefined;

          return (
            <div
              key={reward.day}
              className={`reward-cell ${reward.state}`}
              onClick={onCellClick}
              role={isNextClaim || isClaimable ? 'button' : undefined}
              tabIndex={isNextClaim || isClaimable ? 0 : -1}
              onKeyDown={(isNextClaim || isClaimable) ? (e) => { if (e.key === 'Enter' && onCellClick) onCellClick(); } : undefined}
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
          onClick={() => handleClaim()}
          disabled={!account?.isLoggedIn || claiming || !hasClaimable}
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
          onClick={() => handleClaim(1)}
          disabled={!account?.isLoggedIn || claiming || !hasClaimable}
        >
          Claim Next
        </button>
      </div>

      <div className="rewards-progress">
        <span className="progress-text">
          {playBonusEarned ? 'Bonus earned!' : <>Play 15min to earn<br />another reward!</>}
        </span>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          <span className="progress-bar-text">
            {playBonusEarned ? 'Complete!' : `${playtimeMinutes}min / 15min`}
          </span>
        </div>
      </div>
    </div>
  );
};

RewardsModal.displayName = 'RewardsModal';

export default RewardsModal;
