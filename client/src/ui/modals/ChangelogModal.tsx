import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30}}>What's new? (January 27, 2025)</h1>
    <li>- Winter update has ended! All winter event skins are now exclusive!</li>
    <li>- 3 new ultimate skins! <li className='important'>(GET THE ULTIMATE LUMINOUS SKIN FOR FREE BEFORE 2/3!)</li></li>
    <br></br>
    <hr></hr>
    <h1 style={{fontSize: 30, color: 'black'}} className='golden'>New feature: Mastery</h1>
    <ul style={{fontSize: 27, color: 'yellow'}}>(Make an account to start earning MASTERY!)</ul>
    <ul style={{fontSize: 19, color: 'orange'}}>- Get high coin runs to earn more mastery!</ul>
    <ul style={{fontSize: 19, color: 'yellow'}}>- Climb the brand-new Mastery Leaderboard and use your mastery to unlock the new Ultimate Skins in the shop!</ul>
    <br></br>
    <p style={{fontSize: 17, color: 'lightblue'}}>Join the <a href="https://discord.com/invite/9A9dNTGWb9" className="primary-link" target="_blank" rel="nofollow">Swordbattle.io Discord Server</a> to get a full changelog with MUCH more info on these updates, info on other updates you may have missed, and helpful tips and tricks, too!</p>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
