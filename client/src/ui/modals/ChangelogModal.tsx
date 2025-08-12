import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'white'}}>What's new? (August 2025)</h1>
    <ul style={{fontSize: 20, color: 'white'}}>Swordbattle has always had a problem when it came to calculating stats, but we're happy to announce that <span style={{color: '#ffff00'}}>all the leaderboards are now 100% accurate!</span></ul>
    <ul style={{fontSize: 17, color: '#777777'}}>The XP, Mastery and Game leaderboards have been correctly adjusted, and will no longer need and re-calculations</ul>
    <br />
    <ul style={{fontSize: 18, color: '#aaaaff'}}>Also read the July Update at Swordbattle.io's <a className="primary-link" target="_blank" href="https://swordbattle.io/changelog.html"> official changelog</a>!</ul>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;