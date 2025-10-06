import React, { useState, useEffect, useRef } from 'react';
import { addCommas } from '../helpers';

export default function ValueCnt({scale, value, img}: {scale: number, value: number, img: string}) {
  const [displayValue, setDisplayValue] = useState(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 2000; // Animation duration in milliseconds
    const startValue = displayValue;
    const endValue = value;
    let startTime: number | null = null;

    const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;
      const elapsed = time - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOutSine(t);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        rafRef.current = null;
      }
    };

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value]);

  const imgSize = Math.max(20, Math.round(86 * scale));

  return (
    <div className="auth-stats" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img src={img} alt="" width={imgSize} height={imgSize} style={{ display: 'inline-block', userSelect: 'none', pointerEvents: 'none' }} />
      <p style={{ fontSize: `${Math.max(0.3, scale) * 40}px`, margin: 0, lineHeight: 1 }}>{addCommas(displayValue)}</p>
    </div>
  );
}