import './ConnectionError.scss';

export default function ConnectionError({ reason = 'Connection failed' }: any) {
  const reload = () => window.location.reload();
  return (
    <div className="content">
      <h2>Oops!</h2>
      <p>Server disconnected: {reason}</p>
      <a>Please reload the page</a>
      <button onClick={reload}>
        Reload
      </button>
    </div>
  );
}
