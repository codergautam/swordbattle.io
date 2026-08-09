import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setAccount } from '../../redux/account/slice';
import api from '../../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark, faSpinner, faPlus } from '@fortawesome/free-solid-svg-icons';
import { showDialog } from '../PromptDialog';

import './SignupModal.scss';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

function SignupModal({ onSuccess }: any) {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameMsg, setUsernameMsg] = useState('');
  const latestQuery = useRef('');

  useEffect(() => {
    const u = username.trim();
    if (!u) {
      latestQuery.current = '';
      setUsernameStatus('idle');
      setUsernameMsg('');
      return;
    }
    setUsernameStatus('checking');
    setUsernameMsg('');
    const t = setTimeout(() => {
      latestQuery.current = u;
      api.get(`${api.endpoint}/auth/username-available?username=${encodeURIComponent(u)}`, (data) => {
        if (latestQuery.current !== u) return;
        if (data && data.available) {
          setUsernameStatus('available');
          setUsernameMsg('');
        } else {
          setUsernameStatus('taken');
          setUsernameMsg(data?.reason || 'Username is taken');
        }
      });
    }, 450);
    return () => clearTimeout(t);
  }, [username]);

  const onSignup = () => {
    if (isLoading || usernameStatus === 'taken') return;
    setIsLoading(true);
    api.post(`${api.endpoint}/auth/register`, { username, email, password }, (data) => {
      setIsLoading(false);
      if (data.message) {
        void showDialog(Array.isArray(data.message) ? data.message.join('\n') : data.message, 'Sign up');
      } else {
        data.account.secret = data.secret;
        dispatch(setAccount(data.account));
        onSuccess();
      }
    }, undefined, true);
  }

  return (
    <div className="signup-modal">
      <h1>Sign up</h1>
      <p className="subtitle">Save your progress and unlock cool stuff!</p>

      <div className={`username-field status-${usernameStatus}`}>
        <input type="text" placeholder="Username" value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {username.trim() && usernameStatus !== 'idle' && (
          <span className="username-status">
            {usernameStatus === 'checking' && <FontAwesomeIcon icon={faSpinner} spin />}
            {usernameStatus === 'available' && <FontAwesomeIcon icon={faCheck} />}
            {usernameStatus === 'taken' && <FontAwesomeIcon icon={faXmark} />}
          </span>
        )}
      </div>
      {usernameStatus === 'taken' && usernameMsg && (
        <div className="field-msg">{usernameMsg}</div>
      )}

      <input type="password" placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      {showEmail ? (
        <input type="email" placeholder="Email (optional)" value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      ) : (
        <button type="button" className="add-email" onClick={() => setShowEmail(true)}>
          <FontAwesomeIcon icon={faPlus} /> Add email (optional)
        </button>
      )}

      <button className="auth-submit" onClick={onSignup} disabled={isLoading || usernameStatus === 'taken'}>
        {isLoading ? 'Loading…' : 'Sign up'}
      </button>
    </div>
  );
}

SignupModal.displayName = 'SignupModal';

export default SignupModal;
