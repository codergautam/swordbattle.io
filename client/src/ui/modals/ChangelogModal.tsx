import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'white'}}>What's new? (July 2025)</h1>
    <ul style={{fontSize: 19, color: '#7777ee'}}>11 new evolutions, new chests, leaderboard changes, Monthly Evols, and more!</ul>
    <ul style={{fontSize: 18, color: '#aaaaff'}}>Read more at Swordbattle.io's <a className="primary-link" target="_blank" href="https://swordbattle.io/changelog.html">
new official changelog</a>!</ul>
    <br />
    <ul style={{fontSize: 14, color: '#ffffff'}}>(Also includes an evolution tree and info on all the new evolutions!)</ul>
    <br />

    <ul style={{fontSize: 16, color: '#ff0000'}}>Note: The evolutions are not fully balanced yet, so expect major changes to them (along with more server restarts) until 7/20 at the latest.</ul>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
