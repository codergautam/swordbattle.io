import { useEffect, useState } from 'react';
import Phaser from 'phaser';
import config from '../../game/PhaserConfig';
import Leaderboard from './Leaderboard';
import GameResults from './GameResults';
import './GameComponent.scss';

declare global {
  interface Window {
    phaser_game: Phaser.Game | undefined;
  }
}

function GameComponent({ name, onRestart }: any) {
  const [game, setGame] = useState<Phaser.Game | undefined>(window.phaser_game);
  const [gameResults, setGameResults] = useState<any>(null);

  useEffect(() => {
    if (!game) {
      const game = new Phaser.Game({
        ...config,
        parent: 'phaser-container',
      });
      setGame(game);
      window.phaser_game = game;

      game.events.once('ready', () => {
        game.scene.scenes[0].events.emit('startGame', name);
      });
      game.events.on('gameEnded', (results: any) => {
        setGameResults(results);
      });
      game.events.on('destroy', () => {
        window.phaser_game = undefined;
        onRestart();
      });
    }
  }, []);

  return (
    <div className="game">
      <div id="phaser-container" />
      <Leaderboard game={game} />
      {gameResults && <GameResults results={gameResults} game={game} />}
    </div>
  );
}

export default GameComponent;