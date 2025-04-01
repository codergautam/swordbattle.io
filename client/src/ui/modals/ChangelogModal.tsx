import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 40, color: 'yellow'}}>Notice</h1>
    <ul style={{fontSize: 19, color: 'white'}}>We're sorry for releasing the April Fools event in an unfinished and glitchy state (at least it was for April Fools though). <br></br><br></br>As a result, an offer for <span style={{color: 'yellow'}}>25,000 free gems</span> has now opened up in the shop, and both this offer and the event skin will be available for an extended time.</ul>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
