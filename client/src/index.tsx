import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import App from './ui/App';
import { GlobalLeaderboard } from './ui/GlobalLeaderboard';
import Profile from './ui/Profile';
import { store } from './redux/store';
import { config } from './config';

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

const root = ReactDOM.createRoot(document.getElementById('root') as Element);
root.render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);
