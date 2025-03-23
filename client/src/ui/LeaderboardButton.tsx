import React, { useState, useEffect } from 'react';
import ShopImg from '../assets/img/leaderboard.png'
import { AccountState } from '../redux/account/slice';
import { addCommas } from '../helpers';

export default function LeaderboardButton({scale, openLeaderboard}: {scale: number, openLeaderboard: () => void}) {
  return (
    <div className="leaderboard-btn">
      <img src={ShopImg} alt="Gems" width={250*scale} height={250*scale} onClick={openLeaderboard} />
    </div>
  );
}
