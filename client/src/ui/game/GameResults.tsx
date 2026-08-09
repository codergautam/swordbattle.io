import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import CountUp from 'react-countup';
import { useScale } from '../Scale';

import PlayAgainImg from '../../assets/img/play-again.png';
import HomeImg from '../../assets/img/home.png';
import gemRewardImg from '../../assets/img/gem-reward.png';
import './GameResults.scss';
import { DisconnectTypes } from '../../game/Types';
import { calculateGemsXP, playVideoAd, playRewardedAd, isAdBlockActive, isAdsenseProvider, armAdsenseReward } from '../../helpers';
import { crazygamesSDK } from '../../crazygames/sdk';
import api from '../../api';
import { updateAccountAsync } from '../../redux/account/slice';
import { getVariant, trackRunEnd, trackAd } from '../../analytics';
import { updatePB, getEncouragingMessage, formatTime } from '../../game/PersonalBest';

const isBasicLaunch = typeof window !== 'undefined' && !!(window as any)._isCrazyGamesBasicLaunch;

// Smarter video ad logic to prevent spammed ads
const deathsBetweenAds = 1;
const minTimeBetweenAdsMs = 1000 * 60 * 1;

function shouldShowVideoAd(): boolean {
  const windowAny = window as any;

  if (windowAny?._isCrazyGamesBasicLaunch) {
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
    if (newDeathCount >= deathsBetweenAds && timeSinceLastAd > minTimeBetweenAdsMs) {
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
  const dispatch = useDispatch();
  const xpBonusExpiry = useSelector((state: any) => state.account?.dailyLogin?.xpBonus);
  const xpBonusActive = xpBonusExpiry && xpBonusExpiry > Date.now();

  const baseGems = useMemo(() => calculateGemsXP(results.coins || 0, results.kills || 0, 0).gems, [results]);
  const [adblockActive, setAdblockActive] = useState(() => isAdBlockActive());
  const [gemBonus, setGemBonus] = useState<'idle' | 'arming' | 'loading' | 'done' | 'unavailable'>(isAdsenseProvider() ? 'arming' : 'idle');
  const [noAdblockClaimed, setNoAdblockClaimed] = useState(false);
  const [bannerReady, setBannerReady] = useState(false);
  const [interstitialDone, setInterstitialDone] = useState(false);
  const showRewardRef = useRef<(() => void) | null>(null);
  const [armNonce, setArmNonce] = useState(0);

  useEffect(() => {
    const h = () => setAdblockActive(isAdBlockActive());
    window.addEventListener('adblockStatusChanged', h);
    return () => window.removeEventListener('adblockStatusChanged', h);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || adblockActive || baseGems <= 0) return;
    let cancelled = false;
    let attempt = 0;
    const tryClaim = () => {
      if (cancelled) return;
      attempt++;
      api.post(`${api.endpoint}/auth/claim-gem-bonus`, { sources: ['noadblock'] }, (data: any) => {
        if (cancelled) return;
        if (data && (data.success || (data.claimed || []).includes('noadblock'))) {
          setNoAdblockClaimed(true);
          dispatch(updateAccountAsync() as any);
        } else if (attempt < 4) {
          setTimeout(tryClaim, 1200 * attempt);
        }
      });
    };
    tryClaim();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gemMultiplier = (gemBonus === 'done' ? 2 : 1) * (noAdblockClaimed ? 2 : 1);
  const adDoubled = gemBonus === 'done';
  const adDelta = baseGems * (noAdblockClaimed ? 2 : 1);

  const rewardSectionShown = isLoggedIn && baseGems > 0 && !isBasicLaunch && !adblockActive;

  const onRewardResult = ({ success, evt }: { success: boolean; evt: string }) => {
    if (!success) {
      if (evt === 'video-ad-skipped') trackAd('rewarded_skipped', { ad_format: 'rewarded', placement: 'reward_2x' });
      const dismissed = evt === 'video-ad-skipped' || evt.includes('dismissed');
      showRewardRef.current = null;
      setGemBonus(dismissed ? 'idle' : 'unavailable');
      if (dismissed && isAdsenseProvider()) setArmNonce((n) => n + 1);
      return;
    }
    trackAd('rewarded_complete', { ad_format: 'rewarded', placement: 'reward_2x' });
    api.post(`${api.endpoint}/auth/claim-gem-bonus`, { sources: ['ad'] }, (data: any) => {
      if (data && data.success) {
        trackAd('rewarded_claimed', { ad_format: 'rewarded', placement: 'reward_2x' });
        setGemBonus('done');
        dispatch(updateAccountAsync() as any);
      } else {
        console.warn('[2xGems] claim failed', data);
        setGemBonus('idle');
      }
    });
  };

  useEffect(() => {
    if (!isAdsenseProvider()) return;
    if (!rewardSectionShown || !interstitialDone) return;
    if (gemBonus === 'done' || gemBonus === 'loading') return;
    const cancel = armAdsenseReward({
      onOffer: (show) => { showRewardRef.current = show; setGemBonus('idle'); },
      onDone: onRewardResult,
    });
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewardSectionShown, interstitialDone, armNonce]);

  const onDoubleGems = () => {
    if (adblockActive) return;
    if (gemBonus !== 'idle' && gemBonus !== 'unavailable') return;
    if (isAdsenseProvider()) {
      const show = showRewardRef.current;
      if (!show) { setGemBonus('arming'); setArmNonce((n) => n + 1); return; }
      showRewardRef.current = null;
      setGemBonus('loading');
      trackAd('video_request', { ad_format: 'rewarded', placement: 'reward_2x' });
      show();
      return;
    }
    setGemBonus('loading');
    trackAd('video_request', { ad_format: 'rewarded', placement: 'reward_2x' });
    playRewardedAd().then(onRewardResult).catch(() => setGemBonus('idle'));
  };

  const pbResult = useMemo(() => updatePB({
    coins: results.coins || 0,
    kills: results.kills || 0,
    survivalTime: results.survivalTime || 0,
  }), [results]);

  useEffect(() => {
    const code = results?.disconnectReason?.code;
    const reason = code === DisconnectTypes.Player ? 'player_kill'
      : code === DisconnectTypes.Mob ? 'mob_kill'
      : code === DisconnectTypes.Server ? 'server_disconnect'
      : 'unknown';

    const variant = getVariant('death_preroll');
    const showPreroll = variant !== 'off' && shouldShowVideoAd();

    let prerollTimer: any = null;
    let bannerFailsafe: any = null;
    if (showPreroll) {
      bannerFailsafe = setTimeout(() => setBannerReady(true), 3000);
      prerollTimer = setTimeout(() => {
        console.log('[GameResults] Showing death interstitial (A/B: on)');
        trackAd('video_request', { ad_format: 'preroll', placement: 'death_interstitial' });
        playVideoAd().then(({ played, evt }) => {
          if (played) trackAd('video_complete', { ad_format: 'preroll', placement: 'death_interstitial' });
          else trackAd('video_no_fill', { ad_format: 'preroll', placement: 'death_interstitial', ad_size: evt });
        }).finally(() => { setBannerReady(true); setInterstitialDone(true); });
      }, 1200);
    } else {
      setBannerReady(true);
      setInterstitialDone(true);
    }

    trackRunEnd(reason, {
      coins: results?.coins || 0,
      kills: results?.kills || 0,
      killerName: results?.disconnectReason?.reason,
      playtimeMs: (results?.survivalTime || 0) * 1000,
      prerollShown: showPreroll,
    });
    return () => {
      if (prerollTimer) clearTimeout(prerollTimer);
      if (bannerFailsafe) clearTimeout(bannerFailsafe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger happy time for good games. At most once per results object: pbResult
  // comes from a useMemo whose recomputation React does not guarantee against, and
  // updatePB() is a write, so a second pass reports anyRecord=false, produces a new
  // identity, re-runs this effect and fires happytime again on the same run.
  const happytimeFiredFor = useRef<any>(null);
  useEffect(() => {
    if (!results || happytimeFiredFor.current === results) return;
    happytimeFiredFor.current = results;
    try {
      const coins = results?.coins || 0;
      const kills = results?.kills || 0;
      const survivalTime = results?.survivalTime || 0;

      // These fire on genuinely good runs, not once-in-a-lifetime ones. The old
      // thresholds (1M coins / 200 kills / 1 hour) were far beyond the ~6 min
      // average run, so happytime effectively never fired and CrazyGames never
      // got the signal to prompt for a rating or a favourite.
      if (pbResult?.anyRecord) {
        console.log('[CrazyGames] Happy time! New personal best.');
        crazygamesSDK.happytime();
      } else if (kills >= 10) {
        console.log('[CrazyGames] Happy time! 10+ kills.');
        crazygamesSDK.happytime();
      } else if (survivalTime >= 300) { // 5 minutes, ~a good run
        console.log('[CrazyGames] Happy time! 5+ minute run.');
        crazygamesSDK.happytime();
      } else if (coins >= 100000) {
        console.log('[CrazyGames] Happy time! 100k+ coins.');
        crazygamesSDK.happytime();
      }
    } catch (error) {
      console.error('[CrazyGames] Error triggering happy time:', error);
    }
  }, [results, pbResult]);

  useEffect(() => {
    const timer = setTimeout(() => {
      game.events.emit('goHome');
      onHome();
      game.events.emit('setGameResults', null);
      game.events.emit('startSpectate');
    }, 150000);
    return () => clearTimeout(timer);
  }, []);

  const calculateDropAmount = (coins: number) => {
    return coins < 13 ? 10 : Math.round(coins < 25000 ? coins * 0.8 : Math.log10(coins) * 30000 - 111938.2002602);
  };
  const hasEnoughCoins = results.coins >= 10000;
  const hasEnoughTime = results.survivalTime >= 120;
  const insuranceCoins = results.insuranceRespawnCoins || 0;
  const normalRespawnCoins = hasEnoughCoins && hasEnoughTime ? Math.round(calculateDropAmount(results.coins) / 2) : 0;
  const respawnCoins = insuranceCoins > 0 ? insuranceCoins : normalRespawnCoins;
  const coinProgress = Math.min(results.coins / 10000, 1);
  const timeProgress = Math.min(results.survivalTime / 120, 1);

  const onHomeClick = () => {
    if (respawnCoins > 0) {
      game.events.emit('pendingRespawnInfo', { coins: respawnCoins, expiresAt: Date.now() + 120000 });
    }
    game.events.emit('goHome');
    onHome();
    game.events.emit('setGameResults', null);
    game.events.emit('startSpectate');
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
    <>
    <div className="results-backdrop" />
    <div className="results" style={useScale(true).styles}>
      <div className='results-main'>
      <div className="results-title">
        {results.disconnectReason?.code === DisconnectTypes.Player ? 'You got stabbed' : results.disconnectReason?.code === DisconnectTypes.Mob ? 'You were destroyed' : 'You were disconnected'}
      </div>

      <div className="results-reason">
        {results.disconnectReason?.code === DisconnectTypes.Player ? 'Stabbed by ' : results.disconnectReason?.code === DisconnectTypes.Mob ? 'Destroyed by ' : 'Disconnected: '}
        <strong>{results.disconnectReason?.reason}</strong>
      </div>

      <div className="results-container">
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
            formattingFn={(s) => `${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`}
          />
        </div>
        { isLoggedIn && (
          <>
        <div className={`info gem-info${adDoubled ? ' gem-mult-ad' : ''}`}>
          <div className="title">Gems Gained{adDoubled ? ' (2x)' : ''}</div>
          <CountUp
            end={baseGems * gemMultiplier}
            duration={3}
            preserveValue
          />
        </div>
        <div className="info">
          <div className="title" style={xpBonusActive ? { color: '#ffeb3b' } : undefined}>XP Gained{xpBonusActive ? ' (2x)' : ''}</div>
          <CountUp
            end={calculateGemsXP(results.coins, results.kills, 0).xp * (xpBonusActive ? 2 : 1)}
            duration={3}
          />
        </div>
        <div className="info">
          <div className="title">Mastery Earned</div>
          <CountUp
            end={calculateGemsXP(results.coins, results.kills, 0).mastery}
            duration={3}
          />
        </div>
        </>
        )}
      </div>

      { isLoggedIn && baseGems > 0 && !isBasicLaunch && (
        <div className="double-gems">
          {adblockActive ? (
            <button
              type="button"
              className="double-gems-btn double-gems-adblock"
              onClick={() => window.alert('Turn off your ad blocker on swordbattle.io to claim this offer!\n\nAds are how we pay for the servers and support is greatly appreciated. Thanks for playing!')}
            >
              <img className="dg-icon" src={gemRewardImg} alt="" />
              <span>Disable adblocker for 2&#215; Gems</span>
            </button>
          ) : gemBonus === 'done' ? (
            <div className="double-gems-done">
              <img className="dg-icon" src={gemRewardImg} alt="" />
              <span>Gems doubled! +{adDelta.toLocaleString()}</span>
            </div>
          ) : (
            <button
              type="button"
              className="double-gems-btn"
              disabled={gemBonus === 'loading' || gemBonus === 'arming'}
              onClick={onDoubleGems}
            >
              <img className="dg-icon" src={gemRewardImg} alt="" />
              <span>
                {gemBonus === 'loading' ? 'Loading ad…'
                  : gemBonus === 'arming' ? 'Checking for an ad…'
                  : gemBonus === 'unavailable' ? 'No ad available, try again'
                  : 'Watch ad for 2× Gems'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* <div className="personal-best-section">
        {pbResult.anyRecord && <div className="pb-header new-record">NEW RECORD!</div>}
        {!pbResult.anyRecord && <div className="pb-header">Personal Best</div>}
        <div className="pb-stats">
          <div className={`pb-stat${pbResult.records.coins ? ' is-record' : ''}`}>
            <span className="pb-label">Coins</span>
            <span className="pb-value">{pbResult.pb.coins.toLocaleString()}</span>
            {pbResult.records.coins && <span className="pb-badge">NEW!</span>}
            {!pbResult.records.coins && <span className="pb-encourage">{getEncouragingMessage(results.coins, pbResult.pb.coins)}</span>}
          </div>
          <div className={`pb-stat${pbResult.records.kills ? ' is-record' : ''}`}>
            <span className="pb-label">Stabs</span>
            <span className="pb-value">{pbResult.pb.kills.toLocaleString()}</span>
            {pbResult.records.kills && <span className="pb-badge">NEW!</span>}
            {!pbResult.records.kills && <span className="pb-encourage">{getEncouragingMessage(results.kills, pbResult.pb.kills)}</span>}
          </div>
          <div className={`pb-stat${pbResult.records.survivalTime ? ' is-record' : ''}`}>
            <span className="pb-label">Survived</span>
            <span className="pb-value">{formatTime(pbResult.pb.survivalTime)}</span>
            {pbResult.records.survivalTime && <span className="pb-badge">NEW!</span>}
            {!pbResult.records.survivalTime && <span className="pb-encourage">{getEncouragingMessage(results.survivalTime, pbResult.pb.survivalTime)}</span>}
          </div>
        </div>
      </div> */}

      <div className="results-buttons">
        <div className="rb-left">
          {respawnCoins > 0 ? (
            <div className="respawn-info respawn-available">
              <span className="respawn-icon">&#x1F4B0;</span>
              {insuranceCoins > 0 ? (
                <span style={{color: '#ff00f2', fontWeight: 'bold'}}>Insurance activated! Respawn with {insuranceCoins.toLocaleString()} coins!</span>
              ) : (
                <span>Press Play Again to respawn with <strong>{respawnCoins.toLocaleString()}</strong> coins!</span>
              )}
            </div>
          ) : (
            <div className="respawn-info">
              <div className="respawn-progress-label">Respawn Progress</div>
              <div className="respawn-progress-bars">
                <div className="respawn-bar-row">
                  <span>Coins: {results.coins.toLocaleString()} / 10,000</span>
                  <div className="respawn-bar"><div className="respawn-bar-fill" style={{ width: `${Math.min(coinProgress * 100, 100)}%` }} /></div>
                </div>
                <div className="respawn-bar-row">
                  <span>Time: {Math.floor(results.survivalTime / 60)}:{String(Math.floor(results.survivalTime % 60)).padStart(2, '0')} / 2:00</span>
                  <div className="respawn-bar"><div className="respawn-bar-fill" style={{ width: `${Math.min(timeProgress * 100, 100)}%` }} /></div>
                </div>
              </div>
              <div className="respawn-hint">Reach both to keep coins on respawn!</div>
            </div>
          )}
        </div>

        <div className="rb-center">
          { results.disconnectReason?.type !== DisconnectTypes.Server && (
          <div
            className={`play-again ${(() => { try { return JSON.parse(sessionStorage.getItem('swordbattle:tutorialSession') || '{}').active ? 'tutorial-pulse' : ''; } catch { return ''; } })()}`}
            role="button"
            onClick={onRestartClick}
            onKeyDown={event => event.key === 'Enter' && onRestartClick()}
            tabIndex={0}
          >
            <img src={PlayAgainImg} alt="Play again" />
          </div>
          )}
        </div>

        <div className="rb-right">
          <div
            className="to-home"
            role="button"
            onClick={onHomeClick}
            onKeyDown={event => event.key === 'Enter' && onHomeClick()}
            tabIndex={0}
          >
            <img src={HomeImg} alt="Home" />
          </div>
        </div>
      </div>

      </div>
      { adElement && bannerReady ? (
          <div className="ad">
            {adElement}
          </div>
        ) : null}
    </div>
    </>
  )
}

export default GameResults;
