import React, { useState, useEffect } from 'react';
import InventoryImg from '../assets/img/inventory.png'
import { AccountState } from '../redux/account/slice';
import { addCommas } from '../helpers';

export default function InventoryButton({account, scale, openInventory}: {account: AccountState, scale: number, openInventory: () => void}) {
  return (
    <div className="inventory-btn">
      <img src={InventoryImg} alt="Gems" width={350*scale} height={250*scale} onClick={openInventory} />
    </div>
  );
}
