import { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider, createHashRouter, Navigate } from 'react-router-dom';
import App from './ui/App';
import { Settings } from './game/Settings';
import SupportPage from './ui/SupportPage';
import NameMaker from './ui/namemaker/NameMaker';
import AnnouncementsAdminPage from './ui/announcements/AnnouncementsAdminPage';
import { store } from './redux/store';
import { config } from './config';
import { load } from 'recaptcha-v3'
import { crazygamesSDK, applyCrazygamesFirstVisitAutoStart } from './crazygames/sdk';
import { detectAdblock } from './crazygames/adblock';
import { initializeDataStorage } from './crazygames/dataStorage';
import { applyHudThemeCss } from './hudTheme';
import { initAnalytics } from './analytics';
import { mark } from './bootTiming';

import './global.scss';

mark('index.tsx module eval');

const MetricsPage = lazy(() => import('./ui/MetricsPage'));
const BotsPage = lazy(() => import('./ui/BotsPage'));

applyHudThemeCss();
initAnalytics();
detectAdblock();

function syncAdSound(volume: number) {
  const w = window as any;
  if (w.adProvider !== 'adsense' || typeof w.adConfig !== 'function') return;
  w.adConfig({ sound: Number(volume) > 0 ? 'on' : 'off' });
}
syncAdSound(Settings.sound);
window.addEventListener('soundVolumeChanged', (e: any) => syncAdSound(e?.detail?.volume));

function MoreAdsRedirect() {
  Settings.moreAds = true;
  return <Navigate to="/" replace />;
}

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: 'moreads',
    element: <MoreAdsRedirect />,
  },
  {
    path: 'profile',
    element: <Navigate to="/" replace />,
  },
  {
    path: 'namemaker',
    element: <NameMaker />,
  },
  {
    path: ':secret/profiledesigner',
    element: <App profileDesigner />,
  },
  {
    path: ':secret/metrics',
    element: <Suspense fallback={null}><MetricsPage /></Suspense>,
  },
  {
    path: ':secret/support',
    element: <SupportPage />,
  },
  {
    path: ':secret/announcements',
    element: <AnnouncementsAdminPage />,
  },
  {
    path: ':secret/bots',
    element: <Suspense fallback={null}><BotsPage /></Suspense>,
  },
  {
    path: '*',
    element: <App />,
  },
], {
  basename: config.basename,
});
let debugMode = false;

try {
  debugMode = window.location.search.includes("debugAlertMode");
  } catch(e) {}
if(config.captchaEnabled) {
load(config.recaptchaClientKey).then((recaptcha) => {
  console.log('recaptcha loaded');
  if(debugMode) alert('recaptcha loaded');

  // emit custom recaptchaLoaded event to let other parts of the app know that recaptcha is ready
  const event = new CustomEvent('recaptchaLoaded', { detail: true });
  window.dispatchEvent(event);
  (window as any).recaptcha = recaptcha as  any;
});
}

// Initialize CrazyGames SDK
crazygamesSDK.init().then(async () => {
  console.log('CrazyGames SDK ready');
  if(debugMode) alert('CrazyGames SDK loaded');

  (window as any).crazygamesSDK = crazygamesSDK;

  const env = (window as any).CrazyGames?.SDK?.environment;
  if (env === 'crazygames') {
    (window as any).adProvider = 'crazygames';
    (window as any).vidAdDelay = 0;
    console.log('[CrazyGames] Ad provider overridden to crazygames');
    window.dispatchEvent(new CustomEvent('crazygamesSDKReady'));
    window.dispatchEvent(new CustomEvent('adProviderChanged', { detail: 'crazygames' }));
  }

  await initializeDataStorage();
  console.log('CrazyGames data storage initialized');
}).catch((error) => {
  console.log('CrazyGames SDK not available:', error);
});

(window as any).instantStart = false;
try {
  const urlSearch = window.location.search;
  if (urlSearch.includes("instantStart=true") || urlSearch.includes("instantJoin=true")) {
    (window as any).instantStart = true;
    console.log('[InstantStart] Enabled via URL params');
  }
} catch(e) {}
applyCrazygamesFirstVisitAutoStart();
const root = ReactDOM.createRoot(document.getElementById('root') as Element);
document.addEventListener('contextmenu',function(e) {
  e.preventDefault();
  });
root.render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);
