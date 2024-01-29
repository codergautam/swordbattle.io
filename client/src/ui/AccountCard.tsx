import { AccountState } from "../redux/account/slice";
import ValueCnt from "./ValueCnt";
import GemImg from '../assets/img/gem.png';
import XPImg from '../assets/img/xp.png';
import './AccountCard.scss';
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

export default function AccountCard({account, onLogin, onSignup}: {account: AccountState, onLogin: () => void, onSignup: () => void}) {
  if(account.isLoggedIn) {
    return (
      <span id="logged-in">
        <h1>{account.username}</h1>
        <div className="stats">
        <ValueCnt scale={0.5} value={account.gems} img={GemImg}/>
        </div>


                   <Link to={`/profile?username=${encodeURIComponent(account.username)}`} target="_blank" className="profilebutton">
                      <FontAwesomeIcon icon={faUser} /> View Profile
                </Link>
        </span>
    )
  } else return (
    <span id="logged-out">
                    <div className="menuText">
                      <a onClick={onLogin}>Login</a> or&nbsp;

                      <a onClick={onSignup}>Create an Account</a> to save your progress and unlock skins!
                    </div>
                  </span>
  )
}