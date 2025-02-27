import CountUp from 'react-countup';
import { useScale } from '../Scale';

import PlayAgainImg from '../../assets/img/play-again.png';
import HomeImg from '../../assets/img/home.png';
import './GameResults.scss';
import { DisconnectTypes } from '../../game/Types';
import { calculateGemsXP, playVideoAd } from '../../helpers';
import cosmetics from '../../game/cosmetics.json';
import Player from '../../game/entities/Player';

function GameResults({ onHome, results, game, isLoggedIn, adElement }: any) {
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
          {results.disconnectReason?.code === DisconnectTypes.Player && isLoggedIn && (
          <> <p className='skin-owner'>Stabber's skin</p>
          <div className='skin'>
          {results.disconnectReason?.reason.account
        ? <p className='skin-name'>{results.disconnectReason?.reason.account?.skins.equipped.displayName}</p>
        : <p className='skin-name'>Default</p>
      }
      {results.disconnectReason?.reason?.account?.skins?.equipped?.event && (
  <p className='skin-tag-event'>Event Skin</p>
)}
      {results.disconnectReason?.reason?.account?.skins?.equipped?.og && (
  <p className='skin-tag-og'>Exclusive Skin</p>
)}
      {results.disconnectReason?.reason?.account?.skins?.equipped?.ultimate && (
  <p className='skin-tag-ultimate'>Ultimate Skin</p>
)}
      {!results.disconnectReason?.reason?.account?.skins?.equipped?.event && !results.disconnectReason?.reason?.account?.skins?.equipped?.og && !results.disconnectReason?.reason?.account?.skins?.equipped?.ultimate && (
  <br></br>
)}
          {results.disconnectReason?.reason.account
        ? <img src={'assets/game/player/'+Object.values(cosmetics.skins).find((skin: any) => skin.id === results.disconnectReason?.reason.account?.skins.equipped)?.bodyFileName} alt="Equipped skin" className="equipped-skin" />
        : <img src={'assets/game/player/player.png'} alt="Equipped skin" className="equipped-skin" />
      }
        {results.disconnectReason?.reason.account? (
  <>
    <div className="skin-info">
    {results.disconnectReason?.reason.account?.skins.equipped.ultimate? (
      <img className={'gem'} src='assets/game/ultimacy.png' alt='Mastery' width={20} height={20} />
    ): (
      <img className={'gem'} src='assets/game/gem.png' alt='Gems' width={20} height={20} />
    )}
    {results.disconnectReason?.reason.account?.skins.equipped.og? (
      <p className='skin-info-og'>Unobtainable</p>
    ): (
      <p className='skin-info'>{results.disconnectReason?.reason.account?.skins.equipped.price}</p>
    )}
    </div>
  </>
): (
  <>
  <br></br>
  <div className="skin-info">
    <img className={'gem'} src='assets/game/gem.png' alt='Gems' width={20} height={20} />
    <p className='skin-info'>Free</p>
  </div>
  </>
)}
          </div>  
          </>)}
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
            end={calculateGemsXP(results.coins, results.kills).ultimacy}
            duration={3}
          />
        </div>
      
        </>
        )}
      </div>


      {results.disconnectReason?.code === DisconnectTypes.Player && isLoggedIn ? (
          <>
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
          </>)
          
        : (
<div className="results-buttons-def">
        <div
          className="to-home-def"
          role="button"
          onClick={onHomeClick}
          onKeyDown={event => event.key === 'Enter' && onHomeClick()}
          tabIndex={0}
        >
          <img src={HomeImg} alt="Home" />
        </div>
        { results.disconnectReason?.type !== DisconnectTypes.Server && (
        <div
          className="play-again-def"
          role="button"
          onClick={onRestartClick}
          onKeyDown={event => event.key === 'Enter' && onRestartClick()}
          tabIndex={0}
        >
          <img src={PlayAgainImg} alt="Play again" />
        </div>
        )}
</div>
        )
      }
      

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
