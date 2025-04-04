import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30, color: 'white'}}>What's new? (March 2025)</h1>
    <h1 style={{fontSize: 30, color: 'lime'}}>Spring Update (Part 1)</h1>
    <ul style={{fontSize: 19, color: '#55ff55'}}>- New Flower Forest and Acid Rock biomes!</ul>
    <ul style={{fontSize: 19, color: '#55ff55'}}>- Green chests are now giant and drop up to 20k coins!</ul>
    <ul style={{fontSize: 19, color: '#55ff55'}}>- Being under trees now speeds you up, and all evolutions have been balanced!</ul>
    <ul style={{fontSize: 19, color: '#55ff55'}}>- SPRING SKIN SALE! Save thousands of gems on spring skins during the event!</ul>
    <ul style={{fontSize: 19, color: '#aaffaa'}}>- New "secret" evolution: Stalker! (Hint: to get it, don't pick any other evolutions)</ul>
    <br></br>
    <ul style={{fontSize: 19, color: 'yellow'}}>- Part 2 coming soon, bringing even bigger event changes!</ul>
    <p style={{fontSize: 17, color: 'lightblue'}}>Join the <a href="https://discord.com/invite/9A9dNTGWb9" className="primary-link" target="_blank" rel="nofollow">Swordbattle.io Discord Server</a> to learn more about the spring event on the full changelog!</p>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!

<li className='announcement'>NOTE: The game is currently being tested for bugfixes. Expect the possibility disconnects/server restarts.</li>
</a> */

export default ChangelogModal;
