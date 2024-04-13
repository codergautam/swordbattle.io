import './ChangelogModal.scss';

function ChangelogModal() {
  return (
    <div className="changelog">
    <h1 style={{fontSize: 30}}>Sunsetting swordbattle.io</h1>
    <p>We regret to announce that swordbattle.io will be discontinued soon. Thank you for your support and engagement over the years! The game servers will be shutdown within the next week.</p>
    <p>In the meantime, we encourage our community to get involved one last time. Show your creativity by designing your own game skins:</p>
    <a className="primary-link" target="_blank" href="https://iogames.forum/t/how-to-make-your-own-swordbattle-io-skin/585">
        Create your own skins to be added in the game!
    </a>
    <p>Stay tuned for more updates and future projects from our team.</p>
</div>

  );
}

export default ChangelogModal;
