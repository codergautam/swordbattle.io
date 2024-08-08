import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30}}>What's new? (Aug 8th, 2024)</h1>
    <li>- New skins added!</li>
    <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
        Create your own skins to be added in the game!
    </a>
</div>

  );
}

export default ChangelogModal;
