import { cloneElement, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOut, faICursor, faGear, faX, faQuestion, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';

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

import { clearAccount, setAccount, setDailyLogin, logoutAsync, changeNameAsync, changeBioAsync, updateAccountAsync } from '../redux/account/slice';
import { selectAccount } from '../redux/account/selector';
import api from '../api';
import { trackPlayClick, setAnalyticsAccount } from '../analytics';

import SettingsImg from '../assets/img/settings.png';
import DiscordLogo from '../assets/img/discordLogo.png';
import GithubLogo from '../assets/img/githubLogo.png';
import SignupImg from '../assets/img/signup.png';
import LoginImg from '../assets/img/login.png';
import ClanImg from '../assets/img/clan.png';
import './App.scss';
import './mobile.scss';
import GemCount from './ValueCnt';
import ShopButton from './ShopButton';
import InventoryButton from './InventoryButton';
import LeaderboardButton from './LeaderboardButton';
import RewardsButton from './RewardsButton';
import ShopModal from './modals/ShopModal';
import InventoryModal from './modals/InventoryModal';
import MigrationModal from './modals/MigrationModal';
import { getCookies, playVideoAd } from '../helpers';
import Ad from './Ad';
import { Settings } from '../game/Settings';
import { getGameRuntime } from '../game/gameRuntime';
import { getServerList, updatePing } from '../ServerList';
import AccountCard from './AccountCard';
import ChangelogCard from './ChangelogCard';
import LeaderboardCard from './LeaderboardCard';
// import Game from '../game/scenes/Game';
import titleImg from '../assets/img/final.png';
import Leaderboard from './game/Leaderboard';
import { crazygamesSDK, applyCrazygamesFirstVisitAutoStart } from '../crazygames/sdk';
import { markOnce, reportOnce } from '../bootTiming';
import { ldGate, ldGateSummary, ldReportOnce, ldMark, ldTrace, ldReactProgress } from '../loaderDebug';
import { initializeDataStorage } from '../crazygames/dataStorage';

import * as cosmetics from '../game/cosmetics.json'
import RewardsModal from './modals/RewardsModal';
import SkinPreviewModal from './modals/SkinPreviewModal';
import FullChangelogModal from './modals/FullChangelogModal';
import ClansModal from './modals/ClansModal';
import TutorialModal from './game/TutorialModal';
import HubModal, { HubTab } from './hub/HubModal';
import SupportButton from './support/SupportButton';
import SupportModal from './support/SupportModal';
import AnnouncementsButton from './announcements/AnnouncementsButton';
import AnnouncementsModal from './announcements/AnnouncementsModal';
import { designerUsername, getMockProfileData, getMockProfileGames } from './profileDesigner/mockProfile';
import { ProfileTheme, resolveProfileTheme } from './profileTheme';
import PromptDialog, { promptDialog, showDialog } from './PromptDialog';
import { setHudThemeById } from '../hudTheme';

const ProfileDesignerPanel = lazy(() => import('./profileDesigner/ProfileDesignerPanel'));

// Pulls in chart.js (189KB of the main bundle) for a modal nobody has open at
// boot. Lazy so it costs nothing until someone actually views a profile.
// displayName matters: the modal render keys off type.displayName || type.name,
// and a lazy() wrapper has neither by default.
const ProfileModal = lazy(() => import('./modals/ProfileModal'));
(ProfileModal as any).displayName = 'ProfileModal';

function decodeCrazygamesUserId(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(base64)).userId || null;
  } catch (error) {
    console.warn('[CrazyGames] Could not inspect token payload; server verification will remain authoritative', error);
    return null;
  }
}

let debugMode = false;
try {
  debugMode = window.location.search.includes("debugAlertMode");
  } catch(e) {}

const isBasicLaunch = typeof window !== 'undefined' && !!(window as any)._isCrazyGamesBasicLaunch;
const needsMenuAdUnmount = typeof window !== 'undefined' && (window as any).adProvider === 'adinplay';

const modalClasses = new Map<any, string>([
  [ShopModal, 'modal-fullscreen'],
  [RewardsModal, 'modal-fullscreen'],
  [InventoryModal, 'modal-fullscreen'],
  [ProfileModal, 'modal-fullscreen'],
  [FullChangelogModal, 'modal-fullscreen'],
  [SettingsModal, 'modal-settings'],
  [LoginModal, 'modal-auth'],
  [SignupModal, 'modal-auth'],
  [HubModal, 'modal-hub'],
  [ClansModal, 'modal-clans'],
  [SupportModal, 'modal-support'],
  [AnnouncementsModal, 'modal-announcements'],
]);
const instantSwapModals = new Set<any>([ShopModal, RewardsModal, InventoryModal, ProfileModal, FullChangelogModal]);
const modalCloseMs = 200;

function App({ profileDesigner = false, hudDesigner = false }: { profileDesigner?: boolean; hudDesigner?: boolean }) {
  (window as any).hudDesignerMode = hudDesigner;
  let { skins } = cosmetics;
  const resetHour = 23; // 0-23 utc

  const dispatch = useDispatch();
  const account = useSelector(selectAccount);

  const scale = useScale(false);
  const [name, setName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const gameStartedRef = useRef(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modal, setModal] = useState<any>(null);
  const [shownModal, setShownModal] = useState<any>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const modalCloseTimer = useRef<any>(null);
  const [profileUser, setProfileUser] = useState<string | null>(profileDesigner ? designerUsername : null);
  const [profileClosing, setProfileClosing] = useState(false);
  const profileTimer = useRef<any>(null);
  const [designerTheme, setDesignerTheme] = useState<ProfileTheme>(() => resolveProfileTheme(1));
  const [designerThemeName, setDesignerThemeName] = useState('My Theme');
  const [previewSkin, setPreviewSkin] = useState<{ id: number; viewOnly: boolean } | null>(null);
  const [previewClosing, setPreviewClosing] = useState(false);
  const previewTimer = useRef<any>(null);
  const [connectionError, setConnectionError] = useState<string>('');
  const [firstGame, setFirstGame] = useState(true);
  const [pendingRespawn, setPendingRespawn] = useState<{coins: number, expiresAt: number} | null>(null);
  const [respawnCountdown, setRespawnCountdown] = useState(0);
  const [xpBonusCountdown, setXpBonusCountdown] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [game, setGame] = useState<Phaser.Game | undefined>(getGameRuntime());
  const [crazygamesAuthReady, setCrazygamesAuthReadyRaw] = useState(false);
  // 10 call sites flip this flag; wrap once so the winner names itself.
  const setCrazygamesAuthReady = useCallback((v: boolean) => {
    if (v) ldTrace('setCrazygamesAuthReady(true)');
    setCrazygamesAuthReadyRaw(v);
  }, []);
  const [showMenuTutorial, setShowMenuTutorial] = useState(false);
  const [isFirstVisit] = useState(() => !localStorage.getItem('swordbattle:hasVisited'));
  const [instantStart, setInstantStart] = useState<boolean>(hudDesigner || (window as any).instantStart || false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [isMobileDevice] = useState(() =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh|Mac OS/i.test(navigator.userAgent)));

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    document.body.classList.toggle('profile-designer-mode', profileDesigner);
    document.body.classList.toggle('hud-designer-mode', hudDesigner);
    return () => {
      document.body.classList.remove('profile-designer-mode');
      document.body.classList.remove('hud-designer-mode');
    };
  }, [profileDesigner, hudDesigner]);

  useEffect(() => {
    if (hudDesigner) return;
    setHudThemeById(account?.hudThemes?.equipped || 1);
  }, [hudDesigner, account?.hudThemes?.equipped]);

  // Detect if we're in a small desktop viewport (non-fullscreen windows, iframes, CrazyGames)
  const isSmallDesktopIframe = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) return false;

    // Catch any small desktop viewport (non-fullscreen browser windows, iframes, etc.)
    if (isLandscape && (width < 1300 || height <= 750)) return true;

    const isCrazygamesEmbed = crazygamesSDK.shouldUseSDK() ||
      (typeof window !== 'undefined' && window.location.hostname.includes('crazygames'));
    if (isCrazygamesEmbed && isLandscape && (width <= 1300 || height <= 750)) return true;

    return false;
  };

  const [isSmallIframe, setIsSmallIframe] = useState(isSmallDesktopIframe());

  const menuScale = isSmallIframe
    ? Math.max(0.45, Math.min(0.85, Math.min(dimensions.width / 1400, dimensions.height / 750)))
    : 1;

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
    "Tip: The Fighter ability affects stats very slightly, but can be activated very often.",
    "Tip: The Stalker's ability makes it invisible and very fast, which is helpful for both ambushes and escapes!",
    "Tip: The Archer makes swordthrows better and, while mediocre by itself, evolves to the Sniper and Super Archer at 50k coins!",
    "Tip: The Sniper can maintain distance from enemies due to its fast throwing and increased sight range!",
    "Tip: Throwing your sword temporarily prevents melee attacks, making you vulnerable to enemies up close",
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
    "Tip: Press C, E, Shift, or Right Click on computer to throw your sword",
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

  const gameButtonsScale = isSmallIframe
    ? Math.min(scale.factor, dimensions.height / 650)
    : scale.factor;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const bottomLeftContainerStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    bottom: 0,
    transform: `scale(${isSmallIframe ? gameButtonsScale : scale.factor})`,
    transformOrigin: 'bottom left',
    pointerEvents: 'none',
  };

  useEffect(() => {
    const updateSize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      setIsSmallIframe(isSmallDesktopIframe());
    };

    // Re-check after initial paint (iframes may not have final size at mount time)
    requestAnimationFrame(updateSize);
    // Also re-check when the page fully loads (iframe parent may resize after load)
    window.addEventListener('load', updateSize);

    // debounce resize
    let timeout: any;
    const onResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(updateSize, 100);
    };
    window.addEventListener('resize', onResize);

    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', updateSize);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileDevice) return;

    const applyOrientation = () => {
      const portrait = window.matchMedia('(orientation: portrait)').matches
        || window.innerHeight >= window.innerWidth;
      document.body.classList.add('sb-mobile');
      document.body.classList.toggle('sb-portrait', portrait);
      document.body.classList.toggle('sb-landscape', !portrait);
    };
    applyOrientation();
    window.addEventListener('resize', applyOrientation);
    window.addEventListener('orientationchange', applyOrientation);

    const onFirstInput = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
      cleanupInput();
    };
    const cleanupInput = () => {
      window.removeEventListener('touchend', onFirstInput);
      window.removeEventListener('pointerup', onFirstInput);
      window.removeEventListener('click', onFirstInput);
    };
    window.addEventListener('touchend', onFirstInput, { passive: true });
    window.addEventListener('pointerup', onFirstInput, { passive: true });
    window.addEventListener('click', onFirstInput, { passive: true });

    return () => {
      window.removeEventListener('resize', applyOrientation);
      window.removeEventListener('orientationchange', applyOrientation);
      cleanupInput();
      document.body.classList.remove('sb-mobile', 'sb-portrait', 'sb-landscape');
    };
  }, [isMobileDevice]);

  useEffect(() => {
    if (gameStarted) return;
    let count = 0;
    let timer: any;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '\\') {
        count++;
        clearTimeout(timer);
        timer = setTimeout(() => { count = 0; }, 2000);
        if (count >= 5) {
          count = 0;
          const next = !Settings.unloadSkins;
          Settings.unloadSkins = next;
          void showDialog(next ? 'Skin unloading enabled.' : 'Skin unloading disabled.', 'Settings');
        }
      } else {
        count = 0;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [gameStarted]);

  useEffect(() => {
    let cgChatDisabled = false;
    if (crazygamesSDK.isInitialized()) {
      try { cgChatDisabled = (window as any).CrazyGames?.SDK?.game?.settings?.disableChat === true; } catch (e) {}
    }
    if (account?.isLoggedIn && !localStorage.getItem('swordbattle:chatAutoEnabled') && !cgChatDisabled && !crazygamesSDK.isInitialized()) {
      Settings.enableChat = true;
      localStorage.setItem('swordbattle:chatAutoEnabled', '1');
    }
  }, [account?.isLoggedIn]);

  useEffect(() => {
    if(gameStarted && firstGame) setFirstGame(false);
    if(gameStarted) return;
    setTimeout(() => {
      // Only handle initial login for non-CrazyGames environments
      // CrazyGames auth is handled separately in the other useEffect

      const isPotentiallyCrazygames = typeof window !== 'undefined' && (
        window.location.hostname.includes('crazygames') ||
        new URLSearchParams(window.location.search).has('crazygames')
      );

      const shouldUse = crazygamesSDK.shouldUseSDK();
      const isUserAvailable = crazygamesSDK.isUserAccountAvailable();
      const isCrazygames = shouldUse && isUserAvailable;

      console.log('[Auth Initial] isPotentiallyCrazygames:', isPotentiallyCrazygames);
      console.log('[Auth Initial] shouldUseSDK:', shouldUse, 'isUserAccountAvailable:', isUserAvailable, 'isCrazygames:', isCrazygames);
      console.log('[Auth Initial] SDK initialized:', crazygamesSDK.isInitialized());

      if (isPotentiallyCrazygames || isCrazygames) {
        console.log('[Auth] Skipping initial login for CrazyGames environment (will be handled by CrazyGames login flow)');
        setAccountReady(true);
        return;
      }

      console.log('[Auth Initial] Not CrazyGames environment, checking localStorage secret...');

      try {
        const params = new URLSearchParams(window.location.search);
        const urlSecret = params.get('secret');
        if (urlSecret && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlSecret)) {
          window.localStorage.setItem('secret', urlSecret);
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch(e) {
        console.log('Error handling URL secret', e);
      }

      let secret: string | null = null;
      try {
       secret = window.localStorage.getItem('secret');
      } catch(e) {
        console.log('Error getting secret', e);
      }
      console.log('[Auth Initial] localStorage secret:', secret ? 'exists (length: ' + secret.length + ')' : 'null/empty');

    if(!secret || secret === 'undefined' || secret === 'null') {
      console.log('[Auth Initial] No valid secret found, setting guest account');
      if(secret === 'undefined' || secret === 'null') {
        try {
          window.localStorage.removeItem('secret');
        } catch(e) {
          console.log('Error removing bad secret', e);
        }
      }
      dispatch(clearAccount());
      setAccountReady(true);
    } else {
      console.log('[Auth Initial] Valid secret found, attempting loginWithSecret...');
      api.post(`${api.endpoint}/auth/loginWithSecret`, null, (data) => {
        console.log('[Auth Initial] loginWithSecret response:', data);
        setAccountReady(true);
        if (data.account) {
          data.account.secret = data.secret;
          dispatch(setAccount(data.account));
          const dl = data.account.dailyLogin;
          if (firstGame && dl && dl.claimedTo < dl.claimableTo) {
            setModal(<HubModal account={{ ...data.account, isLoggedIn: true }} initialTab="rewards" onViewProfile={(u: string) => openProfileOverlay(u)} onPreviewSkin={(id: number) => openSkinPreview(id)} />);
          }
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
      const pct = Math.floor(e.detail * 98);
      // Fires once per asset. Counts how many of those actually change the
      // rendered number - the rest are wasted App re-renders.
      ldReactProgress(pct);
      // Game.ts re-dispatches detail:1 when the scene goes ready, which lands
      // AFTER the gate has already set 100. Never walk the bar backwards or the
      // loading screen reappears over a running game.
      setLoadingProgress((p) => Math.max(p, pct));
      if(e.detail === 1) { ldTrace('assetsLoaded=true'); setAssetsLoaded(true); }
    });
  }, []);

  useEffect(() => {
    if (!account?.isLoggedIn) return;
    api.post(`${api.endpoint}/auth/set-more-ads`, { enabled: !isBasicLaunch && !!Settings.moreAds });
  }, [account?.isLoggedIn, account?.username]);


  useEffect(() => {
    gameStartedRef.current = gameStarted;
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
    setConnectionError('');
    setIsConnected(true);
  };

  useEffect(() => {
    const isCrazygames = crazygamesSDK.shouldUseSDK();

    console.log('Checking if everything is ready. Connected:', isConnected, 'Assets:', assetsLoaded, 'CrazyGames Auth Ready:', crazygamesAuthReady || !isCrazygames);
    if(debugMode) {
      alert('check. Connected: ' + isConnected + ' Assets: ' + assetsLoaded + ' CG Auth: ' + (crazygamesAuthReady || !isCrazygames));
    }

    if (assetsLoaded) markOnce('gate:assetsLoaded');
    if (isConnected) markOnce('gate:isConnected');
    if (crazygamesAuthReady || !isCrazygames) markOnce('gate:crazygamesAuthReady');

    // The play button is an AND of three independent legs - log each one as it
    // lands so the last one to arrive is obvious.
    if (assetsLoaded) ldGate('assetsLoaded');
    if (isConnected) ldGate('isConnected');
    if (crazygamesAuthReady || !isCrazygames) ldGate('crazygamesAuthReady');

    if(assetsLoaded && isConnected && (crazygamesAuthReady || !isCrazygames)) {
      markOnce('READY (loadingProgress=100)');
      // Safety net: Game.create() normally closes this, but a scene that never
      // boots would leave CrazyGames' loading timer running forever.
      crazygamesSDK.loadingStop();
      ldGateSummary();
      setLoadingProgress(100);
      reportOnce();
      ldReportOnce();
    }
  }, [isConnected, assetsLoaded, crazygamesAuthReady]);

  useEffect(() => {
    console.log('Getting server list');
    getServerList().then(setServers);

    // Helper function to handle the loginWithSecret callback and return a promise
    const verifyStoredAccount = (existingSecret: string, currentUserId: string): Promise<'match' | 'mismatch' | 'invalid'> => {
      return new Promise((resolve) => {
        console.log('[CrazyGames] verifyStoredAccount called for currentUserId:', currentUserId);
        console.log('[CrazyGames] Sending loginWithSecret request to verify account...');

        api.post(`${api.endpoint}/auth/loginWithSecret`,
          { secret: existingSecret },
          (secretLoginData: any) => {
            console.log('[CrazyGames] verifyStoredAccount callback received:', secretLoginData);

            if (secretLoginData.error || !secretLoginData.account) {
              console.error('[CrazyGames] Error retrieving stored account via secret:', secretLoginData.error);
              resolve('invalid');
              return;
            }

            const storedAccount = secretLoginData.account;
            const storedCrazygamesUserId = storedAccount.crazygamesUserId;

            console.log('[CrazyGames] Stored account crazygamesUserId:', storedCrazygamesUserId);
            console.log('[CrazyGames] Current crazygamesUserId:', currentUserId);

            // Check if stored account belongs to same CrazyGames user
            if (storedCrazygamesUserId === currentUserId || (!currentUserId && storedAccount.isCrazygames)) {
              console.log('[CrazyGames] CrazyGames user matches stored account - keeping login');
              // Update account in Redux to ensure it's current
              storedAccount.secret = existingSecret;
              dispatch(setAccount(storedAccount));
              resolve('match');
            } else {
              console.log('[CrazyGames] CrazyGames user mismatch! Stored:', storedCrazygamesUserId, 'Current:', currentUserId);
              resolve('mismatch');
            }
          }
        );
      });
    };

    // Automatic CrazyGames login with user verification
    const attemptCrazygamesLogin = async () => {
      try {
        console.log('[CrazyGames] attemptCrazygamesLogin called');
        console.log('[CrazyGames] shouldUseSDK:', crazygamesSDK.shouldUseSDK());
        console.log('[CrazyGames] isUserAccountAvailable:', crazygamesSDK.isUserAccountAvailable());

        // Only attempt login if on CrazyGames and user accounts are available
        if (!crazygamesSDK.shouldUseSDK() || !crazygamesSDK.isUserAccountAvailable()) {
          console.log('[CrazyGames] SDK not available or user accounts not supported - returning');
          setCrazygamesAuthReady(true);
          return;
        }

        console.log('[CrazyGames] Starting authentication flow...');

        // Get current CrazyGames user
        console.log('[CrazyGames] Calling crazygamesSDK.getUser()...');
        const currentUser = await crazygamesSDK.getUser();
        console.log('[CrazyGames] Current CrazyGames user (raw):', currentUser);
        console.log('[CrazyGames] Current CrazyGames user (JSON):', JSON.stringify(currentUser));
        console.log('[CrazyGames] Current CrazyGames user keys:', currentUser ? Object.keys(currentUser) : 'null');

        let currentUserId: string | undefined = undefined;

        if (currentUser) {
          try {
            console.log('[CrazyGames] User object exists, requesting token to get userId...');
            const token = await crazygamesSDK.getUserToken();

            if (token) {
              const tokenParts = token.split('.');
              if (tokenParts.length === 3) {
                currentUserId = decodeCrazygamesUserId(token) || undefined;
                if (!currentUserId) currentUserId = 'serverVerified';
                console.log('[CrazyGames] Decoded userId from token:', currentUserId);
              } else {
                console.error('[CrazyGames] Invalid token format - expected 3 parts, got', tokenParts.length);
              }
            } else {
              console.error('[CrazyGames] Failed to get user token');
            }
          } catch (error) {
            console.error('[CrazyGames] Error getting userId from token:', error);
          }
        }

        console.log('[CrazyGames] Final user ID:', currentUserId);

        // Get the stored secret
        const existingSecret = window.localStorage.getItem('secret');
        const hasValidSecret = existingSecret && existingSecret !== 'undefined' && existingSecret !== 'null';

        // Case 1: No CrazyGames user logged in
        if (!currentUserId) {
          console.log('[CrazyGames] No CrazyGames user logged in');

          // First-visit auto-start is meant to be frictionless, so only invite /
          // instant-multiplayer sessions are worth interrupting for a login.
          if ((window as any).instantStart && !(window as any)._cgFirstVisitAutoStart) {
            console.log('[CrazyGames] Instant multiplayer mode - prompting user to log in');
            try {
              const promptedUser = await crazygamesSDK.showAuthPrompt();
              if (promptedUser) {
                console.log('[CrazyGames] User authenticated via prompt:', promptedUser.username);
                await loginWithCurrentCrazygamesUser(promptedUser);
                setCrazygamesAuthReady(true);
                return;
              }
              console.log('[CrazyGames] User cancelled auth prompt - proceeding as guest');
            } catch (e) {
              console.error('[CrazyGames] Error showing auth prompt:', e);
            }
          }

          if (hasValidSecret) {
            console.log('[CrazyGames] SDK user unavailable; preserving and restoring stored session');
            await verifyStoredAccount(existingSecret, '');
          }

          setCrazygamesAuthReady(true);
          return;
        }

        // Case 2: User is logged in on CrazyGames
        console.log('[CrazyGames] User is logged in on CrazyGames - verifying stored account');

        // If we have a secret, verify it matches the current user
        if (hasValidSecret) {
          console.log('[CrazyGames] Have stored secret - verifying against current CrazyGames user');

          // Verify the stored account
          const verifyResult = await verifyStoredAccount(existingSecret, currentUserId);

          if (verifyResult === 'match') {
            // Account matches, we're done
            setCrazygamesAuthReady(true);
            return;
          }

          if (verifyResult === 'mismatch') {
            console.log('[CrazyGames] Switching to current CrazyGames user account');
          }

          // Login with the current user
          await loginWithCurrentCrazygamesUser(currentUser);
          setCrazygamesAuthReady(true);
        } else {
          // No stored secret but user is logged in on CrazyGames - login with current user
          console.log('[CrazyGames] No stored secret but user is logged in - logging in with current user');
          await loginWithCurrentCrazygamesUser(currentUser);
          setCrazygamesAuthReady(true);
        }
      } catch (error) {
        console.error('[CrazyGames] Auto-login error:', error);
        setCrazygamesAuthReady(true);
      }
    };

    // Helper function to login with current CrazyGames user
    const loginWithCurrentCrazygamesUser = async (currentUser: any) => {
      try {
        console.log('[CrazyGames] loginWithCurrentCrazygamesUser called for user:', currentUser?.username);

        console.log('[CrazyGames] Requesting user token from SDK...');
        const token = await crazygamesSDK.getUserToken();
        console.log('[CrazyGames] Token received:', token ? 'Yes (length: ' + token.length + ')' : 'null/undefined');

        if (!token) {
          console.error('[CrazyGames] Failed to get user token - token is null/undefined');
          return;
        }

        console.log('[CrazyGames] Sending login request to', `${api.endpoint}/auth/crazygames/login`);

        // Return a promise that resolves when the login is complete
        return new Promise<void>((resolve) => {
          api.post(`${api.endpoint}/auth/crazygames/login`, {
            token,
          }, (data: any) => {
            console.log('[CrazyGames] Login API callback received with data:', data);

            if (data.error) {
              console.error('[CrazyGames] Login failed with error:', data.error);
              resolve();
              return;
            }

            if (data.message) {
              console.error('[CrazyGames] Login failed with message:', data.message);
              resolve();
              return;
            }

            if (data.account && data.secret) {
              console.log('[CrazyGames] Login successful for user:', data.account.username);
              data.account.secret = data.secret;
              dispatch(setAccount(data.account));

              initializeDataStorage().then(() => {
                console.log('[CrazyGames] Data storage initialized after login');
                resolve();
              }).catch(error => {
                console.error('[CrazyGames] Error initializing data storage:', error);
                resolve();
              });
            } else {
              console.error('[CrazyGames] Missing account or secret in response');
              console.log('[CrazyGames] Response had account?', !!data.account, 'secret?', !!data.secret);
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('[CrazyGames] Error logging in with current user:', error);
      }
    };

    // Wait for CrazyGames SDK to be initialized before attempting login
    console.log('[CrazyGames] Initial setup - shouldUseSDK:', crazygamesSDK.shouldUseSDK());

    if (crazygamesSDK.shouldUseSDK()) {
      const checkSDKReady = async () => {
        let attempts = 0;
        const maxAttempts = 100;
        while (!crazygamesSDK.isInitialized() && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!crazygamesSDK.isInitialized()) {
          console.warn('[CrazyGames] SDK initialization timeout');
          setCrazygamesAuthReady(true);
          return;
        }

        console.log('[CrazyGames] SDK initialized after', attempts * 100, 'ms');

        try {
          const sdkGame = (window as any).CrazyGames.SDK.game;
          if (sdkGame.isInstantMultiplayer === true) {
            console.log('[CrazyGames] isInstantMultiplayer is TRUE');
            (window as any).instantStart = true;
            (window as any)._cgFirstVisitAutoStart = false;
            setInstantStart(true);
          }
          const roomId = sdkGame.getInviteParam?.('roomId');
          if (roomId) {
            console.log('[CrazyGames] Invite room:', roomId);
            (window as any).inviteRoomId = roomId;
            const region = sdkGame.getInviteParam?.('region');
            if (region) (window as any).inviteRegion = region;
            (window as any).instantStart = true;
            (window as any)._cgFirstVisitAutoStart = false;
            setInstantStart(true);
          }
          if (applyCrazygamesFirstVisitAutoStart()) setInstantStart(true);
        } catch (error) {
          console.error('[CrazyGames] Error checking multiplayer:', error);
        }

        await attemptCrazygamesLogin();
      };

      checkSDKReady().catch(err => {
        console.error('[CrazyGames] checkSDKReady error:', err);
        setCrazygamesAuthReady(true);
      });
    } else {
      const onSdkReady = async () => {
        if (!crazygamesSDK.shouldUseSDK()) return;
        console.log('[CrazyGames] SDK ready via event - running CG setup');

        try {
          const sdkGame = (window as any).CrazyGames.SDK.game;
          if (sdkGame.isInstantMultiplayer === true) {
            console.log('[CrazyGames] isInstantMultiplayer is TRUE (late detection)');
            (window as any).instantStart = true;
            (window as any)._cgFirstVisitAutoStart = false;
            setInstantStart(true);
          }
          const roomId = sdkGame.getInviteParam?.('roomId');
          if (roomId) {
            (window as any).inviteRoomId = roomId;
            const region = sdkGame.getInviteParam?.('region');
            if (region) (window as any).inviteRegion = region;
            (window as any).instantStart = true;
            (window as any)._cgFirstVisitAutoStart = false;
            setInstantStart(true);
          }
          if (applyCrazygamesFirstVisitAutoStart()) setInstantStart(true);
        } catch (e) {
          console.error('[CrazyGames] Error checking multiplayer (late):', e);
        }

        await attemptCrazygamesLogin();
      };
      window.addEventListener('crazygamesSDKReady', onSdkReady, { once: true });

      // No delay: a late SDK is already covered by the crazygamesSDKReady
      // listener above, and with no SDK this returns immediately. The old 500ms
      // sleep just held the crazygamesAuthReady gate shut for half a second.
      console.log('[CrazyGames] Calling attemptCrazygamesLogin');
      attemptCrazygamesLogin();
    }

    // Monitor CrazyGames user account changes (login/logout)
    if (crazygamesSDK.shouldUseSDK() && crazygamesSDK.isUserAccountAvailable()) {
      let previousUserId: string | null = null;
      let isInitialized = false;
      let isProcessingChange = false;

      const checkUserAccountChange = async () => {
        if (gameStartedRef.current || document.hidden || isProcessingChange) return;
        isProcessingChange = true;
        try {
          const user = await crazygamesSDK.getUser().catch(() => null);
          if (!user || gameStartedRef.current || document.hidden) return;
          const token = await crazygamesSDK.getUserToken().catch(() => null);
          if (gameStartedRef.current || document.hidden) return;
          const currentUserId = token ? decodeCrazygamesUserId(token) : null;
          if (!currentUserId) return;

          // First time - just initialize
          if (!isInitialized) {
            previousUserId = currentUserId;
            isInitialized = true;
            console.log('[CrazyGames Monitor] Initialized with userId:', currentUserId);
            return;
          }

          if (!previousUserId && currentUserId) {
            if (gameStartedRef.current) return;
            await loginWithCurrentCrazygamesUser(user);
            previousUserId = currentUserId;
          }
          // User changed account (different userId)
          else if (previousUserId && currentUserId && previousUserId !== currentUserId) {
            console.log('[CrazyGames Monitor] User account changed - reloading page to switch accounts');

            if (gameStartedRef.current) return;
            await loginWithCurrentCrazygamesUser(user);
            previousUserId = currentUserId;
          }

          previousUserId = currentUserId;
        } catch (error) {
          console.error('[CrazyGames Monitor] Error checking user account change:', error);
        } finally {
          isProcessingChange = false;
        }
      };

      const checkOnFocus = () => { void checkUserAccountChange(); };
      const checkOnVisibility = () => {
        if (!document.hidden) void checkUserAccountChange();
      };
      const intervalId = setInterval(checkUserAccountChange, 60000);

      // Initial check after a short delay to let SDK fully initialize
      const initialCheckId = setTimeout(checkUserAccountChange, 100);
      window.addEventListener('focus', checkOnFocus);
      document.addEventListener('visibilitychange', checkOnVisibility);

      return () => {
        clearInterval(intervalId);
        clearTimeout(initialCheckId);
        window.removeEventListener('focus', checkOnFocus);
        document.removeEventListener('visibilitychange', checkOnVisibility);
      };
    }
  }, [dispatch]);


  useEffect(() => {
    console.log('[DEBUG] Account state changed:', {
      hasAccount: !!account,
      username: account?.username,
      hasSecret: !!account?.secret,
      secretValue: account?.secret,
      isCrazygames: account?.isCrazygames,
      crazygamesUserId: account?.crazygamesUserId,
      isLoggedIn: account?.isLoggedIn
    });
  }, [account]);

  useEffect(() => {
    if (!pendingRespawn) {
      setRespawnCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((pendingRespawn.expiresAt - Date.now()) / 1000));
      setRespawnCountdown(remaining);
      if (remaining <= 0) {
        setPendingRespawn(null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pendingRespawn?.expiresAt]);

  useEffect(() => {
    const xpBonus = account?.dailyLogin?.xpBonus;
    if (!xpBonus || xpBonus <= Date.now()) {
      setXpBonusCountdown('');
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((xpBonus - Date.now()) / 1000));
      if (remaining <= 0) {
        setXpBonusCountdown('');
        return;
      }
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      setXpBonusCountdown(`${min}m ${sec}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [account?.dailyLogin?.xpBonus]);

  useEffect(() => {
    setAnalyticsAccount(account?.isLoggedIn ? (account?.id ?? null) : null, account?.username ?? null, !!account?.isLoggedIn);
  }, [account?.isLoggedIn, account?.id, account?.username]);

  const onStart = () => {
    console.log('Starting game');
    localStorage.setItem('swordbattle:hasVisited', '1');
    if(!isConnected) {
      void showDialog('Still connecting to a server.', 'Connection');
      return;
    }
    else  {
      trackPlayClick();
      const go = () => {
        setPendingRespawn(null);
        setGameStarted(true);
        game?.events.emit('startGame', name);
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
  const openSupport = () => setModal(<SupportModal account={account} />);
  const openAnnouncements = (id?: number) => setModal(<AnnouncementsModal initialId={typeof id === 'number' ? id : null} />);

  const announcementLinkHandled = useRef(false);
  useEffect(() => {
    if (loadingProgress !== 100 || announcementLinkHandled.current) return;
    announcementLinkHandled.current = true;
    let linkedId: number | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('announcement');
      if (v && /^\d+$/.test(v)) linkedId = parseInt(v, 10);
      if (params.has('announcement')) {
        params.delete('announcement');
        const qs = params.toString();
        window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
      }
    } catch {}
    if (linkedId !== null && !gameStarted && !instantStart) openAnnouncements(linkedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProgress]);
  const closeModal = () => setModal(null);

  useEffect(() => {
    if (modal === shownModal) return;
    if (shownModal) {
      if (modal && shownModal.type === modal.type) {
        clearTimeout(modalCloseTimer.current);
        setShownModal(modal);
        setModalClosing(false);
        return;
      }
      if (instantSwapModals.has(shownModal.type)) {
        setShownModal(modal);
        setModalClosing(false);
        return;
      }
      setModalClosing(true);
      clearTimeout(modalCloseTimer.current);
      modalCloseTimer.current = setTimeout(() => {
        setShownModal(modal);
        setModalClosing(false);
      }, modalCloseMs);
    } else {
      setShownModal(modal);
      setModalClosing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);
  const onHome = () => {
    setGameStarted(false);
    if (account?.isLoggedIn) dispatch(updateAccountAsync() as any);
  };
  const onConnectionClosed = (reason: string) => {
    console.log('Connection closed', reason);
    setIsConnected(false);
    setConnectionError(reason);
  }

  const onSucessAuth = () => setModal(null);
  const onLogin = () => setModal(<LoginModal onSuccess={onSucessAuth} onSupport={openSupport} />);
  const onSignup = () => setModal(<SignupModal onSuccess={onSucessAuth} />);
  const onLogout = () => dispatch(logoutAsync() as any);
  const onChangeName = async () => {
    const newName = await promptDialog({
      title: 'Change Name',
      message: 'You can change your name once every 7 days.',
      placeholder: 'New name',
      maxLength: 20,
      confirmLabel: 'Save',
      validateOnChange: true,
      validate: (value) => new Promise((resolve) => {
        if (!value) { resolve('Enter a name.'); return; }
        api.get(`${api.endpoint}/auth/username-available?username=${encodeURIComponent(value)}`, (data: any) => {
          resolve(data?.available ? null : (data?.reason || 'Username is taken'));
        });
      }),
    });
    if (!newName) return;

    dispatch(changeNameAsync(newName) as any);
  }
  const onChangeBio = async () => {
    const newBio = await promptDialog({
      title: 'Change Bio',
      message: 'Your bio can be up to 100 characters.',
      placeholder: 'Bio',
      initialValue: account.bio || '',
      maxLength: 100,
      multiline: true,
      confirmLabel: 'Save',
      validate: (value) => value ? null : 'Enter a bio.',
    });
    if (!newBio) return;

    dispatch(changeBioAsync(newBio) as any);
  }
  const openProfileOverlay = (u: string) => {
    if (!u) return;
    clearTimeout(profileTimer.current);
    setProfileUser(u);
    setProfileClosing(false);
  };
  const closeProfileOverlay = () => {
    clearTimeout(profileTimer.current);
    setProfileClosing(true);
    profileTimer.current = setTimeout(() => { setProfileUser(null); setProfileClosing(false); }, 220);
  };

  const openSkinPreview = (id: number, viewOnly = false) => {
    clearTimeout(previewTimer.current);
    setPreviewSkin({ id, viewOnly });
    setPreviewClosing(false);
  };
  const closeSkinPreview = () => {
    clearTimeout(previewTimer.current);
    setPreviewClosing(true);
    previewTimer.current = setTimeout(() => { setPreviewSkin(null); setPreviewClosing(false); }, 220);
  };

  const openHub = (tab: HubTab) => {
    setModal(
      <HubModal
        account={account}
        initialTab={tab}
        onViewProfile={(u: string) => openProfileOverlay(u)}
        onPreviewSkin={openSkinPreview}
      />
    );
  };

  const openShop = () => openHub('shop');

  const openInventory = () => openHub('inventory');

  const openLeaderboard = () => openHub('rankings');

  const openRewards = () => {
    if (account?.isLoggedIn) {
      api.post(`${api.endpoint}/auth/check-in?now=${Date.now()}`, {}, (data: any) => {
        if (data.dailyLogin) {
          dispatch(setDailyLogin(data.dailyLogin));
        }
      });
    }
    openHub('rewards');
  };

  const openProfile = () => {
    if (account.isLoggedIn) openProfileOverlay(account.username);
  };

  const openClans = () => {
    setModal(<ClansModal account={account} onViewProfile={openProfileOverlay} />);
  };

  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);
  const authDropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openAuthDropdown = useCallback(() => {
    if (authDropdownTimeoutRef.current) {
      clearTimeout(authDropdownTimeoutRef.current);
      authDropdownTimeoutRef.current = null;
    }
    setAuthDropdownOpen(true);
  }, []);
  const closeAuthDropdown = useCallback(() => {
    if (authDropdownTimeoutRef.current) clearTimeout(authDropdownTimeoutRef.current);
    authDropdownTimeoutRef.current = setTimeout(() => setAuthDropdownOpen(false), 250);
  }, []);
  useEffect(() => () => {
    if (authDropdownTimeoutRef.current) clearTimeout(authDropdownTimeoutRef.current);
  }, []);

  const openTutorial = () => {
    setShowMenuTutorial(true);
  };

  useEffect(() => {
    if (modal && modal.type === HubModal) {
      setModal(cloneElement(modal, { account }));
    }
    if(account.is_v1) {
      setModal(<MigrationModal account={account} />);
    }
  }, [account]);

  useEffect(() => {
    // Check if we should auto-start the game
    // For CrazyGames, we need to wait for crazygamesAuthReady
    // For non-CrazyGames, we need to wait for accountReady
    const isCrazygames = crazygamesSDK.shouldUseSDK();
    const isAuthReady = isCrazygames ? crazygamesAuthReady : accountReady;

    if(loadingProgress === 100 && isAuthReady && isConnected && instantStart) {
      console.log('[CrazyGames] Instant multiplayer - Auto-starting game');
      console.log('[CrazyGames] Conditions met - loadingProgress:', loadingProgress, 'isAuthReady:', isAuthReady, 'isConnected:', isConnected);
      setInstantStart(false);
      (window as any).instantStart = false;
      (window as any)._wasInstantStart = true;

      setTimeout(() => {
        console.log('[CrazyGames] Triggering auto-start now');
        onStart();
      }, 100);
    }
  }, [loadingProgress, accountReady, crazygamesAuthReady, isConnected, instantStart]);
  const isLoaded = loadingProgress === 100;
  return (
    <div className="App">
      <LoadingScreen
        progress={loadingProgress}
        instantStart={instantStart}
        connectionError={connectionError}
      />
      <GameComponent
        onHome={onHome}
        onGameReady={onGameReady}
        onConnectionClosed={onConnectionClosed}
        dimensions={dimensions}
        loggedIn={account.isLoggedIn}
        game={game}
        setGame={setGame}
        openLeaderboard={openLeaderboard}
        onPendingRespawn={(info: any) => setPendingRespawn(info)}
        hudDesigner={hudDesigner}
      />
      {connectionError && (
        <Modal
          child={<ConnectionError reason={connectionError}/>}
          className="connectionErrorModal"
          scaleDisabled
        />
      )}

      {!gameStarted && (
        <>
        <div className={`${isConnected ? 'loaded mainMenu' : 'mainMenu'}`} style={{ '--menu-scale': menuScale } as React.CSSProperties}>
        <div className="game-buttons" style={{ ...scale.styles, transform: `scale(${gameButtonsScale})` }}>
          <section className="game-btn">
            <ShopButton account={account} scale={scale.factor} openShop={openShop} />
          </section>
          {account?.isLoggedIn && (
            <section className="game-btn">
              <InventoryButton account={account} scale={scale.factor} openInventory={openInventory} />
            </section>
          )}
          <section className="game-btn">
            <LeaderboardButton scale={scale.factor} openLeaderboard={openLeaderboard} />
          </section>
          {account?.isLoggedIn && (
            <section className="game-btn">
              <RewardsButton account={account} scale={scale.factor} openRewards={openRewards} />
            </section>
          )}
        </div>
            <div id="contentt" style={scale.styles}>

          <div id="menuContainer" >

            {/* <!-- GAME NAME --> */}
            <div id="gameName"><img src={titleImg} alt="Swordbattle.io" width={750} height={250} className="title-img" />
</div>
            {pendingRespawn && respawnCountdown > 0 && (
                <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: xpBonusCountdown ? 'translate(-50%, -380%)' : 'translate(-50%, -330%)',
                zIndex: 9999,
                textAlign: 'center',
                color: '#89ff89',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                maxWidth: '600px',
                background: 'linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.7) 20%, rgba(0, 0, 0, 0.7) 80%, rgba(0, 0, 0, 0))',
                }}>
                You will respawn with {pendingRespawn.coins.toLocaleString()} coins near your death location (Disappears in {respawnCountdown}s)
                </div>
            )}
            {xpBonusCountdown && (
                <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: pendingRespawn && respawnCountdown > 0
                  ? 'translate(-50%, -270%)'
                  : 'translate(-50%, -330%)',
                zIndex: 9999,
                textAlign: 'center',
                color: '#ffeb3b',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                maxWidth: '600px',
                background: 'linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.7) 20%, rgba(0, 0, 0, 0.7) 80%, rgba(0, 0, 0, 0))',
                }}>
                2XP active for {xpBonusCountdown}
                </div>
            )}

            {/* <!-- LOADING TEXT --> */}
            {/* <!-- MENU CARDS --> */}
            <div id="menuCardHolder" className={isSmallIframe ? 'small-iframe' : ''} style={{ display: 'inline-block', height: 'auto !important', position: 'fixed',
    top: '-50%',
    left: '50%',
    transform: 'translate(-50%, -25%)' }} >
              <div className="menu">
                {(crazygamesSDK.shouldUseSDK() || isBasicLaunch) && !account?.secret ? (
                  <div className="accountCard menuCard panel">
                    <LeaderboardCard />
                  </div>
                ) : (
                  <div className="accountCard menuCard panel">
                    <AccountCard account={account} onLogin={onLogin} onSignup={onSignup} onViewProfile={openProfile} />
                  </div>
                )}

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
                      placeholder="Enter Name..."
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

                    <div id="enterGame" className={`menuButton${isFirstVisit ? ' first-visit' : ''}`} onClick={() => {
                        if (accountReady && isConnected) {
                          if (account.isLoggedIn && account.username.startsWith(".")) { void showDialog(
                            "Your account has been temporarily suspended due to violations of the game's rules. This restriction will be lifted soon. Please log out to play with a different account.",
                            'Account suspended'
                            ); return; } (window as any)._wasInstantStart = false; onStart(); }}}>
                        {(accountReady && isConnected) ? 'Play!' : 'Connecting...'}
                    </div>
                  </div>
                </div>
                <div className="accountCard menuCard panel">
                  <ChangelogCard onViewChangelog={(id: number) => openAnnouncements(id)}/>
                </div>
              </div>
              {/* <div
                className="panel tipCard"
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '75%',
                  margin: 'auto',
                  marginTop: 5,
                  padding: 7,
                  fontSize: 12, // change back to 13
                  boxSizing: 'border-box',
                  maxWidth: '100%',
                  color: 'white'
                }}
                title={randomMessage}
              >
                {randomMessage}
              </div> */}
              <br />
              <div className='fullWidth'>
                <div id="adBelow">
                 {(!needsMenuAdUnmount || (!shownModal && !profileUser && !previewSkin)) && (
                   <Ad screenW={dimensions.width} screenH={dimensions.height} types={[[728, 90], [970, 90], [970, 250]]} placement="main_menu" adblockPromo />
                 )}
                </div>
              </div>
            </div>

</div>
          </div>

          {/* <!-- BUTTONS --> */}
          <div style={bottomLeftContainerStyle} className="bottom-left-buttons">
          <div id="settingsButton" className="altLink imgPanel" style={{ pointerEvents: 'auto' }} onClick={openSettings}>
            <FontAwesomeIcon icon={faGear} className='ui-icon'/>
          </div>
          <SupportButton account={account} onOpen={openSupport} />
          <AnnouncementsButton onOpen={() => openAnnouncements()} />
          {/* <a id="githubButton" className="altLink imgPanel" href="https://github.com/codergautam/swordbattle.io" target="_blank" rel="nofollow" style={{ pointerEvents: 'auto' }}>
            <img src={GithubLogo} width={60} alt="GitHub" />
          </a> */}
          <a id="discordButton" className="altLink imgPanel" href="https://discord.com/invite/9A9dNTGWb9" target="_blank" rel="nofollow" style={{ pointerEvents: 'auto' }}>
            <img src={DiscordLogo} width={60} alt="Discord" />
          </a>
          </div>
          {shownModal && (() => { const cls = modalClasses.get(shownModal.type) ?? ''; const isFullscreen = cls === 'modal-fullscreen'; const isSettings = cls === 'modal-settings'; return <Suspense fallback={null}><Modal key={shownModal.type.displayName || shownModal.type.name} child={shownModal} requestClose={closeModal} scaleDisabled={!!cls} className={cls} backdrop={!!cls && !isFullscreen} backdropClass={isSettings ? 'modal-backdrop-clear' : ''} closing={modalClosing} /></Suspense>; })()}
          {profileUser && (
            <Suspense fallback={null}>
            <Modal
              key="profile-overlay"
              child={<ProfileModal
                username={profileUser}
                isOwnProfile={account.isLoggedIn && profileUser === account.username}
                onOpenClan={profileDesigner ? undefined : (clanId: number) => { closeProfileOverlay(); setModal(<ClansModal account={account} onViewProfile={openProfileOverlay} initialClanId={clanId} />); }}
                mockData={profileDesigner ? getMockProfileData() : undefined}
                mockGames={profileDesigner ? getMockProfileGames() : undefined}
                themeOverride={profileDesigner ? designerTheme : undefined}
                themeNameOverride={profileDesigner ? designerThemeName : undefined}
              />}
              requestClose={profileDesigner ? undefined : closeProfileOverlay}
              className="modal-profile"
              backdropClass="modal-backdrop-top"
              scaleDisabled
              backdrop
              closing={profileClosing}
            />
            </Suspense>
          )}
          {profileDesigner && createPortal(
            <Suspense fallback={null}>
              <ProfileDesignerPanel
                theme={designerTheme}
                onChange={setDesignerTheme}
                displayName={designerThemeName}
                onDisplayNameChange={setDesignerThemeName}
              />
            </Suspense>,
            document.body,
          )}
          {previewSkin !== null && createPortal(
            <Modal
              key="skinpreview-overlay"
              child={<SkinPreviewModal skinId={previewSkin.id} viewOnly={previewSkin.viewOnly} />}
              requestClose={closeSkinPreview}
              className="modal-skinpreview"
              backdropClass="modal-backdrop-top"
              scaleDisabled
              backdrop
              closing={previewClosing}
            />,
            document.body,
          )}
          {showMenuTutorial && <TutorialModal onClose={() => setShowMenuTutorial(false)} centered />}

<div className="auth-buttons" style={{ ...scale.styles, transform: `scale(${gameButtonsScale})` }}>
             {account.isLoggedIn ? (
               <>
               <div className="dropdown" data-open={authDropdownOpen} onMouseEnter={openAuthDropdown} onMouseLeave={closeAuthDropdown}>
                {account.clan ? (
                    <div className="auth-username">
                    <FontAwesomeIcon icon={faUser} />{' '}
                    <span style={{ color: 'yellow' }}>[{account.clan.clan.tag.toUpperCase()}]</span>{' '}
                    {account.username}
                    </div>
                ) : (
                  <div className="auth-username">
                    <FontAwesomeIcon icon={faUser} /> {account.username}
                  </div>
                )}
                 <ul className="dropdown-menu" onMouseEnter={openAuthDropdown} onMouseLeave={closeAuthDropdown}>
                   <li>
                   <a className="dropdown-item" href="#" onClick={onChangeName}>
                     <FontAwesomeIcon icon={faICursor} /> Change Name
                   </a>
                    </li>
                    {!crazygamesSDK.getSettings().disableChat && Settings.enableChat && (
                      <li>
                        <a className="dropdown-item" href="#" onClick={onChangeBio}>
                          <FontAwesomeIcon icon={faICursor} /> Change Bio
                        </a>
                      </li>
                    )}
                   {!account.isCrazygames && (
                     <li><a className="dropdown-item" href="#" onClick={onLogout}>
                       <FontAwesomeIcon icon={faSignOut} /> Logout
                     </a></li>
                   )}
                 </ul>
               </div>
               <img src={ClanImg} alt="Clans" role="button" className="auth-btn" onClick={openClans} title="Clans" />
               </>
             ) : (
               <>
               {!crazygamesSDK.shouldUseSDK() && (
                 <>
                   <img src={LoginImg} alt="Login" role="button" className="auth-btn" onClick={onLogin} />
                   <img src={SignupImg} alt="Signup" role="button" className="auth-btn" onClick={onSignup} />
                 </>
               )}
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
    <PromptDialog />
    </div>
  );
}

export default App;
