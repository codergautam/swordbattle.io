import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
      <h1>What's new?</h1>
      <h2>Last update: May 28 2023</h2>
      <ul>
        <li>
          <h3 style={{color: 'cyan', fontStyle: 'italic'}}>New Skins!</h3>
        </li>
        <li>
          <h3 style={{color: 'cyan', fontStyle: 'italic'}}>
            It's {' '}
            <a href="https://forum.codergautam.dev/t/introducing-the-swordbattle-spring-update/11091" style={{color: 'pink', textDecoration: 'underline'}} target="_blank">
              SPRING in swordbattle.io
            </a>
          </h3>
        </li>
        <hr />
        <li>
          <strong style={{color: 'orange'}}>
            - Swordbattle v2.0 COMING soon
            (<a href="https://forum.codergautam.dev/t/announcing-swordbattle-v2-0/2484" style={{color: 'aqua'}}>
              {' '}read more{' '}
            </a>)
          </strong>
        </li>
      </ul>
      <a className="primary-link" target="_blank" href="https://forum.codergautam.dev/t/how-to-make-your-own-swordbattle-io-skin/585">
    Create your own skins!</a>
    </div>
  );
}

export default ChangelogModal;
