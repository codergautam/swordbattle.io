import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
      <h1 style={{fontSize: 30}}>DEGRADED PERFORMANCE</h1>
      <ul>
        <li>
          <h3 style={{color: 'cyan', fontStyle: 'italic'}}>
            We are currently investigating a memory leak that is causing servers to crash. <br/>You might get disconnect more often than usual.<br/>We are sorry for the inconvenience and are working on a fix.

            <br/>
            - Gautam @ swordbattle.io
          </h3>
        </li>
        <hr />
      </ul>
      <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
    Create your own skins!</a>
    </div>
  );
}

export default ChangelogModal;
