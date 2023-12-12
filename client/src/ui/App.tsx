import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOut, faICursor } from '@fortawesome/free-solid-svg-icons';

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
import GemCount from './GemCount';
import ShopButton from './ShopButton';
import ShopModal from './modals/ShopModal';

const preloadImages: string[] = [
  SettingsImg,
  DiscordLogo,
  SignupImg,
  LoginImg,
];

function App() {
  const dispatch = useDispatch();
  const account = useSelector(selectAccount);

  const scale = useScale(false);
  const [name, setName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modal, setModal] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string>('');

  useEffect(() => {
    if(gameStarted) return;
    setTimeout(() => {
    api.get(`${api.endpoint}/auth/account`, (data) => {
      if (data.account) {
        data.account.token = data.token;
        dispatch(setAccount(data.account));
      } else {
        dispatch(clearAccount());
      }
    });
  }, 1000);

    setModal(<ChangelogModal />);
  }, [gameStarted]);

  const preloadImage = (url: string) => {
    return new Promise<void>((resolve) => {
      fetch(url)
        .then((resp) => resp.blob())
        .then((blob) => {
          let img = new Image();
          img.onload = () => resolve();
          img.src = URL.createObjectURL(blob);
        });
    });
  };

  useEffect(() => {
    let loadedImages = 0;
    preloadImages.forEach((url) => {
      preloadImage(url).then(() => {
        loadedImages++;
        setLoadingProgress((loadedImages / preloadImages.length) * 90);
      });
    });
  }, []);

  const onGameReady = () => {
    setLoadingProgress(100);
    console.log('Game ready');
  };
  const onStart = () => {
    setGameStarted(true);
    window.phaser_game?.events.emit('startGame', name);
  };
  const openSettings = () => setModal(<SettingsModal />);
  const closeModal = () => setModal(null);
  const onHome = () => setGameStarted(false);
  const onConnectionClosed = (reason: string) => setConnectionError(reason);

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
    if (modal?.type?.name === 'ShopModal') {
      setModal(<ShopModal account={account} />);
    }
  }, [account]);

  const isLoaded = loadingProgress === 100;
  return (
    <div className="App">
      <LoadingScreen progress={loadingProgress} />
      <GameComponent
        onHome={onHome}
        onGameReady={onGameReady}
        onConnectionClosed={onConnectionClosed}
      />
      {connectionError && (
        <Modal
          child={<ConnectionError reason={connectionError}/>}
          className="connectionErrorModal"
        />
      )}

      {!gameStarted && (
        <div className="main-ui">
          <div className={clsx('startGame', isLoaded && 'animation')} style={scale.styles}>
            <div className='title'>Swordbattle.io</div>
            <input type="text" maxLength={16} placeholder="Enter Name"
              value={account.isLoggedIn ? account.username : name}
              onChange={(e) => setName(e.target.value)}
              disabled={account.isLoggedIn}
            />
            <button className="startButton" onClick={onStart}>Play!</button>
          </div>

          <div
            className="settings-button"
            style={scale.styles}
            role="button"
            onClick={openSettings}
            onKeyDown={event => event.key === 'Enter' && openSettings()}
            tabIndex={0}
          >
            <img src={SettingsImg} alt="Settings" />
          </div>

          {modal && <Modal child={modal} close={closeModal} scaleDisabled={modal.type.name === 'ShopModal'} />}

          {/* 'Shop' button and gem count */}

          {account.isLoggedIn && (
            <>
            <GemCount account={account} scale={scale.factor} />
            </>
          )}

          <ShopButton account={account} scale={scale.factor} openShop={openShop} />

          <div className="auth-buttons" style={scale.styles}>
            {account.isLoggedIn ? (
              <div className="dropdown">
                <div className="auth-username"><FontAwesomeIcon icon={faUser} /> {account.username}</div>
                <ul className="dropdown-menu">
                  <li>
                    <Link to={`/profile?username=${account.username}`} target="_blank" className="dropdown-item">
                      <FontAwesomeIcon icon={faUser} /> Profile
                    </Link>
                  </li>
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

          <footer className={clsx('links', isLoaded && 'animation')} style={scale.styles}>
            <div>
              <a href="https://swordbattle.io/about.html" target="_blank" rel="noreferrer">About</a>
            </div>
            <div>
              <Link to="/leaderboard" target="_blank" rel="noreferrer">Leaderboard</Link>
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
          </footer>
        </div>
      )}
    </div>
  );
}

export default App;
