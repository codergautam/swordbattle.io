import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'white'}}>What's new? (June 2025)</h1>
    <ul style={{fontSize: 18, color: '#ff3499'}}>- Added 5 more special skins to award great players! (found in the Special Skins tab)</ul>
    <br></br>
    <ul style={{fontSize: 17, color: '#ffff00'}}>- The current mastery you can earn from a game is now shown while you're alive!</ul>
    <ul style={{fontSize: 13, color: '#888888'}}>Note: because mastery gain is exponential, mastery won't start increasing until 5000 coins, and won't ramp up until around 100K coins. For efficient mastery gain, always get as many coins as possible in a single game!</ul>
    <br></br>
    <p style={{fontSize: 16, color: 'lightblue'}}>Join the <a href="https://discord.com/invite/9A9dNTGWb9" className="primary-link" target="_blank" rel="nofollow">Swordbattle.io Discord Server</a> to learn more about these updates on the full changelog!</p>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
