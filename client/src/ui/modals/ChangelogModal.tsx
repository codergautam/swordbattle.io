import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'white'}}>What's new? (August 2025)</h1>
    <ul style={{fontSize: 17, color: 'white'}}>We've added more options to the account menu, including the option to remove your clantag, and changing the new bios that appear on profiles!</ul>
    <img
      src="assets/ChangelogAugust-main.png"
      alt="Changelog August"
      style={{ width: '30%', maxWidth: 500, margin: '20px 0', borderRadius: 12 }}
    />
    <ul style={{fontSize: 15, color: 'red'}}>(Please note that using your bio for swearing, advertising, or harassment towards other players will result in a permanent revocation.)</ul>
    <br />

    <ul style={{fontSize: 18, color: '#aaaaff'}}>Read more at Swordbattle.io's <a className="primary-link" target="_blank" href="https://swordbattle.io/changelog.html">
new official changelog</a>!</ul>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
