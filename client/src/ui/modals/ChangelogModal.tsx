import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'white'}}>What's new? (June 2025)</h1>
    <ul style={{fontSize: 22, color: '#ffffcc'}}>Team up with friends and create official alliances with other players using Swordbattle's new <span style={{color: '#ffff00'}}>Clan Tags!</span></ul>
  <ul style={{fontSize: 15, color: '#ffffee'}}>- Log in to your account, hover over your name in the top right, and click "Change Clan" to get your own!</ul>
  <ul style={{fontSize: 15, color: '#ffffee'}}>- This will be the only clan update for now, but clans will get more and more features later on!</ul>
      <ul style={{fontSize: 18, color: '#ff0000'}}> (Also fixed a bug where clan changes weren't allowed) </ul>
    <br></br>
     <ul style={{fontSize: 21, color: '#ff2222'}}>New boss: <span style={{color: '#aaaaaa'}}>Ancient Statue</span></ul>
  <ul style={{fontSize: 14, color: '#cccccc'}}>- Ancient Statues throw player-flinging boulders and sharp, rocky swords, and can ram into players to deal damage, too! They can be found in the forest biome.</ul>
  <ul style={{fontSize: 14, color: '#cccccc'}}>- Ancient Statues are weaker than the other bosses and drop less coins, but up to 3 can spawn at once!</ul>
    <br></br>
    <ul style={{fontSize: 20, color: '#ff00ff'}}>- 2 new skins and 2 new ultimate skins! More coming soon!</ul>
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
