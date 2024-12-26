import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30}}>What's new? (December 2024)</h1>
    <li>WINTER UPDATE! Enjoy these additions to the game during this event:</li>
    <br></br>
    <ul>- New biomes and faster-spawning bosses!</ul>
    <ul>- Stronger mobs that drop more coins!</ul>
    <ul>- Winter-themed skins are on sale for much cheaper!</ul>
    <ul>- Limited-time event skins that will go offsale after the winter event!</ul>
    <li className='important'>- CHRISTMAS SKIN! GET THE SKIN FOR FREE BEFORE IT GOES OFFSALE!</li>
    <br></br>
    <ul>(Credit to A-Bot, cool guy 53, and Battleship)</ul>
    <hr></hr>
    <h1 style={{fontSize: 30, color: 'black'}} className='rainbow'>New feature: Ultimacy</h1>
    <ul style={{fontSize: 27, color: 'red'}}>- Make an account to start earning ULTIMACY!</ul>
    <ul style={{fontSize: 17, color: 'yellow'}}>- Get tons of coins in a single game to get more and more ultimacy! More coins = EXPONENTIALLY more ultimacy!</ul>
    <ul style={{fontSize: 17, color: 'lime'}}>(You might also get some good scores on the coins leaderboard while doing this too!)</ul>
    <ul style={{fontSize: 19, color: 'cyan'}}>- Climb the brand-new Ultimacy Leaderboard and become the ultimate swordbattler!</ul>
    <ul style={{fontSize: 19, color: 'rgb(37, 142, 255)'}}>- Use your ultimacy in the near future to unlock Ultimate Skins!</ul>
    <br></br>
    <ul style={{fontSize: 12, color: 'magenta'}}>- (P.S. Changelog will also be reorganized soon, join the Discord to see the full changelog when it comes out!)</ul>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!
</a> */

export default ChangelogModal;
