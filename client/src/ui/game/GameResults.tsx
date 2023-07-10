import PlayAgainImg from '../../assets/img/play-again.png';
import { useScale } from '../Scale';
import './GameResults.scss';

function GameResults({ results, game }: any) {
  const seconds = results.survivalTime / 1000;
  const survivalTime = `${((seconds % 3600) / 60).toFixed(0)}m ${(seconds % 60).toFixed(0)}s`;

  const restart = () => {
    game.events.emit('restartGame');
  };

  return (
    <div className="results" style={useScale(true)}>
      <div className="results-title">
        You got stabbed
        <br />
        <span className="results-name">{results.name}</span>
      </div>

      <div className="results-container">
        <div className="results-info">
          <div className="results-info-title">Stabbed By:</div>
          {results.disconnectReason}
        </div>

        <div className="results-info">
          <div className="results-info-title">Coins:</div>
          {results.coins}
        </div>

        <div className="results-info">
          <div className="results-info-title">Kills</div>
          {results.kills}
        </div>

        <div className="results-info">
          <div className="results-info-title">Survived:</div>
          {survivalTime}
        </div>
      </div>

      <div
        className="results-play-again"
        role="button"
        onClick={restart}
        onKeyDown={event => event.key === 'Enter' && restart()}
        tabIndex={0}
      >
        <img src={PlayAgainImg} alt="Play again" />
      </div>
    </div>
  )
}

export default GameResults;
