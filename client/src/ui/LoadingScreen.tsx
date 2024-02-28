import { useEffect, useState } from 'react';
import './LoadingScreen.scss';
import { useScale } from './Scale';

function LoadingScreen({ progress }: any) {
  const [isFading, setIsFading] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const scale = useScale();
  const isLoaded = progress === 100;

  const instantStart = (window as any).instantStart;

  useEffect(() => {
    setIsFading(true);
    setOpacity(isLoaded ? 0 : 1);
    setTimeout(() => setIsFading(!isLoaded), 500);
  }, [isLoaded]);

  if (isLoaded && !isFading) {
    return null;
  }
  return (
    <div className="loading-screen" style={{opacity, backgroundColor: "#006400", zIndex: 1000}}>
      <div className="loading-container" style={scale.styles}>
        <div className="loading-text">{instantStart ? 'Entering the arena' : 'Loading'}... ({progress}%)</div>
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
