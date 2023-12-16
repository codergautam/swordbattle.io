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

function GameComponent({ onHome, onGameReady, onConnectionClosed, loggedIn }: any) {
  const [game, setGame] = useState<Phaser.Game | undefined>(window.phaser_game);
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
      {gameResults && <GameResults
        onHome={onHome}
        game={game}
        results={gameResults}
        isLoggedIn={loggedIn}
      />}
    </div>
  );
}

export default GameComponent;