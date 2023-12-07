import React, { useState, useEffect } from 'react';
import GemImg from '../assets/img/gem.png';
import { AccountState } from '../redux/account/slice';
import { addCommas } from '../helpers';

export default function GemCount({account, scale}: {account: AccountState, scale: number}) {
  const [displayGems, setDisplayGems] = useState(account.gems);

  useEffect(() => {
    const duration = 2000; // Animation duration in milliseconds
    const startValue = displayGems;
    const endValue = account.gems;

    let startTime: number;

    const easeInOutSine = (time: number, start: number, end: number, duration: number) => {
      return -end/2 * (Math.cos(Math.PI * time / duration) - 1) + start;
    };

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const timeElapsed = time - startTime;
      const updatedValue = easeInOutSine(timeElapsed, startValue, endValue - startValue, duration);

      setDisplayGems(Math.round(updatedValue));

      if (timeElapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        setDisplayGems(endValue); // Ensure it ends exactly on the end value
      }
    };

    requestAnimationFrame(animate);
  }, [account.gems]);

  return (
    <div className="auth-stats">
      <img src={GemImg} alt="Gems" width={86*scale} height={86*scale} />
      <p style={{fontSize:`${scale*40}px`}}>{addCommas(displayGems)}</p>
    </div>
  );
}
