import ReactDOM from 'react-dom/client';
import App from './ui/App';
import './global.scss';
import { Provider } from 'react-redux';
import { store } from './redux/store';

const root = ReactDOM.createRoot(document.getElementById('root') as Element);
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
