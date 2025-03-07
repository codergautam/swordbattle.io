import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'red'}}>What's new? (March 2025)</h1>
    <h1 style={{fontSize: 30, color: 'black'}} className='golden'>Revamped Mastery</h1>
    <ul style={{fontSize: 19, color: 'orange'}}>- <span style={{fontSize: 23, color: '#FF2222'}}>All mastery has now been reset</span>, but <span style={{fontSize: 19, color: '#FFFF00'}}>all bugs with mastery calculation have been fixed, and the mastery system is now always fair when calculating mastery!</span></ul>
    <br></br>
    <ul style={{fontSize: 19, color: 'orange'}}>- <span style={{fontSize: 19, color: '#FFFF00'}}>NO ULTIMATE SKINS HAVE BEEN REMOVED!</span> You can still equip the Ultimate Skins you own.</ul>
    <br></br>
    <ul style={{fontSize: 19, color: 'orange'}}>- Since getting mastery is now easier with the new calculations, Ultimate Skins' prices have been increased to respect the original owners!</ul>
    <br></br>
    <p style={{fontSize: 17, color: 'lightblue'}}>Join the <a href="https://discord.com/invite/9A9dNTGWb9" className="primary-link" target="_blank" rel="nofollow">Swordbattle.io Discord Server</a> to learn more about this mastery change on the full changelog!</p>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
