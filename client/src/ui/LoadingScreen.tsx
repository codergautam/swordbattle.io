import { useEffect, useRef, useState } from 'react';
import './LoadingScreen.scss';
import { useScale } from './Scale';

function LoadingScreen({ progress, instantStart }: any) {
  const [isFading, setIsFading] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [shown, setShown] = useState(0);
  const progressRef = useRef(progress);
  const lastChangeRef = useRef(0);
  if (progressRef.current !== progress) {
    progressRef.current = progress;
    lastChangeRef.current = typeof performance !== 'undefined' ? performance.now() : 0;
  }

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const real = progressRef.current;
      const stalledBonus = Math.min(15, ((now - lastChangeRef.current) / 1000) * 2.5);
      let done = false;
      setShown((v) => {
        const target = real >= 100 ? 100 : Math.min(97, Math.min(real, 98) * (82 / 98) + stalledBonus);
        const next = v + Math.max(0, target - v) * Math.min(1, dt * (real >= 100 ? 8 : 2.2));
        if (real >= 100 && next >= 99.5) { done = true; return 100; }
        return next - v > 0.01 ? next : v;
      });
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  const [stuckVisible, setStuckVisible] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [useBackgroundImage, setUseBackgroundImage] = useState(true);
  const scale = useScale();
  const isLoaded = progress === 100;

  // Preload the background image with timeout
  useEffect(() => {
    let imageLoaded = false;
    const img = new Image();
    img.src = '/assets/LoadingScreen-new.png';

    img.onload = () => {
      imageLoaded = true;
      setBackgroundLoaded(true);
      setShowLoadingScreen(true);
    };

    img.onerror = () => {
      imageLoaded = true;
      setBackgroundLoaded(false);
      setUseBackgroundImage(false);
      setShowLoadingScreen(true);
    };

    // 3-second timeout
    const timeout = setTimeout(() => {
      if (!imageLoaded) {
        setBackgroundLoaded(false);
        setUseBackgroundImage(false);
        setShowLoadingScreen(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    setIsFading(true);
    setOpacity(isLoaded ? 0 : 1);
    setTimeout(() => setIsFading(!isLoaded), 500);
  }, [isLoaded]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (progress >= 90 && progress < 100) {
      timer = setTimeout(() => {
        setStuckVisible(true);
      }, 6000); // 6 seconds
    } else {
      setStuckVisible(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [progress]);

  if (isLoaded && !isFading) {
    return null;
  }

  // Show white screen while waiting for background image or timeout
  if (!showLoadingScreen) {
    return (
      <div className="loading-cover" style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        zIndex: 1000
      }} />
    );
  }

  return (
    <div
      className="loading-screen"
      style={{
        opacity,
        backgroundColor: "#242424",
        backgroundImage: (useBackgroundImage && backgroundLoaded) ? "url('/assets/LoadingScreen-new.png')" : "none",
        backgroundRepeat: "repeat",
        backgroundSize: "1024px 1024px",
        zIndex: 1000
      }}
    >
      <div className="loading-container" style={scale.styles}>
        <div className="loading-text">
          {instantStart ? 'Entering the arena' : 'Loading'}... ({Math.floor(shown)}%)
        </div>
        <div className="progress-bar">
          <div className={`progress ${shown < 1 ? 'no-outline' : ''}`} style={{ width: `${shown}%`, transition: 'width 350ms linear' }}></div>
        </div>

        {stuckVisible && (
          <p style={{color: 'white'}}>Stuck at 98%? Try refreshing or interacting with the page</p>
        )}
      </div>
    </div>
  );
}

export default LoadingScreen;
