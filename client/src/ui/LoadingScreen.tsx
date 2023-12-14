import { useEffect, useState } from 'react';
import './LoadingScreen.scss';
import { useScale } from './Scale';

function LoadingScreen({ progress }: any) {
  const [isFading, setIsFading] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const scale = useScale();
  const isLoaded = progress === 100;

  useEffect(() => {
    setIsFading(true);
    setOpacity(isLoaded ? 0 : 1);
    setTimeout(() => setIsFading(!isLoaded), 500);
  }, [isLoaded]);

  if (isLoaded && !isFading) {
    return null;
  }
  return (
    <div className="loading-screen" style={{opacity, backgroundColor: "#006400"}}>
      <div className="loading-container" style={scale.styles}>
        <div className="loading-text">{progress < 90 ? 'Loading Assets..' : 'Waiting for server'}...</div>
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
