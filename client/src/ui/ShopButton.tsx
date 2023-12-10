import React, { useState, useEffect } from 'react';
import ShopImg from '../assets/img/shop.png'
import { AccountState } from '../redux/account/slice';
import { addCommas } from '../helpers';

export default function ShopButton({account, scale, openShop}: {account: AccountState, scale: number, openShop: () => void}) {
  return (
    <div className="shop-btn">
      <img src={ShopImg} alt="Gems" width={250*scale} height={250*scale} onClick={openShop} />
    </div>
  );
}
