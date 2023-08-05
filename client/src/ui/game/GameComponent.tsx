import Phaser from "phaser";
import { useEffect, useState } from "react";
import config from "../../game/PhaserConfig";
import "./GameComponent.scss";
import GameModal from "./GameModal";
import GameResults from "./GameResults";
import Leaderboard from "./Leaderboard";

function GameComponent({ name, onRestart }: any) {
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [gameResults, setGameResults] = useState<any>(null);
  const [modal, setModal] = useState<{ open: boolean; payload: any }>({
    open: false,
    payload: null,
  });

  useEffect(() => {
    if (!window.phaser_game) {
      const game = new Phaser.Game({
        ...config,
        parent: "phaser-container",
      });
      setGame(game);
      window.phaser_game = game;

      game.events.once("ready", () => {
        game.scene.scenes[0].events.emit("startGame", name);
      });

      game.events.on("openModal", (payload: any) => {
        game.scene.scenes[0].events.emit("pauseGame");
        setModal({ open: true, payload });
      });

      game.events.on("closeModal", () => {
        game.scene.scenes[0].events.emit("resumeGame");
        setModal({ open: false, payload: null });
      });

      game.events.on("gameEnded", (results: any) => {
        setGameResults(results);
      });

      game.events.on("destroy", () => {
        window.phaser_game = undefined;
        onRestart();
      });
    }
  }, []);

  return (
    <div className="game">
      <div id="phaser-container" />
      <Leaderboard game={game} />
      {modal.open && <GameModal game={game} payload={modal.payload} />}
      {gameResults && <GameResults results={gameResults} game={game} />}
    </div>
  );
}

export default GameComponent;
