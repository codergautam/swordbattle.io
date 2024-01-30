import { useEffect, useState } from 'react';
import Phaser from 'phaser';
import config from '../../game/PhaserConfig';
import Leaderboard from './Leaderboard';
import GameResults from './GameResults';
import './GameComponent.scss';
import Ad from '../Ad';

declare global {
  interface Window {
    phaser_game: Phaser.Game | undefined;
  }
}

function GameComponent({ onHome, onGameReady, onConnectionClosed, loggedIn, dimensions, game, setGame }: any) {
  const [gameResults, setGameResults] = useState<any>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!game) {
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
      });
      game.events.on('restartGame', (name: string) => {
        setPlaying(true);
      });
      game.events.on('startGame', (name: string) => {
        setPlaying(true);
      });
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
        adElement={<Ad screenW={dimensions.width} screenH={dimensions.height} types={[[728, 90], [970, 90]]} centerOnOverflow={600} horizThresh={0.2} />}
      />
      </>
      )}
    </div>
  );
}

export default GameComponent;