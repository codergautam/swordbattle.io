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
import SignupImg from '../assets/img/signup.png';
import LoginImg from '../assets/img/login.png';
import './App.scss';
import GemCount from './ValueCnt';
import ShopButton from './ShopButton';
import LeaderboardButton from './LeaderboardButton';
import ShopModal from './modals/ShopModal';
import MigrationModal from './modals/MigrationModal';
import { getCookies, playVideoAd } from '../helpers';
import Ad from './Ad';
import { Settings } from '../game/Settings';
import { getServerList, updatePing } from '../ServerList';
import AccountCard from './AccountCard';
import ForumCard from './ForumCard';
// import Game from '../game/scenes/Game';
import titleImg from '../assets/img/final.png';
import Leaderboard from './game/Leaderboard';

import * as cosmetics from '../game/cosmetics.json'

let debugMode = false;
try {
  debugMode = window.location.search.includes("debugAlertMode");
  } catch(e) {}

function App() {
  let { skins } = cosmetics;
  
  const dispatch = useDispatch();
  const account = useSelector(selectAccount);

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
    setModal(<ChangelogModal />);
  }, [gameStarted]);

  const [server, setServer] = useState(Settings.server);
  const [servers, setServers] = useState<any[]>([]);

  useEffect(() => {
    console.log('Getting server list');
    getServerList().then(setServers);
  }, []);

  useEffect(() => {
  if (!account?.lastDayPlayed) return;

  const lastPlayed = new Date(account.lastDayPlayed).getTime();
  const now = Date.now();

  if (now - lastPlayed > 24 * 60 * 60 * 1000) {
    const eligibleSkins = Object.values(skins).filter(
      (skin: any) =>
        !skin.event &&
        !skin.og &&
        !skin.ultimate &&
        !skin.special &&
        !skin.wip &&
        !skin.player &&
        !skin.freebie &&
        !skin.eventoffsale &&
        !skin.currency &&
        skin.price > 0
    );

    const guaranteedIds = [273, 234, 189, 257, 416];

    function shuffleArray<T>(array: T[]): T[] {
      let arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    let shuffled: number[] = [];
    do {
      shuffled = shuffleArray(eligibleSkins.map((skin: any) => skin.id)).slice(0, 15);
    } while (guaranteedIds.some((id) => shuffled.includes(id)));

    const newSkinList = [...shuffled, ...guaranteedIds];

    const oldSkinList = account.skinList || [];
    const listsDiffer =
      newSkinList.length !== oldSkinList.length ||
      newSkinList.some((id) => !oldSkinList.includes(id));

    if (listsDiffer) {
      api.post(
        `${api.endpoint}/profile/updateSkins`,
        {
          lastDayPlayed: now,
          skinList: newSkinList,
        },
        (response: any) => {
          if (response.success && response.account) {
            dispatch(setAccount(response.account));
          } else {
            console.error('Failed to update skins on server', response);
          }
        }
      );
    }
  }
}, [account?.lastDayPlayed, dispatch, skins]);



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
    const newClan = prompt('What do you want your clan tag to be? Clans can only be 1-5 characters long, and you can only change your clan once every 7 days.');
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

    dispatch(changeClanAsync('7Z9XQ') as any);
  }
  const openShop = () => {
    setModal(<ShopModal account={account} />);
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
        <LeaderboardButton scale={scale.factor} openLeaderboard={openLeaderboard} />
            <div id="contentt" style={scale.styles}>

          <div id="menuContainer" >

            {/* <!-- GAME NAME --> */}
            <div id="gameName"><img src={titleImg} alt="Swordbattle.io" width={750} height={250} style={{
    position: 'fixed',
    userSelect: 'none',
    pointerEvents: 'none',
    top: '-50%',
    left: '50%',
    transform: 'translate(-50%, -125%)'
  }} />
</div>

            {/* <!-- LOADING TEXT --> */}
            {/* <!-- MENU CARDS --> */}
            <div id="menuCardHolder" style={{ display: 'inline-block', height: 'auto !important', position: 'fixed',
    top: '-50%',
    left: '50%',
    transform: 'translate(-50%, -5%)' }} >
              <div className="menu">
                <div className="accountCard menuCard panel">
                  <AccountCard account={account} onLogin={onLogin} onSignup={onSignup} />
                </div>

                <div className="announcementCard menuCard panel">
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
                      <div style={{ fontSize: '15px' }}>
                        Tip: The Lumberjack ability has multiple uses: finding chests, defending against enemies, and breaking chests faster!
                      </div>
                    )}
                  </div>
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

                    <div id="enterGame" className="menuButton" onClick={()=>accountReady && isConnected && onStart()}>
                    {(accountReady && isConnected)? 'Play!' : 'Connecting...'}
            </div>


                  </div>
                </div>
              </div>
              <div className='fullWidth'>
                <div id="adBelow">
                 <Ad screenW={dimensions.width} screenH={dimensions.height} types={[[728, 90], [970, 90], [970, 250]]} />
                </div>
              </div>
            </div>

</div>
          </div>

          {/* <!-- SETTINGS --> */}
          <div id="settingsButton" className="altLink panel"  onClick={openSettings}>
            {/* <i className="material-icons ui-icon">&#xE8B8;</i> */}
            <FontAwesomeIcon icon={faGear} className='ui-icon'/>
          </div>
          {modal && <Modal child={modal} close={closeModal} scaleDisabled={modal.type.name === 'ShopModal'} />}
          {/* <div id="topRight1" className="inParty">
            <span>top right stuff</span>
          </div> */}

           {/* <div id="topRight2" className="altLink">
            <span>more top right stuff</span>
          </div> */}

<div className="auth-buttons" style={scale.styles}>
             {account.isLoggedIn ? (
               <div className="dropdown">
                {account.clan ? (
                    <div className="auth-username">
                    <FontAwesomeIcon icon={faUser} />{' '}
                    {account.clan?.toUpperCase() !== '7Z9XQ' && (
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
                    <li>
                   <a className="dropdown-item" href="#" onClick={onChangeBio}>
                     <FontAwesomeIcon icon={faICursor} /> Change Bio
                   </a>
                   </li>
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
                   <li><a className="dropdown-item" href="#" onClick={onLogout}>
                     <FontAwesomeIcon icon={faSignOut} /> Logout
                   </a></li>
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
             <div>
               <a href="https://github.com/codergautam/swordbattle.io" target="_blank" rel="nofollow">About</a>
             </div>
             <div>
               <a href="https://discord.com/invite/9A9dNTGWb9" target="_blank" className='discord' rel="nofollow">
                 Discord
               </a>
             </div>

             <div>
               <a href="#"
                onClick={() => {
                  try {
                      (window as any)?.showPlaylight()
                  } catch(e) {
                      console.log('Error showing playlight', e);
                  }
                }}
               rel="nofollow">
                 More Games
               </a>
             </div>
             <div>
               <a href="/changelog.html" target="_blank" rel="nofollow">
                 Changelog
               </a>
             </div>
             <div>
             </div>
              {/* <div>
               <a href="https://swordbattle.io/partners" target="_blank" className='partners' rel="nofollow">
                 Partners
               </a>
             </div> */}
             <div>
               {/* <a href="https://iogames.forum/t/official-swordbattle-changelog/17400/last" target="_blank" className='changelog' style={{color: 'yellow'}} rel="nofollow">
                Changelog
              </a> */}
             </div>
           </footer>
        </div>

        </>
      )}
    </div>
  );
}

export default App;
