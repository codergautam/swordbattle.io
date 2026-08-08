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
import { Settings } from '../../game/Settings';

declare global {
  interface Window {
    phaser_game: Phaser.Game | undefined;
  }
}

const managems = 0;

const nohud = typeof window !== 'undefined' && window.location.search.includes('nohud');
const isBasicLaunch = typeof window !== 'undefined' && !!(window as any)._isCrazyGamesBasicLaunch;
const ingameAdProvider = 'adinplay';

function GameComponent({ onHome, onGameReady, onConnectionClosed, loggedIn, dimensions, game, setGame, openLeaderboard, onPendingRespawn }: any) {
  const [gameResults, setGameResults] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
  const [moreAds, setMoreAds] = useState(!isBasicLaunch && !!Settings.moreAds);
  const [moreAdsBlocked, setMoreAdsBlocked] = useState(() => (!isBasicLaunch && Settings.moreAds ? getAdblockStatus() : false));

  useEffect(() => {
    if (!moreAds) return;
    (window as any).loadAdinplay?.();
  }, [moreAds]);

  useEffect(() => {
    if (isBasicLaunch) return;
    const h = (e: Event) => setMoreAds(!!(e as CustomEvent).detail?.enabled);
    window.addEventListener('moreAdsChanged', h);
    return () => window.removeEventListener('moreAdsChanged', h);
  }, []);

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
        moreAdsBlocked ? (
          <div className="ingame-ad-block-cover">
            <div className="ingame-ad-block">Turn off your adblocker</div>
            <div className="ingame-ad-block-sub">The "More ads" setting requires ads to be visible. Disable your adblocker and reload, or turn off "More ads" in settings.</div>
          </div>
        ) : (
          <div className="ingame-ad-overlay">
            <Ad screenW={dimensions.width} screenH={dimensions.height} types={[[728, 90], [970, 90]]} placement="ingame_moreads" provider={ingameAdProvider} />
          </div>
        )
      )}
      {gameResults && (
      <>
      <GameResults
        onHome={onHome}
        game={game}
        results={gameResults}
        isLoggedIn={loggedIn}
        openLeaderboard={openLeaderboard}
        adElement={<Ad screenW={dimensions.width} screenH={dimensions.height} types={[[468, 60], [300, 250]]} horizThresh={0.4} placement="game_results" adblockPromo />}
      />
      </>
      )}
    </div>
  );
}

export default GameComponent;
