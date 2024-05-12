import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30}}>Evolution Revamp! (May 11th, 2024)</h1>
    <li>- 4 new evolutions added!</li>
    <li>- Balancing and improvements to PvP</li>
    {/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
        Create your own skins to be added in the game!
    </a>*/}
    <p>Stay tuned for more updates and future projects from our team.</p>
</div>

  );
}

export default ChangelogModal;
