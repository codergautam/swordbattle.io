import React, { useState, useEffect } from 'react';
import DailyRewardsImg from '../assets/img/dailyrewards.png'
import { AccountState } from '../redux/account/slice';
import { addCommas } from '../helpers';

export default function DailyRewardsButton({account, scale, openDailyRewards}: {account: AccountState, scale: number, openDailyRewards: () => void}) {
  return (
    <div className="dailyrewards-btn">
      <img src={DailyRewardsImg} alt="Gems" width={250*scale} height={250*scale} onClick={openDailyRewards} />
    </div>
  );
}
