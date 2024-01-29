import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
      <h1>What's new?</h1>
      <ul>
        <li>
          <h3 style={{color: 'cyan', fontStyle: 'italic'}}>
            PVP Improvements and bug fixes!
          </h3>
          <p style={{color: 'cyan', fontStyle: 'italic'}}>
            If you forgot your username or password email support@swordbattle.io
            </p>
        </li>
        <hr />
      </ul>
      <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
    Create your own skins!</a>
    </div>
  );
}

export default ChangelogModal;
