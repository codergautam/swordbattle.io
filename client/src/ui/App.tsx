import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOut, faICursor,faGear, faX } from '@fortawesome/free-solid-svg-icons';

import clsx from 'clsx';
import { useScale } from './Scale';

import GameComponent from './game/GameComponent';
import Modal from './modals/Modal';
import SettingsModal from './modals/SettingsModal';
import LoadingScreen from './LoadingScreen';
import ChangelogModal from './modals/ChangelogModal';
import LoginModal from './modals/LoginModal';
import SignupModal from './modals/SignupModal';
import ConnectionError from './modals/ConnectionError';

import { clearAccount, setAccount, logoutAsync, changeNameAsync, changeClanAsync, changeBioAsync } from '../redux/account/slice';
import { selectAccount } from '../redux/account/selector';
import api from '../api';

import SettingsImg from '../assets/img/settings.png';
import DiscordLogo from '../assets/img/discordLogo.png';
import GithubLogo from '../assets/img/githubLogo.png';
import SignupImg from '../assets/img/signup.png';
import LoginImg from '../assets/img/login.png';
import './App.scss';
import GemCount from './ValueCnt';
import ShopButton from './ShopButton';
import InventoryButton from './InventoryButton';
import LeaderboardButton from './LeaderboardButton';
import ShopModal from './modals/ShopModal';
import InventoryModal from './modals/InventoryModal';
import MigrationModal from './modals/MigrationModal';
import { getCookies, playVideoAd } from '../helpers';
import Ad from './Ad';
import { Settings } from '../game/Settings';
import { getServerList, updatePing } from '../ServerList';
import AccountCard from './AccountCard';
import ChangelogCard from './ChangelogCard';
// import Game from '../game/scenes/Game';
import titleImg from '../assets/img/final.png';
import Leaderboard from './game/Leaderboard';
import { crazygamesSDK } from '../crazygames/sdk';
import { initializeDataStorage } from '../crazygames/dataStorage';

import * as cosmetics from '../game/cosmetics.json'

let debugMode = false;
try {
  debugMode = window.location.search.includes("debugAlertMode");
  } catch(e) {}

function App() {
  let { skins } = cosmetics;
  const timereset = 23; // 0-23 utc
  
  const dispatch = useDispatch();
  const account = useSelector(selectAccount);
  function getShopDayKey(now = new Date()) {
    const shifted = new Date(now.getTime() - timereset * 60 * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(shifted.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function seedFromString(s: string) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed: number) {
    return function() {
      let t = (seed += 0x6D2B79F5) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededShuffle<T>(arr: T[], seedStr: string) {
    const a = arr.slice();
    const rng = mulberry32(seedFromString(seedStr));
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function computeGlobalSkinList(dayKey: string) {
    const allSkins = Object.values(skins) as any[];
    const eligible = allSkins.filter((skin: any) =>
      !skin.event &&
      !skin.og &&
      !skin.ultimate &&
      !skin.eventoffsale &&
      skin.price > 0 &&
      skin.buyable &&
      !skin.description.includes('Given') &&
      !skin.currency
    );
    const sortedByPriceDesc = [...eligible].sort((a, b) => (b.price || 0) - (a.price || 0));
    const top15 = sortedByPriceDesc.slice(0, 15).map(s => s.id);
    const topSet = new Set(top15);
    const shuffleArray = <T,>(arr: T[]) => seededShuffle(arr, dayKey);
    const pickUnique = (pool: any[], count: number, selected: Set<number>) => {
      const candidates = shuffleArray(pool.map(s => s.id)).filter(id => !selected.has(id) && !topSet.has(id));
      const picked = candidates.slice(0, count);
      picked.forEach(id => selected.add(id));
      return picked;
    };
    const bucket1 = eligible.filter(s => s.price >= 1 && s.price <= 500);
    const bucket2 = eligible.filter(s => s.price > 500 && s.price <= 5000);
    const bucket3 = eligible.filter(s => s.price > 5000);
    const selectedSet = new Set<number>();
    const picks: number[] = [];
    picks.push(...pickUnique(bucket1, 15, selectedSet));
    picks.push(...pickUnique(bucket2, 15, selectedSet));
    picks.push(...pickUnique(bucket3, 15, selectedSet));
    const needed = 45 - picks.length;
    if (needed > 0) {
      const remainingPool = shuffleArray(eligible.map(s => s.id)).filter(id => !selectedSet.has(id) && !topSet.has(id));
      const fill = remainingPool.slice(0, needed);
      fill.forEach(id => selectedSet.add(id));
      picks.push(...fill);
    }
    let newSkinList = [...picks.slice(0, 45), ...top15];
    if (newSkinList.length < 60) {
      const remaining = shuffleArray(eligible.map(s => s.id)).filter(id => !newSkinList.includes(id));
      newSkinList.push(...remaining.slice(0, 60 - newSkinList.length));
    }
    const uniqueList = Array.from(new Set(newSkinList)).slice(0, 60);
    const finalList = uniqueList.length === 60 ? uniqueList : newSkinList.slice(0, 60);
    return finalList;
  }

  const scale = useScale(false);
  const [name, setName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modal, setModal] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string>('');
  const [firstGame, setFirstGame] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [game, setGame] = useState<Phaser.Game | undefined>(window.phaser_game);
  const [clanMemberCount, setClanMemberCount] = useState(0);
  const [clanXP, setClanXP] = useState(0);

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const messages = [
    "Tip: The Lumberjack's ability has multiple uses: finding chests, defending against enemies, and breaking chests faster!",
    "Tip: The Super Archer's ability cancels its current swordthrow and resets its throw cooldown, allowing you to throw twice!",
    "Tip: The Rook's ability dashes itself in the last direction it moved in, helping out for both mobility and offense!",
    "Tip: The Defender doesn't deal much damage, but has a ton of health and size, making it great for preventing attacks!",
    "Tip: The Defender's ability can be used to knock enemies across the map, pushing them far away!",
    "Tip: The Tank's ability greatly increases its size and regen, providing lots of defense for a short time!",
    "Tip: The Samurai has lots of knockback reduction, making it harder for other players to push you around!",
    "Tip: The Rook can only move in four directions, but has great stats that make up for it!",
    "Tip: The Berserker has low health but high damage, making it great for aggressive playstyles!",
    "Tip: The Berserker's ability only somewhat increases its stats, but lasts a long time, helping for a final push on an enemy!",
    "Tip: The Vampire's ability greatly increases its lifesteal, damage, & speed, making it great for healing and killing enemies!",
    "Tip: The Vampire is very good at fighting teams of players, as it can heal off of each of them!",
    "Tip: The Warrior is great for being aggressive while keeping good defensive stats, making it great for fighting!",
    "Tip: The Warrior's ability increases its speed, damage and size, making it great for chasing down enemies!",
    "Tip: The Lumberjack deals bonus damage to chests at the cost of less damage to mobs and players, making it good for farming!",
    "Tip: The Fighter has faster attack speed, regen time, and ability cooldown, letting it be apart of more fights!",
    "Tip: The Fighter ability affects stats very slightly, but can be activated very often!",
    "Tip: The Stalker's ability makes it invisible and very fast, which is helpful for both ambushes and escapes!",
    "Tip: The Archer makes swordthrows better and, while mediocre by itself, evolves to the Sniper and Super Archer at 50k coins!",
    "Tip: The Sniper can maintain distance from enemies due to its fast throwing and increased sight range!",
    "Tip: The Slasher attacks in twice as wide of an arc, which is helpful for hitting multiple enemies at once!",
    "Tip: The Striker is great for taking down a team of enemies!",
    "Tip: Each player in a chain hit from the Striker takes 25% less damage than the previous player.",
    "Tip: The Striker ability makes all players in a chain hit take as much damage as the initial hit!",
    "Tip: The Plaguebearer deals half its damage as instant damage, and half as poison damage over 1 second!",
    "Tip: The Plaguebearer's ability summons a poison field that can take down many enemies at once, and scare them away!",
    "Tip: Throwing your sword temporarily prevents melee attacks, making you vulnerable to enemies up close!",
    "Tip: Predicting enemy swordthrows can help you dodge them more often!",
    "Tip: Join the Swordbattle Discord Server for more detailed changelogs and patch notes!",
    "Tip: Join the Swordbattle Discord Server to chat with other players and get help!",
    "Tip: Join the Swordbattle Discord Server to vote on polls to decide the future of Swordbattle.io!",
    "Tip: You can report bugs and suggest features on the Swordbattle.io Discord Server!",
    "Tip: You can report players through the Swordbattle.io Discord Server.",
    "Tip: Join the Swordbattle Discord Server for sneak peaks and exclusive news!",
    "Tip: Boosting the Swordbattle Discord Server gives you a permanent Supporter tag on your profile, and an exclusive name color!",
    "Tip: Boosting the Swordbattle Discord Server gives you a permanent Supporter tag on your profile, and an exclusive name color!",
    "Tip: Boosting the Swordbattle Discord Server gives you access to exclusive channels and in-game giveaways!",
    "Tip: You can only regen after not taking damage for a couple seconds, so stay away from mobs and lava to keep regening!",
    "Tip: The Ancient Statues have two attacks: throwing damaging stone swords and a boulder that knocks you far back!",
    "Tip: The Roku fires a lot of fireballs when you get too close, so stay back to avoid taking damage!",
    "Tip: Press C, E, Shift, or Right Click on computer to throw your sword!",
    "Tip: You can hide the Leaderboard, Minimap and Evolutions panels by clicking on their nametags!",
    "Tip: TPS measures how well the server is running, with 20 being the best. Report low TPS to support@swordbattle.io or on Discord.",
    "Tip: Report server crashes, restarts, or disconnects to support@swordbattle.io or the Swordbattle Discord Server.",
    "Tip: Forgot your password or username? You can reset it by emailing support@swordbattle.io",
    "Tip: Get enough Coins or XP to get onto the Leaderboards!",
    "Tip: Creating an account lets you save your progress and earn cool skins through the shop!",
    "Tip: Create an account to get a blue nametag and access to the shop and inventory!",
    "Tip: Creating an account will let you earn XP and make yourself more recognizable to other players!",
    "Tip: Create an account to be able to get on the Leaderboards and see your rank!",
    "Tip: The 4 tiers of evolutions are unlocked at 1000, 5000, 20000, and 50000 Coins!",
    "Tip: You earn more and more mastery when getting more coins in a single life!",
    "Tip: To maximize the mastery you earn, try to get as many coins as possible without dying!",
    "Tip: Getting a bunch of games with 500000+ coins will help you earn mastery much faster!",
    
  ];
  const [randomMessage] = useState(() => messages[Math.floor(Math.random() * messages.length)]);

  const bottomLeftContainerStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    bottom: 0,
    transform: `scale(${scale.factor})`,
    transformOrigin: 'bottom left',
    pointerEvents: 'none',
  };

  useEffect(() => {

    // debounce resize
    let timeout: any;
    const onResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }, 100);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if(gameStarted && firstGame) setFirstGame(false);
    if(gameStarted) return;
    setTimeout(() => {
      // if(!getCookies().hasOwnProperty('auth-token') || !getCookies()['auth-token']) {
      //   console.log('No auth token found, skipping account check');
      //   setAccountReady(true);
      //   return;
      // }
      // console.log('Checking account');
      // let secret: string | null = null;
      // try {
      //  secret = window.localStorage.getItem('secret');
      // } catch(e) {
      //   console.log('Error getting secret', e);
      // }
    // api.get(`${api.endpoint}/auth/account?now=${Date.now()}`, (data) => {
    //   console.log('Account data', data);
    //   setAccountReady(true);
    //   if (data.account) {
    //     data.account.token = data.token;
    //     // if(data.account.secret) {
    //     //   try {
    //     //     window.localStorage.setItem('secret', data.account.secret);
    //     //   } catch(e) {
    //     //     console.log('Error setting secret', e);
    //     //   }
    //     // }
    //     dispatch(setAccount(data.account));
    //   } else {
    //     if(typeof secret === 'string' && secret.length > 0) {
    //       // attempt legacy login with secret
    //       console.log('Attempting legacy login with secret');
    //       api.post(`${api.endpoint}/auth/legacyLogin`, { secret }, (data) => {
    //         if (data.account) {
    //           data.account.token = data.token;
    //           dispatch(setAccount(data.account));
    //         } else {
    //           console.log('Error logging in with secret', data);
    //           dispatch(clearAccount());
    //         }
    //       });
    //     }
    //     dispatch(clearAccount());
    //   }
    // });
      let secret: string | null = null;
      try {
       secret = window.localStorage.getItem('secret');
      } catch(e) {
        console.log('Error getting secret', e);
      }
    if(!secret) {
      dispatch(clearAccount());
      setAccountReady(true);
    } else {
      api.post(`${api.endpoint}/auth/loginWithSecret`, null, (data) => {
        setAccountReady(true);
        if (data.account) {
          data.account.secret = data.secret;
          dispatch(setAccount(data.account));
        } else {
          dispatch(clearAccount());
        }
      });
    }
  }, 10);

  if(!firstGame) return;
    // setModal(<ChangelogModal />);
  }, [gameStarted]);

  const [server, setServer] = useState(Settings.server);
  const [servers, setServers] = useState<any[]>([]);

    const updateServer = (value: any) => {
    setServer(value);
    Settings.server = value;

    // const gameState = (game?.scene.scenes[0] as Game).gameState;
    // TODO: change server without reloading

      window.location.reload();
  }

  useEffect(() => {
    window.addEventListener('assetsLoadProgress', (e: any) => {
      setLoadingProgress(Math.floor(e.detail * 98));
      if(e.detail === 1) setAssetsLoaded(true);
    });
  }, []);


  useEffect(() => {
    if (gameStarted) {
      // prevent accidental exit
      window.onbeforeunload = function(e)
        {
          e.preventDefault();
          return "Are you sure you want to exit";
        }

    } else {
      window.onbeforeunload = null;
    }
  }, [gameStarted]);
  const onGameReady = () => {
    setIsConnected(true);
  };

  useEffect(() => {
    console.log('Checking if everything is ready. Connected:', isConnected, 'Assets:', assetsLoaded);
    if(debugMode) {
      alert('check. Connected: ' + isConnected + ' Assets: ' + assetsLoaded);
    }
    if(isConnected && assetsLoaded) {
      setLoadingProgress(100);
    }
  }, [isConnected, assetsLoaded]);

  useEffect(() => {
    console.log('Getting server list');
    getServerList().then(setServers);

    // Check for CrazyGames instant multiplayer or invite params
    try {
      const roomId = crazygamesSDK.getInviteParam('roomId');
      const region = crazygamesSDK.getInviteParam('region');

      if (roomId) {
        console.log('[CrazyGames] Joining via invite link - Room ID:', roomId);
        if (region) {
          console.log('[CrazyGames] Setting region from invite:', region);
        }
      }

      // Check for instant multiplayer mode
      if (crazygamesSDK.isInstantMultiplayer()) {
        console.log('[CrazyGames] Instant multiplayer mode enabled');
        // For swordbattle this just means join game immediately
      }
    } catch (error) {
      console.error('[CrazyGames] Error checking multiplayer settings:', error);
    }

    // Automatic CrazyGames login
    const attemptCrazygamesLogin = async () => {
      try {
        // Only attempt login if on CrazyGames and no existing account
        if (!crazygamesSDK.shouldUseSDK() || !crazygamesSDK.isUserAccountAvailable()) {
          console.log('[CrazyGames] SDK not available or user accounts not supported');
          return;
        }

        // Check if already logged in
        const existingSecret = window.localStorage.getItem('secret');
        if (existingSecret) {
          console.log('[CrazyGames] Already logged in with existing account');
          return;
        }

        console.log('[CrazyGames] Attempting automatic login');

        const user = await crazygamesSDK.getUser();
        if (!user) {
          console.log('[CrazyGames] No user logged in');
          return;
        }

        const token = await crazygamesSDK.getUserToken();
        if (!token) {
          console.error('[CrazyGames] Failed to get user token');
          return;
        }

        console.log('[CrazyGames] User found:', user.username);

        // Call backend to create/login account
        api.post(`${api.endpoint}/auth/crazygames/login`, {
          token,
          userId: user.userId,
          username: user.username,
        }, (data: any) => {
          if (data.error) {
            console.error('[CrazyGames] Login failed:', data.error);
            return;
          }

          if (data.account && data.secret) {
            console.log('[CrazyGames] Login successful');

            // Store the secret
            try {
              window.localStorage.setItem('secret', data.secret);
            } catch (e) {
              console.error('[CrazyGames] Error storing secret:', e);
            }

            // Set the account in Redux
            dispatch(setAccount(data.account));

            initializeDataStorage().then(() => {
              console.log('[CrazyGames] Data storage re-initialized after login');
            }).catch(error => {
              console.error('[CrazyGames] Error re-initializing data storage:', error);
            });
          }
        });
      } catch (error) {
        console.error('[CrazyGames] Auto-login error:', error);
      }
    };

    setTimeout(() => {
      attemptCrazygamesLogin();
    }, 500);
  }, []);

  useEffect(() => {
  if (account?.clan) {
    api.get(`${api.endpoint}/profile/clanMembers?clan=${account.clan}`, (data) => {
      if (data && typeof data.count === 'number') {
        setClanMemberCount(data.count);
        setClanXP(data.xp);
      }
    });
  }
}, [account?.clan]);

  const onStart = () => {
    console.log('Starting game');
    if(!isConnected) {
      alert('Not connected yet');
      return;
    }
    else  {
      const go = () => {
        setGameStarted(true);
        window.phaser_game?.events.emit('startGame', name);
      }
      // playVideoAd().then(() => {
      //   go();
      // }).catch((e) => {
      //   console.log('Error playing video ad', e);
      //   go();
      // });
      go();
    }
  };


  const openSettings = () => setModal(<SettingsModal />);
  const closeModal = () => setModal(null);
  const onHome = () => setGameStarted(false);
  const onConnectionClosed = (reason: string) => {
    console.log('Connection closed', reason);
    setConnectionError(reason);
  }

  const onSucessAuth = () => setModal(null);
  const onLogin = () => setModal(<LoginModal onSuccess={onSucessAuth} />);
  const onSignup = () => setModal(<SignupModal onSuccess={onSucessAuth} />);
  const onLogout = () => dispatch(logoutAsync() as any);
  const onChangeName = () => {
    const newName = prompt('What do you want to change your name to? Please note that you can only change your name once every 7 days.');
    if (!newName) return;

    dispatch(changeNameAsync(newName) as any);
  }
  const onChangeClan = () => {
    const newClan = prompt('What do you want your clan tag to be? Clans can only be 1-4 characters long, and you can only change your clan once every 7 days.');
    if (!newClan) return;

    dispatch(changeClanAsync(newClan) as any);
  }
  const onChangeBio = () => {
    const newBio = prompt('What do you want your bio to be? You can change it whenever you want, but it can only be up to 100 characters long.');
    if (!newBio) return;

    dispatch(changeBioAsync(newBio) as any);
  }
  const onRemoveClan = () => {
    const newClan = prompt('Are you sure you want to remove your clan tag? You cannot change it again for 7 days. Type anything to confirm.');
    if (!newClan) return;

    dispatch(changeClanAsync('X79Q') as any);
  }
  const openShop = () => {
    setModal(<ShopModal account={account} />);
  }

  
  const openInventory = () => {
    setModal(<InventoryModal account={account} />);
  }

  const openLeaderboard = () => {
    window.location.hash = "#/leaderboard";
  };

  useEffect(() => {
    if (modal?.type?.displayName === 'ShopModal') {
      setModal(<ShopModal account={account} />);
    }
    if(account.is_v1) {
      setModal(<MigrationModal account={account} />);
    }
  }, [account]);

  useEffect(() => {
    if(loadingProgress === 100 && (window as any).instantStart) {
      (window as any).instantStart = false;
      onStart();
    }
  }, [loadingProgress]);
  const isLoaded = loadingProgress === 100;
  return (
    <div className="App">
      <LoadingScreen progress={loadingProgress} />
      <GameComponent
        onHome={onHome}
        onGameReady={onGameReady}
        onConnectionClosed={onConnectionClosed}
        dimensions={dimensions}
        loggedIn={account.isLoggedIn}
        game={game}
        setGame={setGame}
      />
      {connectionError && (
        <Modal
          child={<ConnectionError reason={connectionError}/>}
          className="connectionErrorModal"
        />
      )}

      {!gameStarted && (
        <>
        <div className={`${isConnected ? 'loaded mainMenu' : 'mainMenu'}`}>
        <ShopButton account={account} scale={scale.factor} openShop={openShop} />
        {account?.isLoggedIn && (
          <InventoryButton account={account} scale={scale.factor} openInventory={openInventory} />
          )}
        <LeaderboardButton scale={scale.factor} openLeaderboard={openLeaderboard} />
            <div id="contentt" style={scale.styles}>

          <div id="menuContainer" >

            {/* <!-- GAME NAME --> */}
            <div id="gameName"><img src={titleImg} alt="Swordbattle.io" width={750} height={250} className="title-img" />
</div>

            {/* <!-- LOADING TEXT --> */}
            {/* <!-- MENU CARDS --> */}
            <div id="menuCardHolder" style={{ display: 'inline-block', height: 'auto !important', position: 'fixed',
    top: '-50%',
    left: '50%',
    transform: 'translate(-50%, -25%)' }} >
              <div className="menu">
                <div className="accountCard menuCard panel">
                  <AccountCard account={account} onLogin={onLogin} onSignup={onSignup} />
                </div>

                {/* <div className="announcementCard menuCard panel">
                    {account?.username === "Update Testing Account" ? (
                      <>
                      <div style={{ fontSize: '15px' }}>
                        UTA info
                      </div>
                      <div style={{ fontSize: '15px' }}>
                        {account?.clan
                        ? `Clan "${account.clan}" has ${clanMemberCount ?? '...'} members, and ${clanXP ?? '...'} total xp`
                        : 'No clan'}
                      </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '15px', color: 'yellow' }}>
                        October 4th: Fighter now loses speed and damage out-of-combat, and balanced most evolutions!
                      </div>
                    )}
                  </div> */}

                {/* <!-- Play --> */}
                <div className="joinCard menuCard panel" style={{ position: 'relative' }}>
                  <div className="joinCardInput">
                    <input
                      type="text"
                      id="nameInput"
                      placeholder="Enter Name"
                      maxLength={20}
                      value={account.isLoggedIn ? account.username : name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ cursor: account.isLoggedIn ? 'not-allowed' : 'text'}}
                      disabled={account.isLoggedIn}
                      autoComplete="none"
                    />
                    <select id="serverBrowser"
                    value={servers.length === 0 ? 'loading' : server}
                    onChange={(e) => updateServer(e.target.value)}
                    >
                    {servers.length === 0 && <option value="loading" disabled>Loading...</option>}
        {servers.map((server) => <option key={server.value} value={server.value} disabled={server.offline}>
          {server.name} ({server.offline ? 'OFFLINE' : `${server.playerCnt} players - ${server.ping}ms`})
        </option>)}
                    </select>

                    <div id="enterGame" className="menuButton" onClick={() => {
                        if (accountReady && isConnected) {
                          if (account.isLoggedIn && account.username.startsWith(".")) {alert(
                            "Your account has been temporarily suspended due to violations of the game's rules. This restriction will be lifted soon. Please log out to play with a different account."
                            ); return; } onStart(); }}}>
                        {(accountReady && isConnected) ? 'Play!' : 'Connecting...'}
                    </div>
                  </div>
                </div>
                <div className="accountCard menuCard panel">
                  <ChangelogCard/>
                </div>
              </div>
              <div
                className="panel tipCard"
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '75%',
                  margin: 'auto',
                  marginTop: 5,
                  padding: 7,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  maxWidth: '100%',
                  color: 'white'
                }}
                title={randomMessage}
              >
                {randomMessage}
              </div>
              <br />
              <div className='fullWidth'>
                <div id="adBelow">
                 <Ad screenW={dimensions.width} screenH={dimensions.height} types={[[728, 90], [970, 90], [970, 90]]} />
                </div>
              </div>
            </div>

</div>
          </div>

          {/* <!-- BUTTONS --> */}
          <div style={bottomLeftContainerStyle} className="bottom-left-buttons">
          <div id="settingsButton" className="altLink panel" style={{ pointerEvents: 'auto' }} onClick={openSettings}>
            <FontAwesomeIcon icon={faGear} className='ui-icon'/>
          </div>

          <a id="githubButton" className="altLink imgPanel" href="https://github.com/codergautam/swordbattle.io" target="_blank" rel="nofollow" style={{ pointerEvents: 'auto' }}>
            <img src={GithubLogo} width={60} alt="GitHub" />
          </a>
          <a id="discordButton" className="altLink imgPanel" href="https://discord.com/invite/9A9dNTGWb9" target="_blank" rel="nofollow" style={{ pointerEvents: 'auto' }}>
            <img src={DiscordLogo} width={60} alt="Discord" />
          </a>
          <div id="playlightButton" className="imgPanel" style={{ pointerEvents: 'auto' }} onClick={() => {
              try {
                (window as any)?.showPlaylight();
              } catch (e) {
                console.log('Error showing playlight', e);
              }
            }}>
            More Games
          </div>
          </div>
          {modal && <Modal child={modal} close={closeModal} scaleDisabled={modal.type.name === 'ShopModal'} />}

<div className="auth-buttons" style={scale.styles}>
             {account.isLoggedIn ? (
               <div className="dropdown">
                {account.clan ? (
                    <div className="auth-username">
                    <FontAwesomeIcon icon={faUser} />{' '}
                    {account.clan?.toUpperCase() !== 'X79Q' && (
                      <span style={{ color: 'yellow' }}>[{account.clan?.toUpperCase()}]</span>
                    )}{' '}
                    {account.username}
                    </div>
                ) : (
                  <div className="auth-username">
                    <FontAwesomeIcon icon={faUser} /> {account.username}
                  </div>
                )}
                 <ul className="dropdown-menu">
                   <li>
                   <a className="dropdown-item" href="#" onClick={onChangeName}>
                     <FontAwesomeIcon icon={faICursor} /> Change Name
                   </a>
                    </li>
                    {!crazygamesSDK.getSettings().disableChat && (
                      <li>
                        <a className="dropdown-item" href="#" onClick={onChangeBio}>
                          <FontAwesomeIcon icon={faICursor} /> Change Bio
                        </a>
                      </li>
                    )}
                    <li>
                   <a className="dropdown-item" href="#" onClick={onChangeClan}>
                     <FontAwesomeIcon icon={faICursor} /> Change Clan
                   </a>
                   </li>
                   <li>
                   <a className="dropdown-item" href="#" onClick={onRemoveClan}>
                     <FontAwesomeIcon icon={faX} /> Remove Clan
                   </a>
                   </li>
                   {!account.isCrazygames && (
                     <li><a className="dropdown-item" href="#" onClick={onLogout}>
                       <FontAwesomeIcon icon={faSignOut} /> Logout
                     </a></li>
                   )}
                 </ul>
               </div>
             ) : (
               <>
               <img src={LoginImg} alt="Login" role="button" className="auth-btn" onClick={onLogin} />
               <img src={SignupImg} alt="Signup" role="button" className="auth-btn" onClick={onSignup} />
               </>
             )}
           </div>


          {/* <!-- LINKS CONTAINERS --> */}
          {/* <div id="linksContainer" className='panel'>
            <a href="./docs/terms.txt" target="_blank">Policy</a> |
            <a href="./docs/privacy.txt" target="_blank">Privacy</a>
          </div> */}
                 <footer className={clsx('links', isLoaded && 'animation')} style={scale.styles}>
             {/* Footer not in use for now */}
           </footer>
        </div>

        </>
      )}
    </div>
  );
}

export default App;
