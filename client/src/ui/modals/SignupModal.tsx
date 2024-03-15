import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setAccount } from '../../redux/account/slice';
import api from '../../api';

import './SignupModal.scss';

function SignupModal({ onSuccess }: any) {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // New state for loading indicator

  const onSignup = () => {
    setIsLoading(true); // Start loading
    api.post(`${api.endpoint}/auth/register`, { username, email, password }, (data) => {
      setIsLoading(false); // Stop loading on response
      if (data.message) {
        window.alert(Array.isArray(data.message) ? data.message.join('\n') : data.message);
      } else {
        data.account.secret = data.secret;
        dispatch(setAccount(data.account));
        onSuccess();
      }
    }, undefined, true);
  }

  return (
    <div className="signup-modal">
      <h1 style={{marginBottom: 0}}>Sign up</h1>
      <p style={{margin: 0, marginBottom: 10}}>Save your progress and unlock cool skins!</p>
      <input type="text" placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input type="email" placeholder="Email (optional)"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input type="password" placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={onSignup} disabled={isLoading}>
        {isLoading ? 'Loading..' : 'Signup'}
      </button>
    </div>
  );
}

export default SignupModal;
