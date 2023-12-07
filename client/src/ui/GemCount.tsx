import GemImg from '../assets/img/gem.png';
import { AccountState } from '../redux/account/slice';


export default function GemCount({account}: {account: AccountState}) {
  return (
    <div className="auth-stats">
              <img src={GemImg} alt="Gems" width={86} height={86} />
              <p>{account.gems}</p>
            </div>
  )
}