import React, { useState, useEffect } from 'react';
import { addCommas } from '../helpers';

export default function ValueCnt({scale, value, img}: {scale: number, value: number, img: string}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 2000; // Animation duration in milliseconds
    const startValue = displayValue;
    const endValue = value;

    let startTime: number;

    const easeInOutSine = (time: number, start: number, end: number, duration: number) => {
      return -end/2 * (Math.cos(Math.PI * time / duration) - 1) + start;
    };

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const timeElapsed = time - startTime;
      const updatedValue = easeInOutSine(timeElapsed, startValue, endValue - startValue, duration);

      setDisplayValue(Math.round(updatedValue));

      if (timeElapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue); // Ensure it ends exactly on the end value
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div className="auth-stats">
      <img src={img} alt="Gems" width={86*scale} height={86*scale} />
      <p style={{fontSize:`${Math.max(0.3,scale)*40}px`,margin: 0, lineHeight:1}}>{addCommas(displayValue)}</p>
    </div>
  );
}
