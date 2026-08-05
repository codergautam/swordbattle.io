import { useEffect, useState } from 'react';
import Phaser from '../../game/engine';
import config from '../../game/PhaserConfig';
import Leaderboard from './Leaderboard';
import InGameSettings from './InGameSettings';
import GameResults from './GameResults';
import { shouldShowTutorial } from './TutorialModal';
import './GameComponent.scss';
import Ad from '../Ad';
import { crazygamesSDK } from '../../crazygames/sdk';
import { trackRunStart, trackRunEndDeferred } from '../../analytics';
import { getAdblockStatus } from '../../crazygames/adblock';

declare global {
  interface Window {
    phaser_game: Phaser.Game | undefined;
  }
}

const managems = 0;

const nohud = typeof window !== 'undefined' && window.location.search.includes('nohud');

function GameComponent({ onHome, onGameReady, onConnectionClosed, loggedIn, dimensions, game, setGame, openLeaderboard, onPendingRespawn, moreAds }: any) {
  const [gameResults, setGameResults] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
  const [moreAdsBlocked, setMoreAdsBlocked] = useState(() => (moreAds ? getAdblockStatus() : false));

  useEffect(() => {
    if (!moreAds) return;
    const h = (e: Event) => setMoreAdsBlocked(!!(e as CustomEvent).detail);
    window.addEventListener('adblockStatusChanged', h);
    setMoreAdsBlocked(getAdblockStatus());
    return () => window.removeEventListener('adblockStatusChanged', h);
  }, [moreAds]);
  useEffect(() => {
    if (!game) {
      let gameplayStartCalled = false;
      let gameplayDelayTimer: any = null;

      const game = new Phaser.Game({
        ...config,
        parent: 'phaser-container',
      });
      setGame(game);
      window.phaser_game = game;

      game.events.on('gameReady', onGameReady);
      game.events.on('connectionClosed', onConnectionClosed);
      game.events.on('connectionClosed', () => trackRunEndDeferred('server_disconnect'));
      game.events.on('setGameResults', (results: any) => {
        setGameResults(results);
        setPlaying(false);
        if (gameplayDelayTimer) {
          clearTimeout(gameplayDelayTimer);
          gameplayDelayTimer = null;
        }
      });
      game.events.on('restartGame', (name: string) => {
        setPlaying(true);
        trackRunStart();
        if (!gameplayStartCalled && (window as any)._wasInstantStart) {
          gameplayDelayTimer = setTimeout(() => {
            crazygamesSDK.gameplayStart();
            gameplayStartCalled = true;
            gameplayDelayTimer = null;
          }, managems);
        }
      });
      game.events.on('startGame', (name: string) => {
        setPlaying(true);
        trackRunStart();
        if (shouldShowTutorial()) {
          try { localStorage.setItem('swordbattle:tutorialSeen', '1'); } catch (_) {}
        }

        if ((window as any)._wasInstantStart) {
          gameplayDelayTimer = setTimeout(() => {
            crazygamesSDK.gameplayStart();
            gameplayStartCalled = true;
            gameplayDelayTimer = null;
          }, managems);
        } else {
          crazygamesSDK.gameplayStart();
          gameplayStartCalled = true;
        }
      });
      game.events.on('goHome', () => {
        if (gameplayDelayTimer) {
          clearTimeout(gameplayDelayTimer);
          gameplayDelayTimer = null;
        }
        if (gameplayStartCalled) {
        }
        gameplayStartCalled = false;
      });
      game.events.on('pendingRespawnInfo', (info: any) => {
        onPendingRespawn?.(info);
      });

      return () => {
        if (gameplayDelayTimer) {
          clearTimeout(gameplayDelayTimer);
        }
        const gameScene = game.scene.getScene('game') as any;
        if (gameScene?.shutdown) {
          gameScene.shutdown();
        }
        game.destroy(true);
        window.phaser_game = undefined;
        setGame(null);
      };
    }
  }, []);

  return (
    <div className="game">
      <div id="phaser-container" />
      { playing && !nohud && <Leaderboard game={game} /> }
      { playing && !nohud && <InGameSettings /> }
      { moreAds && playing && !gameResults && (
        <div className="ingame-ad-overlay">
          { moreAdsBlocked ? (
            <div className="ingame-ad-block">Turn off your adblocker</div>
          ) : (
            <Ad screenW={dimensions.width} screenH={dimensions.height} types={[[728, 90], [970, 90]]} placement="ingame_moreads" />
          )}
        </div>
      )}
      {gameResults && (
      <>
      <GameResults
        onHome={onHome}
        game={game}
        results={gameResults}
        isLoggedIn={loggedIn}
        openLeaderboard={openLeaderboard}
        adElement={<Ad screenW={dimensions.width} screenH={dimensions.height} types={[[728, 90], [970, 90], [970, 250]]} horizThresh={0.3} placement="game_results" adblockPromo />}
      />
      </>
      )}
    </div>
  );
}

export default GameComponent;
