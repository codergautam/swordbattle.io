import { AccountState } from '../../redux/account/slice';
import './MigrationModal.scss';
import cosmetics from '../../game/cosmetics.json';
import GemImg from '../../assets/img/gem.png';
import XPImg from '../../assets/img/xp.png';
import SkinImg from '../../assets/img/skin.png';
function formatNumber(num: number) {
  if (num < 1000) {
      return num.toString();
  } else if (num < 1000000) {
      return (Math.round(num / 100) / 10).toFixed(num % 1000 === 0 ? 0 : 1) + 'k';
  } else {
      return (Math.round(num / 100000) / 10).toFixed(num % 100000 === 0 ? 0 : 1) + 'M';
  }
}

function MigrationModal(props: { account: AccountState }) {
  const ogSkins = props.account.skins.owned.map((skin) => Object.values(cosmetics.skins).find((s) => s.id === skin)).filter((skin) => (skin as any)?.og);
  return (
    <div className="migration">
  <h1>Welcome to Swordbattle V2!</h1>
  <center>
  <p>Thanks for being a veteran player of Swordbattle.io!<br/>We've made a TON of changes, and you've received the following rewards:</p>
  </center>
  <div className="reward-container">
    {props.account.gems > 0 && (
      <div className="reward-box gems">
        <i className="icon gems-icon">
          <img src={GemImg} alt="Gem" width={40} height={40} />
        </i>
        <p className="text">{formatNumber(props.account.gems)} Gems</p>
      </div>
    )}
    {ogSkins.length > 0 && (
      <div className="reward-box skinsbox">
        <i className="icon skins-icon">
          <img src={SkinImg} alt="Skin" width={40} height={40} />
        </i>
        <p className="text">{ogSkins.length} Skins</p>
      </div>
    )}
    {props.account.xp > 0 && (
      <div className="reward-box xp">
        <i className="icon xp-icon">
          <img src={XPImg} alt="XP" width={40} height={40} />
        </i>
        <p className="text">{formatNumber(props.account.xp)} XP</p>
      </div>
    )}
  </div>
</div>

  );
}

export default MigrationModal;
