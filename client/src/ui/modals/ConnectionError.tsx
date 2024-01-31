import './ConnectionError.scss';

export default function ConnectionError({ reason = 'Connection failed' }: any) {
  const reload = () => window.location.reload();
  return (
    <div className="panel content" style={{ zIndex: 100000 }}>
      <h2>Oops!</h2>
      <p>Server disconnected: {reason}</p>
      <p>Please try reconnecting.</p>
      <br/>
      <button className="reload-btn" onClick={reload}>
        Reconnect
      </button>
    </div>
  );
}
