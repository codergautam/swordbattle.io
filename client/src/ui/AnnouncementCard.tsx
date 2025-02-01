import { AccountState } from "../redux/account/slice";

export default function AccountCard({account, onLogin, onSignup,}: {account: AccountState, onLogin: () => void, onSignup: () => void}) {
  if(account.isLoggedIn) {
    <span id="logged-out">
                    <div>
                    <span className="announcedate">
                      (January 27th): 
                    </span>
                       {} 3 new ultimate skins! + <span className="announceimportant">GET THE ULTIMATE LUMINOUS SKIN FOR FREE BEFORE 2/3!</span>
                    </div>
                  </span>
  } else return (
    <span id="logged-out">
                    <div>
                    <span className="announcedate">
                      (January 27th): 
                    </span>
                       {} 3 new ultimate skins! + <span className="announceimportant">GET THE ULTIMATE LUMINOUS SKIN FOR FREE BEFORE 2/3!</span>
                    </div>
                  </span>
  )
}