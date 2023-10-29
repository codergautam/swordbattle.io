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

  const onSignup = () => {
    api.post(`${api.endpoint}/auth/register`, { username, email, password }, (data) => {
      if (data.message) {
        window.alert(Array.isArray(data.message) ? data.message.join('\n') : data.message);
      } else {
        dispatch(setAccount(data.account));
        onSuccess();
      }
    });
  }

  return (
    <div className="signup-modal">
      <h1>Signup</h1>
      <input type="username" placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input type="email" placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input type="password" placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={onSignup}>Signup</button>
    </div>
  );
}

export default SignupModal;
