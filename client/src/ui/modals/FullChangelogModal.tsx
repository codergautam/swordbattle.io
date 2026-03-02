import './FullChangelogModal.scss';

function FullChangelogModal() {
  return (
    <div className="full-changelog-modal">
      <div className="full-changelog-header">
      </div>
      <iframe title="Changelog" src="/changelog.html" width="100%" height="100%" style={{border: 'none', borderRadius: '0'}}></iframe>
    </div>
  );
}

FullChangelogModal.displayName = 'FullChangelogModal';
export default FullChangelogModal;
