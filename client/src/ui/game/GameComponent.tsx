import { useEffect, useState } from 'react';
import Phaser from 'phaser';
import config from '../../game/PhaserConfig';
import Leaderboard from './Leaderboard';
import GameResults from './GameResults';
import { shouldShowTutorial } from './TutorialModal';
import './GameComponent.scss';
import Ad from '../Ad';
import { crazygamesSDK } from '../../crazygames/sdk';

declare global {
  interface Window {
    phaser_game: Phaser.Game | undefined;
  }
}

const managems = 0;

function GameComponent({ onHome, onGameReady, onConnectionClosed, loggedIn, dimensions, game, setGame, openLeaderboard, onPendingRespawn }: any) {
  const [gameResults, setGameResults] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
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
          crazygamesSDK.gameplayStop();
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
      { playing && <Leaderboard game={game} /> }
      {gameResults && (
      <>
      <GameResults
        onHome={onHome}
        game={game}
        results={gameResults}
        isLoggedIn={loggedIn}
        openLeaderboard={openLeaderboard}
        adElement={<Ad screenW={dimensions.width} screenH={dimensions.height} types={[[728, 90], [970, 90], [970, 90]]} centerOnOverflow={600} horizThresh={0.2} />}
      />
      </>
      )}
    </div>
  );
}

export default GameComponent;
