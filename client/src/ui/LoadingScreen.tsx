import { useEffect, useState } from 'react';
import './LoadingScreen.scss';
import { useScale } from './Scale';

function LoadingScreen({ progress }: any) {
  const [isFading, setIsFading] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [stuckVisible, setStuckVisible] = useState(false);
  const scale = useScale();
  const isLoaded = progress === 100;

  const instantStart = (window as any).instantStart;

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

  return (
    <div
      className="loading-screen"
      style={{ opacity, backgroundColor: "#006400", zIndex: 1000 }}
    >
      <div className="loading-container" style={scale.styles}>
        <div className="loading-text">
          {instantStart ? 'Entering the arena' : 'Loading'}... ({progress}%)
        </div>
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>

        {stuckVisible && (
          <p>Stuck at 98%? Try refreshing or interacting with the page</p>
        )}
        <p style={{ color: '#ffffffaa' }}>(Page may refresh to load data)</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
