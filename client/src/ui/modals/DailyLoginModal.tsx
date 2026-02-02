import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import './DailyLoginModal.scss';
import { useDispatch, useSelector } from 'react-redux';
import { setAccount, setDailyLogin } from '../../redux/account/slice';
import { selectAccount } from '../../redux/account/selector';
import api from '../../api';
import * as cosmetics from '../../game/cosmetics.json';

type Props = {
  streak: number;
  onClose: () => void;
};

const DailyLoginModal: React.FC<Props> = ({ streak, onClose }) => {
  const dispatch = useDispatch();
  const account = useSelector(selectAccount);
  const { skins } = cosmetics as any;

  const [claiming, setClaiming] = useState(false);

  const isSkinDay = streak > 0 && streak % 7 === 0;
  const gemReward = isSkinDay ? 0 : 25 + 5 * streak;

  const loginPrizeSkins = useMemo(
    () => skins.filter((s: any) => s.tags?.includes('loginPrize')),
    [skins]
  );

  const randomSkin = useMemo(() => {
    if (!isSkinDay || !loginPrizeSkins.length) return null;
    return loginPrizeSkins[Math.floor(Math.random() * loginPrizeSkins.length)];
  }, [isSkinDay, loginPrizeSkins]);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);

    try {
      const res = await api.postAsync(
        `${api.endpoint}/profile/daily-login/claim?now=${Date.now()}`,
        { streak }
      );

      if (res.error) {
        alert(res.error);
        setClaiming(false);
        return;
      }

      if (res.account) dispatch(setAccount(res.account));
      if (res.dailyLogin) {
        dispatch(setDailyLogin(res.dailyLogin));
        localStorage.setItem('dailyLogin', JSON.stringify(res.dailyLogin));
      }

      onClose();
    } catch (e) {
      console.error(e);
      alert('Error claiming the reward');
    } finally {
      setClaiming(false);
    }
  };

  const content = (
    <div className="daily-login-modal">
      <h1 className="dl-title">Daily Rewards</h1>
      <h2 className="dl-streak">Streak: {streak} day{streak === 1 ? '' : 's'}</h2>

      <div className="dl-reward-box">
        {isSkinDay && randomSkin ? (
          <>
            <h3>Today’s Reward: Skin</h3>
            <p>{randomSkin.displayName || randomSkin.name}</p>
          </>
        ) : (
          <>
            <h3>Today’s Reward: Gems</h3>
            <p>+{gemReward} gems</p>
          </>
        )}
      </div>

      <button
        className="dl-claim-btn"
        onClick={handleClaim}
        disabled={claiming}
      >
        {claiming ? 'Claiming...' : 'Claim'}
      </button>
    </div>
  );

  return <Modal child={content} close={onClose} />;
};

export default DailyLoginModal;
