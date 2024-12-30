import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30}}>What's new? (December 2024)</h1>
    <li className='important'>WINTER UPDATE! Enjoy these additions to the game during this event:</li>
    <br></br>
    <ul>- New biomes and faster-spawning bosses!</ul>
    <ul>- Winter-themed skins are on sale for much cheaper!</ul>
    <ul>- Limited-time event skins that will go offsale after the winter event!</ul>
    <hr></hr>
    <h1 style={{fontSize: 30, color: 'black'}} className='golden'>New feature: Mastery</h1>
    <ul style={{fontSize: 27, color: 'yellow'}}>(Make an account to start earning MASTERY!)</ul>
    <br></br>
    <ul style={{fontSize: 17, color: 'orange'}}>- Get tons of coins in a single life to get more and more mastery! (This is the ONLY efficient way to earn mastery, and it may get you some scores on the Coins Leaderboard too!)</ul>
    <br></br>
    <ul style={{fontSize: 19, color: 'yellow'}}>- Climb the brand-new Mastery Leaderboard and become the master swordbattler!</ul>
    <br></br>
    <ul style={{fontSize: 19, color: 'orange'}}>- Use your mastery to unlock the new Ultimate Skins in the shop!</ul>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
