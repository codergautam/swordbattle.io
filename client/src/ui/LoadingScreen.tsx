import { useEffect, useState } from 'react';
import './LoadingScreen.scss';
import { useScale } from './Scale';

function LoadingScreen({ progress }: any) {
  const [isFading, setIsFading] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [stuckVisible, setStuckVisible] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [useBackgroundImage, setUseBackgroundImage] = useState(true);
  const scale = useScale();
  const isLoaded = progress === 100;

  const instantStart = (window as any).instantStart;

  // Preload the background image with timeout
  useEffect(() => {
    let imageLoaded = false;
    const img = new Image();
    img.src = '/assets/LoadingScreen.png';

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
      <div style={{
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
        backgroundColor: "#006400",
        backgroundImage: (useBackgroundImage && backgroundLoaded) ? "url('/assets/LoadingScreen.png')" : "none",
        backgroundRepeat: "repeat",
        backgroundSize: "1024px 1024px",
        zIndex: 1000
      }}
    >
      <div className="loading-container" style={scale.styles}>
        <div className="loading-text">
          {instantStart ? 'Entering the arena' : 'Loading'}... ({progress}%)
        </div>
        <div className="progress-bar">
          <div className={`progress ${progress === 0 ? 'no-outline' : ''}`} style={{ width: `${progress}%` }}></div>
        </div>

        {stuckVisible && (
          <p style={{color: 'white'}}>Stuck at 98%? Try refreshing or interacting with the page</p>
        )}
      </div>
    </div>
  );
}

export default LoadingScreen;
