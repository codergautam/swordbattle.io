import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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
import { getAdblockStatus, isAdScriptBlocked } from '../../crazygames/adblock';
import { Settings } from '../../game/Settings';
import { setGameRuntime } from '../../game/gameRuntime';

const managems = 0;

const nohud = typeof window !== 'undefined' && window.location.search.includes('nohud');
const isBasicLaunch = typeof window !== 'undefined' && !!(window as any)._isCrazyGamesBasicLaunch;
const ingameAdProvider = 'adinplay';
const HudDesignerPanel = lazy(() => import('../hudDesigner/HudDesignerPanel'));

function isMoreAdsBlocked(): boolean {
  return getAdblockStatus() || isAdScriptBlocked(ingameAdProvider);
}

function GameComponent({ onHome, onGameReady, onConnectionClosed, loggedIn, dimensions, game, setGame, openLeaderboard, onPendingRespawn, hudDesigner = false }: any) {
  const [gameResults, setGameResults] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
  const [moreAds, setMoreAds] = useState(!isBasicLaunch && !!Settings.moreAds);
  const [moreAdsBlocked, setMoreAdsBlocked] = useState(() => (!isBasicLaunch && Settings.moreAds ? isMoreAdsBlocked() : false));
  const [hudDesignerOpen, setHudDesignerOpen] = useState(false);

  useEffect(() => {
    if (!hudDesigner) return;
    const toggleDesigner = () => {
      window.dispatchEvent(new CustomEvent('closeInGameSettings'));
      setHudDesignerOpen((open) => !open);
    };
    const closeDesigner = () => setHudDesignerOpen(false);
    window.addEventListener('toggleHudDesigner', toggleDesigner);
    window.addEventListener('toggleInGameSettings', closeDesigner);
    return () => {
      window.removeEventListener('toggleHudDesigner', toggleDesigner);
      window.removeEventListener('toggleInGameSettings', closeDesigner);
    };
  }, [hudDesigner]);

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
    if (!moreAds) {
      setMoreAdsBlocked(false);
      return;
    }
    const updateBlocked = () => setMoreAdsBlocked(isMoreAdsBlocked());
    window.addEventListener('adblockStatusChanged', updateBlocked);
    window.addEventListener('adinplayLoadStateChanged', updateBlocked);
    updateBlocked();
    return () => {
      window.removeEventListener('adblockStatusChanged', updateBlocked);
      window.removeEventListener('adinplayLoadStateChanged', updateBlocked);
    };
  }, [moreAds]);
  const gameRef = useRef<any>(null);

  useEffect(() => {
    // Guard on the ref, not the `game` prop: the prop is captured from the
    // render that created this effect, so after a remount it still holds the
    // instance we just destroyed and the game would never be rebuilt.
    if (!gameRef.current) {
      // The SDK owns session state and is idempotent, so we only track the
      // pending instant-start delay here.
      let gameplayDelayTimer: any = null;

      const stopGameplay = () => {
        if (gameplayDelayTimer) {
          clearTimeout(gameplayDelayTimer);
          gameplayDelayTimer = null;
        }
        crazygamesSDK.gameplayStop();
      };

      const startGameplay = () => {
        if (gameplayDelayTimer) return;
        if ((window as any)._wasInstantStart) {
          gameplayDelayTimer = setTimeout(() => {
            gameplayDelayTimer = null;
            crazygamesSDK.gameplayStart();
          }, managems);
        } else {
          crazygamesSDK.gameplayStart();
        }
      };

      const game = new Phaser.Game({
        ...config,
        parent: 'phaser-container',
      });
      gameRef.current = game;
      setGameRuntime(game);
      setGame(game);

      game.events.on('gameReady', onGameReady);
      if ((game as any).isGameReady) onGameReady();
      game.events.on('connectionClosed', onConnectionClosed);
      game.events.on('connectionClosed', () => {
        stopGameplay();
        trackRunEndDeferred('server_disconnect');
      });
      game.events.on('setGameResults', (results: any) => {
        // Death does NOT end the CrazyGames gameplay session. The results /
        // respawn screen is part of the .io loop, so it keeps counting as
        // playtime; the SDK only pauses for ads, a hidden tab, or idle-out.
        if (results) crazygamesSDK.gameplayEnterResults();
        setGameResults(results);
        setPlaying(false);
        if (results) setTimeout(() => (game as any).runTextureGC?.(), 0);
      });
      game.events.on('restartGame', (name: string) => {
        setPlaying(true);
        trackRunStart();
        startGameplay();
      });
      game.events.on('startGame', (name: string) => {
        setPlaying(true);
        trackRunStart();
        if (shouldShowTutorial()) {
          try { localStorage.setItem('swordbattle:tutorialSeen', '1'); } catch (_) {}
        }
        startGameplay();
      });
      game.events.on('goHome', stopGameplay);
      game.events.on('pendingRespawnInfo', (info: any) => {
        onPendingRespawn?.(info);
      });

      return () => {
        stopGameplay();
        const gameScene = game.scene.getScene('game') as any;
        if (gameScene?.shutdown) {
          gameScene.shutdown();
        }
        game.destroy(true);
        setGameRuntime(null);
        gameRef.current = null;
        setGame(null);
      };
    }
  }, []);

  return (
    <div className="game">
      <div id="phaser-container" />
      { playing && !nohud && <Leaderboard game={game} /> }
      { playing && !nohud && <InGameSettings /> }
      { playing && !nohud && hudDesigner && hudDesignerOpen && (
        <Suspense fallback={null}>
          <HudDesignerPanel onClose={() => setHudDesignerOpen(false)} />
        </Suspense>
      )}
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
        adElement={<Ad screenW={dimensions.width} screenH={dimensions.height} types={[[468, 60], [300, 250]]} adinplayTypes={[[728, 90], [970, 90], [970, 250]]} horizThresh={0.4} placement="game_results" adblockPromo />}
      />
      </>
      )}
    </div>
  );
}

export default GameComponent;
