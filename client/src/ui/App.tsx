import { useEffect, useState } from 'react';
import Modal from './Modal';
import SettingsModal from './SettingsModal';
import GameComponent from './game/GameComponent';

import ChangelogModal from './ChangelogModal';
import LoadingScreen from './LoadingScreen';
import { useScale } from './Scale';

import DiscordLogo from '../assets/img/discordLogo.png';
import SettingsImg from '../assets/img/settings.png';
import './App.scss';

const preloadImages: string[] = [
  SettingsImg,
  DiscordLogo,
];

function App() {
  const scale = useScale(false);
  const [name, setName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    setModal(<ChangelogModal />);
  }, []);

  
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
        setLoadingProgress((loadedImages / preloadImages.length) * 100);
      });
    });
  }, []);

  const onStart = () => setGameStarted(true);
  const openSettings = () => setModal(<SettingsModal />);
  const closeModal = () => setModal(null);
  const onRestart = () => setGameStarted(false);

  return (
    <div className="App">
      <LoadingScreen progress={loadingProgress} />

      {gameStarted && <GameComponent name={name} onRestart={onRestart} />}

      {!gameStarted && (
        <>
          <div className="startGame" style={scale}>
            <div className='title'>Swordbattle.io</div>
            <input type="text" maxLength={16} placeholder="Enter Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="startButton" onClick={onStart}>Play!</button>
          </div>
    
          <div
            className="settings-button"
            style={scale}
            role="button"
            onClick={openSettings}
            onKeyDown={event => event.key === 'Enter' && openSettings()}
            tabIndex={0}
          >
            <img src={SettingsImg} alt="Settings" />
          </div>

          {modal && <Modal child={modal} close={closeModal} />}

          <footer className="links" style={scale}>
            <div>
              <a href="https://swordbattle.io/about.html" target="_blank" rel="noreferrer">About</a>
            </div>
            <div>
              <a href="https://swordbattle.io/leaderboard" target="_blank" rel="noreferrer">Leaderboard</a>
            </div>
            <div>
              <a href="https://forum.codergautam.dev/c/swordbattle/5" target="_blank" rel="noreferrer">Forum</a>
            </div>
            <div>
              <a href="https://discord.com/invite/9A9dNTGWb9" target="_blank" rel="noreferrer">
                <img src={DiscordLogo} alt="Discord" className="discord" />
              </a>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
