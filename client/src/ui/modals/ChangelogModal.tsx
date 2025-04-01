import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'white'}}>What's new? (April 2025)</h1>
    <h1 style={{fontSize: 15, color: 'red'}}>A catastrophic error occurred within Swordbattle, and some features have been shrunken down temporarily while we fix the problem. The changes are as follows:</h1>
    <ul style={{fontSize: 19, color: 'white'}}>- The map is now 50% smaller</ul>
    <ul style={{fontSize: 19, color: 'white'}}>- The entire map is now the forest biome</ul>
    <ul style={{fontSize: 19, color: 'white'}}>- All chests are now completely random (may be chaotic)</ul>
    <br></br>
    <p style={{fontSize: 17, color: 'lightblue'}}>Join the <a href="https://discord.com/invite/9A9dNTGWb9" className="primary-link" target="_blank" rel="nofollow">Swordbattle.io Discord Server</a> to learn more about why this happened.</p>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
