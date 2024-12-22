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
    <br></br>
    <ul>(Credit to A-Bot, cool guy 53, and Battleship)</ul>
    <hr></hr>
    <h1 style={{fontSize: 25}}>Winter Event (Part 3)</h1>
    <li>- Reworked Evolutions! (P.S. - you can also press G to use your ability!)</li>
    <a className="primary-link" target="_blank" href="https://discord.com/invite/9A9dNTGWb9">- Join the Swordbattle Discord to give feedback on this update and help us improve it!</a>
</div>

  );
}

/* <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
Create your own skins to be added in the game!
</a> */

export default ChangelogModal;
