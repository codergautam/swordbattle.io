import { useEffect } from 'react';
import CountUp from 'react-countup';
import { useScale } from '../Scale';

import PlayAgainImg from '../../assets/img/play-again.png';
import HomeImg from '../../assets/img/home.png';
import './GameResults.scss';
import { DisconnectTypes } from '../../game/Types';
import { calculateGemsXP, playVideoAd } from '../../helpers';
import { crazygamesSDK } from '../../crazygames/sdk';

// Smarter video ad logic to prevent spammed ads
const DEATHS_BETWEEN_ADS = 1;
const MIN_TIME_BETWEEN_ADS_MS = 1000 * 60 * 1;

function shouldShowVideoAd(): boolean {
  const windowAny = window as any;
  const adProvider = windowAny?.adProvider || 'adinplay';

  // Only show video ads for CrazyGames
  if (adProvider !== 'crazygames') {
    return false;
  }

  try {
    // Get death count
    const deathCount = parseInt(localStorage.getItem('deathCountForAds') || '0');
    const newDeathCount = deathCount + 1;
    localStorage.setItem('deathCountForAds', newDeathCount.toString());

    // Get last ad time
    const lastAdTime = parseInt(localStorage.getItem('lastDeathAdTime') || '0');
    const timeSinceLastAd = Date.now() - lastAdTime;

    // Show ad if applicable
    if (newDeathCount >= DEATHS_BETWEEN_ADS && timeSinceLastAd > MIN_TIME_BETWEEN_ADS_MS) {
      // Reset counter and update last ad time
      localStorage.setItem('deathCountForAds', '0');
      localStorage.setItem('lastDeathAdTime', Date.now().toString());
      return true;
    }

    return false;
  } catch (e) {
    console.error('Error in shouldShowVideoAd:', e);
    return false;
  }
}

function GameResults({ onHome, results, game, isLoggedIn, adElement }: any) {
  useEffect(() => {
    if (shouldShowVideoAd()) {
      console.log('[GameResults] Showing video ad after death');
      playVideoAd().then(() => {
        console.log('[GameResults] Video ad completed or skipped');
      });
    } else {
      console.log('[GameResults] Skipping video ad this time');
    }
  }, []);

  // Trigger happy time for good games
  useEffect(() => {
    try {
      const coins = results?.coins || 0;
      const kills = results?.kills || 0;
      const survivalTime = results?.survivalTime || 0;

      if (coins >= 1000000) {
        console.log('[CrazyGames] Happy time! 1M+ coins achieved!');
        crazygamesSDK.happytime();
      } else if (kills >= 200) {
        console.log('[CrazyGames] Happy time! 200+ kills achieved!');
        crazygamesSDK.happytime();
            } else if (survivalTime >= 3600) { // 1 hour
        console.log('[CrazyGames] Happy time! Survived 1+ hours!');
        crazygamesSDK.happytime();
      }
    } catch (error) {
      console.error('[CrazyGames] Error triggering happy time:', error);
    }
  }, [results]);

  const onHomeClick = () => {

    function go() {
      onHome();
      game.events.emit('setGameResults', null);
      game.events.emit('startSpectate');
      }

      go();

    // if((window as any).adBreak) {
    //   console.log('adBreak');
    //   (window as any).adBreak({
    //     type: 'browse',
    //     adBreakDone: (e: any) => {
    //       console.log('adBreakDone', e);

    //     },  // always called, unblocks the game logic
    //   });
    // }


  };
  const onRestartClick = () => {
    // playVideoAd().then(() => {
    // game.events.emit('setGameResults', null);
    // game.events.emit('restartGame');
    // });

    function go() {
    game.events.emit('setGameResults', null);
    game.events.emit('restartGame');
    }
    go();

    // if((window as any).adBreak) {
    //   console.log('adBreak');
    //   (window as any).adBreak({
    //     type: 'next',
    //     adBreakDone: (e: any) => {
    //       console.log('adBreakDone', e);
    //     },  // always called, unblocks the game logic
    //   });
    // }
  };

  return (
    <div className="results" style={useScale(true).styles}>
      <div className='results-main'>
      <div className="results-title">
        {results.disconnectReason?.code === DisconnectTypes.Player ? 'You got stabbed' : results.disconnectReason?.code === DisconnectTypes.Mob ? 'You were destroyed' : 'You were disconnected'}
        <br />
      </div>

      <div className="results-container">
        <div className="info">
          <div className="title">{results.disconnectReason?.code === DisconnectTypes.Player ? 'Stabbed by' : results.disconnectReason?.code === DisconnectTypes.Mob ? 'By' : 'Disconnect reason:'}</div>
          {results.disconnectReason?.reason}
        </div>

        <div className="info">
          <div className="title">Coins:</div>
          <CountUp
            duration={3}
            end={results.coins}
          />
        </div>

        <div className="info">
          <div className="title">Stabs:</div>
          <CountUp
            duration={3}
            end={results.kills}
          />
        </div>

        <div className="info">
          <div className="title">Survived:</div>
          <CountUp
            end={results.survivalTime}
            duration={3}
            formattingFn={(s) => `${((s % 3600) / 60).toFixed(0)}m ${(s % 60).toFixed(0)}s`}
          />
        </div>
        { isLoggedIn && (
          <>
        <div className="info">
          <div className="title">Gems Gained</div>
          <CountUp
            end={calculateGemsXP(results.coins, results.kills).gems}
            duration={3}
          />
        </div>
        <div className="info">
          <div className="title">XP Gained</div>
          <CountUp
            end={calculateGemsXP(results.coins, results.kills).xp}
            duration={3}
          />
        </div>
        <div className="info">
          <div className="title">Mastery Earned</div>
          <CountUp
            end={calculateGemsXP(results.coins, results.kills).mastery}
            duration={3}
          />
        </div>
        </>
        )}
      </div>



      <div className="results-buttons">
        <div
          className="to-home"
          role="button"
          onClick={onHomeClick}
          onKeyDown={event => event.key === 'Enter' && onHomeClick()}
          tabIndex={0}
        >
          <img src={HomeImg} alt="Home" />
        </div>
        { results.disconnectReason?.type !== DisconnectTypes.Server && (
        <div
          className="play-again"
          role="button"
          onClick={onRestartClick}
          onKeyDown={event => event.key === 'Enter' && onRestartClick()}
          tabIndex={0}
        >
          <img src={PlayAgainImg} alt="Play again" />
        </div>
        )}
</div>

      </div>
      { adElement ? (
          <div className="ad">
            {adElement}
          </div>
        ) : null}
    </div>
  )
}

export default GameResults;
