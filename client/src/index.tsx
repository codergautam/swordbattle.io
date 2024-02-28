import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import App from './ui/App';
import { GlobalLeaderboard } from './ui/GlobalLeaderboard';
import Profile from './ui/Profile';
import { store } from './redux/store';
import { config } from './config';
import { load } from 'recaptcha-v3'

import './global.scss';

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: 'leaderboard',
    element: <GlobalLeaderboard />,
  },
  {
    path: 'profile',
    element: <Profile />,
  },
], {
  basename: config.basename,
});
let debugMode = false;

try {
  debugMode = window.location.search.includes("debugAlertMode");
  } catch(e) {}
if(config.recaptchaClientKey) {
load(config.recaptchaClientKey).then((recaptcha) => {
  console.log('recaptcha loaded');
  if(debugMode) alert('recaptcha loaded');

  // emit custom recaptchaLoaded event to let other parts of the app know that recaptcha is ready
  const event = new CustomEvent('recaptchaLoaded', { detail: true });
  window.dispatchEvent(event);
  (window as any).recaptcha = recaptcha as  any;
});
}

// check if have queryparam called instantStart=true
// if so, start the game instantly
(window as any).instantStart = false;
try {
  (window as any).instantStart = window.location.search.includes("instantStart=true");
} catch(e) {}
const root = ReactDOM.createRoot(document.getElementById('root') as Element);
document.addEventListener('contextmenu',function(e) {
  e.preventDefault();
  });
root.render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);