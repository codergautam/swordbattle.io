import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOut, faICursor,faGear } from '@fortawesome/free-solid-svg-icons';

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

import { clearAccount, setAccount, logoutAsync, changeNameAsync } from '../redux/account/slice';
import { selectAccount } from '../redux/account/selector';
import api from '../api';

import SettingsImg from '../assets/img/settings.png';
import DiscordLogo from '../assets/img/discordLogo.png';
import SignupImg from '../assets/img/signup.png';
import LoginImg from '../assets/img/login.png';
import './App.scss';
import GemCount from './ValueCnt';
import ShopButton from './ShopButton';
import ShopModal from './modals/ShopModal';
import MigrationModal from './modals/MigrationModal';
import { getCookies, playVideoAd } from '../helpers';
import Ad from './Ad';
import { Settings } from '../game/Settings';
import { getServerList, updatePing } from '../ServerList';
import AccountCard from './AccountCard';
import ForumCard from './ForumCard';
// import Game from '../game/scenes/Game';

let debugMode = false;
try {
  debugMode = window.location.search.includes("debugAlertMode");
  } catch(e) {}

function App() {
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
  // setModal(<ChangelogModal />);
  }, [gameStarted]);

  const [server, setServer] = useState(Settings.server);
  const [servers, setServers] = useState<any[]>([]);

  useEffect(() => {
    console.log('Getting server list');
    getServerList().then(setServers);
  }, []);

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
      playVideoAd().then(() => {
        go();
      }).catch((e) => {
        console.log('Error playing video ad', e);
        go();
      });
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
  const openShop = () => {
    setModal(<ShopModal account={account} />);
  }

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
            <div id="contentt" style={scale.styles}>
          <div id="menuContainer" >

            {/* <!-- GAME NAME --> */}
            <div id="gameName">Swordbattle.io</div>

            {/* <!-- LOADING TEXT --> */}

            {/* <!-- MENU CARDS --> */}
            <div id="menuCardHolder" style={{ display: 'inline-block', height: 'auto !important' }}>
              <div className="menu">
                <div className="accountCard menuCard panel">
                  <AccountCard account={account} onLogin={onLogin} onSignup={onSignup} />
                </div>

                {/* <!-- Play --> */}
                <div className="joinCard menuCard panel" style={{ position: 'relative' }}>
                  <div className="joinCardInput">
                    <input
                      type="text"
                      id="nameInput"
                      placeholder="Enter Name"
                      maxLength={16}
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
                <div className="menuCard panel forumCard">
                  <ForumCard />
                </div>
              </div>
              <div className='fullWidth'>
                <div id="adBelow">
                 {/* <Ad screenW={dimensions.width} screenH={dimensions.height} types={[[728, 90], [970, 90], [970, 250]]} /> */}
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
                 <div className="auth-username"><FontAwesomeIcon icon={faUser} /> {account.username}</div>
                 <ul className="dropdown-menu">
                   <li>
                   <a className="dropdown-item" href="#" onClick={onChangeName}>
                     <FontAwesomeIcon icon={faICursor} /> Change Name
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
               <a href="https://github.com/codergautam/swordbattle.io" target="_blank" rel="noreferrer">About</a>
             </div>
            <div>
               <Link to="https://swordbattle.io/#leaderboard" target="_blank" rel="noreferrer">Leaderboard</Link>
           </div>
            <div>
               <a href="https://iogames.forum/swordbattle" target="_blank" rel="noreferrer" className='forum'>
                 Forum
               </a>
             </div>
             <div>
               <a href="https://discord.com/invite/9A9dNTGWb9" target="_blank" rel="noreferrer" className='discord'>
                 Discord
               </a>
             </div>
              <div>
               <a href="https://swordbattle.io/partners" target="_blank" rel="noreferrer" className='partners'>
                 Partners
               </a>
             </div>
             <div>
               <a href="https://iogames.forum/t/official-swordbattle-changelog/17400/last" target="_blank" rel="noreferrer" className='changelog' style={{color: 'yellow'}}>
                Changelog
              </a>
             </div>
           </footer>
        </div>

        </>
      )}
    </div>
  );
}

export default App;
