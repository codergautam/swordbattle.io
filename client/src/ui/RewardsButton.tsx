import React, { useState, useEffect } from 'react';
import ShopImg from '../assets/img/rewards.png'
import { AccountState } from '../redux/account/slice';
import { addCommas } from '../helpers';

export default function RewardsButton({account, scale, openRewards}: {account: AccountState, scale: number, openRewards: () => void}) {
  return (
    <div className="rewards-btn">
      <img src={ShopImg} alt="Rewards" width={350*scale} height={250*scale} onClick={openRewards} />
    </div>
  );
}
