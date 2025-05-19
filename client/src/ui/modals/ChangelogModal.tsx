import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'white'}}>What's new? (May 2025)</h1>
    <ul style={{fontSize: 17, color: 'white'}}>- Evolutions now start with a 5-second ability cooldown when first evolved</ul>
    <ul style={{fontSize: 17, color: 'white'}}>- Fixed bug where thrown swords could damage people twice (Also fixed a bug with this patch that delayed throw cooldowns after swinging your sword)</ul>
    <ul style={{fontSize: 15, color: 'white'}}>- Replaced C & SHIFT throwing keybinds with C & E, and replaced G & R ability keybinds with G & Q</ul>
    <br></br>
    <ul style={{fontSize: 17, color: '#ffff00'}}>- The current mastery you can earn from a game is now shown while you're alive!</ul>
    <ul style={{fontSize: 13, color: '#888888'}}>Note: because mastery gain is exponential, mastery won't start increasing until 5000 coins, and won't ramp up until around 100K coins. For efficient mastery gain, always get as many coins as possible in a single game!</ul>
    <br></br><br></br>
    <h1 style={{fontSize: 25, color: 'lime'}}>March 2025: Spring Update</h1>
    <ul style={{fontSize: 19, color: '#aaffaa'}}>- New "secret" evolution: Stalker! (Hint: to get it, don't pick any other evolutions)</ul>
    <p style={{fontSize: 16, color: 'lightblue'}}>Join the <a href="https://discord.com/invite/9A9dNTGWb9" className="primary-link" target="_blank" rel="nofollow">Swordbattle.io Discord Server</a> to learn more about the spring event on the full changelog!</p>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
