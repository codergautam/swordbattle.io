import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
      <h1>What's new?</h1>
      <ul>
        <li>
          <h3 style={{color: 'cyan', fontStyle: 'italic'}}>
            V2 development build
          </h3>
        </li>
        <hr />
      </ul>
      <a className="primary-link" target="_blank" href="https://forum.codergautam.dev/t/how-to-make-your-own-swordbattle-io-skin/585">
    Create your own skins!</a>
    </div>
  );
}

export default ChangelogModal;
