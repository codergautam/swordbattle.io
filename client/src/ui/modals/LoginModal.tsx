import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setAccount } from '../../redux/account/slice';
import api from '../../api';

import './LoginModal.scss';

function LoginModal({ onSuccess }: any) {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onLogin = () => {
    api.post(`${api.endpoint}/auth/login`, { username, password }, (data) => {
      if (data.message) {
        window.alert(Array.isArray(data.message) ? data.message.join('\n') : data.message);
      } else {
        data.account.secret = data.secret;

        dispatch(setAccount(data.account));
        onSuccess();
      }
    });
  }

  return (
    <div className="login-modal">
      <h1>Log in</h1>
      <input type="text" placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input type="password" placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <p style={{marginTop: 5, marginBottom: 0}}>Forgot your password? Email support@swordbattle.io</p>
      <button onClick={onLogin}>Login</button>
    </div>
  );
}

export default LoginModal;
