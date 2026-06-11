import { AccountState } from "../redux/account/slice";
import ValueCnt from "./ValueCnt";
import GemImg from '../assets/img/gem.png';
import UltimacyImg from '../assets/img/ultimacy.png';
import SnowtokenImg from '../assets/img/snowtoken.png';
import XPImg from '../assets/img/xp.png';
import './AccountCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

export default function AccountCard({account, onLogin, onSignup, onViewProfile}: {account: AccountState, onLogin: () => void, onSignup: () => void, onViewProfile?: () => void}) {
  if(account.isLoggedIn) {
    return (
      <span id="logged-in">
        <h1>{account.username}</h1>
        <br />
        <div className="stats"><ValueCnt scale={0.4} value={account.gems} img={GemImg}/>
        </div>
        {/* <br />
        <div className="stats"><ValueCnt scale={0.4} value={account.tokens} img={SnowtokenImg}/>
        </div> */}
        <br />
        <div className="stats"><ValueCnt scale={0.4} value={account.mastery} img={UltimacyImg}/>

        </div>
                   <a className="profilebutton" onClick={onViewProfile} style={{ cursor: 'pointer' }}>
                      <FontAwesomeIcon icon={faUser} /> View Profile
                </a>
        </span>
    )
  } else return (
    <span id="logged-out">
      <div className="signinPromo">
        <div className="signinPromo-text">Sign in to save your progress and access more features!</div>
        <div className="signinPromo-actions">
          <button className="promo-btn promo-login" onClick={onLogin}>Login</button>
          <button className="promo-btn promo-register" onClick={onSignup}>Register</button>
        </div>
      </div>
    </span>
  )
}