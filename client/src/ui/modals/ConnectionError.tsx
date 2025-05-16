import './ConnectionError.scss';

export default function ConnectionError({ reason = 'Connection failed' }: any) {
  const reload = () => window.location.reload();
  return (
    <div className="panel content" style={{ zIndex: 100000 }}>
      <h2>Oops!</h2>
      <p>Server disconnected: {reason}</p>
      <p className='notification'>If help is needed restoring progress, save an image of this full page and email to <span style={{ color: 'yellow' }}>support@swordbattle.io</span></p>
      <p>If not, please try reconnecting.</p>
      <br/>
      <button className="reload-btn" onClick={reload}>
        Reconnect
      </button>
    </div>
  );
}
