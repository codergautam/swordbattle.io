import { AccountState } from '../../redux/account/slice';
import './MigrationModal.scss';
import cosmetics from '../../game/cosmetics.json';
import GemImg from '../../assets/img/gem.png';
import XPImg from '../../assets/img/xp.png';
import SkinImg from '../../assets/img/skin.png';
function MigrationModal(props: { account: AccountState }) {
  const ogSkins = props.account.skins.owned.map((skin) => Object.values(cosmetics.skins).find((s) => s.id === skin)).filter((skin) => (skin as any)?.og);
  return (
    <div className="migration">
  <h1>Welcome to Swordbattle V2!</h1>
  <p>New era, new rewards!</p>

  <div className="reward-container">
    {props.account.gems > 0 && (
      <div className="reward-box gems">
        <i className="icon gems-icon">
          <img src={GemImg} alt="Gem" width={40} height={40} />
        </i>
        <p className="text">{props.account.gems} Gems</p>
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
        <p className="text">{props.account.xp} XP</p>
      </div>
    )}
  </div>
</div>

  );
}

export default MigrationModal;
