import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30}}>What's new? (Jan 2025)</h1>
    <li className='important'>WINTER UPDATE! Event skins, skin sale and more!</li>
    <hr></hr>
    <h1 style={{fontSize: 30, color: 'black'}} className='golden'>New feature: Mastery</h1>
    <ul style={{fontSize: 27, color: 'yellow'}}>(Make an account to start earning MASTERY!)</ul>
    <ul style={{fontSize: 19, color: 'orange'}}>- Get high coin runs to earn more mastery!</ul>
    <br></br>
    <ul style={{fontSize: 19, color: 'yellow'}}>- Climb the brand-new Mastery Leaderboard and become the master swordbattler!</ul>
    <ul style={{fontSize: 19, color: 'orange'}}>- Use your mastery to unlock the new Ultimate Skins in the shop!</ul>
    <br></br>
    <p style={{fontSize: 17, color: 'lightblue'}}>If you want more info on the winter update and mastery update (plus see other updates you may have missed), join the <a href="https://discord.com/invite/9A9dNTGWb9" className="primary-link" target="_blank" rel="nofollow">Swordbattle.io Discord Server</a>!</p>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
