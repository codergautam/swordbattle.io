import { useEffect, useRef, useState } from 'react';
import './LoadingScreen.scss';
import { useScale } from './Scale';

function LoadingScreen({ progress, instantStart, waitingForConnection, connectionError }: any) {
  const [isFading, setIsFading] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [shown, setShown] = useState(0);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Track the real number. The old curve mapped 98% to 82% and crept upward on
  // a timer to disguise a slow load - now that loading is ~2s that padding is
  // slower than the game itself, and it parked the bar at 96 forever.
  const shownRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const real = progressRef.current;
      const v = shownRef.current;
      const next = real - v < 0.5 ? real : v + (real - v) * Math.min(1, dt * 12);
      if (next !== v) {
        shownRef.current = next;
        setShown(next);
      }
      // This component renders null once loaded but stays mounted, so the loop
      // must stop itself or it burns a frame callback for the whole session.
      if (next < 100) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  const [stuckVisible, setStuckVisible] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [useBackgroundImage, setUseBackgroundImage] = useState(true);
  const scale = useScale();
  const isLoaded = progress === 100 || !!connectionError;

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
          {instantStart ? 'Entering the arena' : waitingForConnection ? 'Connecting' : 'Loading'}... ({Math.floor(shown)}%)
        </div>
        <div className="progress-bar">
          <div className={`progress ${shown < 1 ? 'no-outline' : ''}`} style={{ width: `${shown}%`, transition: 'width 350ms linear' }}></div>
        </div>

        {/* {stuckVisible && !waitingForConnection && (
          <p style={{color: 'white'}}>Stuck loading? Try refreshing or interacting with the page</p>
        )} */}
      </div>
    </div>
  );
}

export default LoadingScreen;
