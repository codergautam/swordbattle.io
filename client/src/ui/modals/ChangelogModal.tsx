import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'white'}}>What's new? (May 2025)</h1>
    <ul style={{fontSize: 17, color: 'white'}}>- (HOPEFULLY) Fixed bug where thrown swords could damage people twice (SORRY IF YOU WERE PLAYING DURING THE MASS DISCONNECTING)</ul>
    <ul style={{fontSize: 17, color: '#00ffff'}}>- Evolutions now start with a 5-second ability cooldown when first evolved</ul>
    <ul style={{fontSize: 15, color: 'white'}}>- Replaced C & SHIFT throwing keybinds with C & E, and replaced G & R ability keybinds with G & Q</ul>
    <ul style={{fontSize: 14, color: '#bbbbbb'}}>- Other various bugfixes and shop changes</ul>
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
