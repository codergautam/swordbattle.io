import { useEffect, useRef, useState } from 'react';
import api from '../../api';
import './ProfileModal.scss';

function abbrNumber(n: number | string) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) {
    const v = +(num / 1_000_000).toFixed(1);
    return (v % 1 === 0 ? v.toFixed(0) : v.toString()) + 'm';
  }
  if (num >= 1_000) {
    const v = +(num / 1_000).toFixed(1);
    return (v % 1 === 0 ? v.toFixed(0) : v.toString()) + 'k';
  }
  return num.toString();
}

function timeSinceShort(dateLike?: string | Date | null) {
  if (!dateLike) return 'unknown';
  const d = new Date(dateLike).getTime();
  if (isNaN(d)) return 'unknown';
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '<1min';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

interface ProfileModalProps {
  username?: string;
  isOwnProfile?: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ username, isOwnProfile }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [profileTitle, setProfileTitle] = useState(isOwnProfile ? 'Your Profile' : 'Profile');

  const [usernameSearch, setUsernameSearch] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!usernameSearch || usernameSearch.trim().length === 0) {
      setSearchSuggestions([]);
      setSearching(false);
      return;
    }
    const q = usernameSearch.trim();
    setSearching(true);
    const timeout = setTimeout(() => {
      api.post(`${api.endpoint}/profile/search?${Date.now()}`, { q, limit: 25 }, (res: any) => {
        if (!Array.isArray(res)) {
          setSearchSuggestions([]);
          setSearching(false);
          return;
        }
        setSearchSuggestions(res.slice(0, 25));
        setSearching(false);
      });
    }, 250);
    return () => {
      clearTimeout(timeout);
      setSearching(false);
    };
  }, [usernameSearch]);

  const navigateToProfile = (user: string) => {
    setShowSuggestions(false);
    setUsernameSearch('');
    if (iframeRef.current) {
      iframeRef.current.src = `#/profile?username=${encodeURIComponent(user)}&hideBack=true`;
    }
    if (username && user === username) {
      setProfileTitle('Your Profile');
    } else {
      setProfileTitle('Profile');
    }
  };

  const initialSrc = username
    ? `#/profile?username=${encodeURIComponent(username)}&hideBack=true`
    : '#/profile?hideBack=true';

  return (
    <div className="profile-modal">
      <div className="profile-modal-header">
        <h1 className='shop-title'>{profileTitle}</h1>
        <div className="profile-modal-search">
          <input
            type="text"
            placeholder="Search for players..."
            value={usernameSearch}
            onChange={(e) => { setUsernameSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="search-input"
            aria-label="Search usernames"
          />
          {showSuggestions && (
            <div className="search-suggestions">
              {usernameSearch.trim().length === 0 ? (
                <div className="suggestion-hint">Type to search usernames</div>
              ) : searching ? (
                <div className="suggestion-hint">Searching...</div>
              ) : searchSuggestions.length === 0 ? (
                <div className="suggestion-hint">No accounts found</div>
              ) : (
                searchSuggestions.map((s: any) => {
                  const u = s.username;
                  const createdAt = s.created_at ?? s.createdAt ?? null;
                  const lastSeen = s.last_seen ?? s.lastSeen ?? null;
                  const xp = s.xp ?? 0;
                  return (
                    <div
                      key={u}
                      className="search-suggestion"
                      onMouseDown={(ev) => { ev.preventDefault(); navigateToProfile(u); }}
                    >
                      <div className="suggestion-left">
                        <div className="suggestion-name">{u}</div>
                        <div className="suggestion-meta">
                          <span>Joined {timeSinceShort(createdAt)} ago</span>
                          {(() => {
                            const lastSeenText = timeSinceShort(lastSeen);
                            if (lastSeen && lastSeenText !== 'unknown') {
                              return <span>• Online {lastSeenText} ago</span>;
                            }
                            return null;
                          })()}
                          <span>• {xp >= 1_000_000 ? <strong>{abbrNumber(xp)} XP</strong> : `${abbrNumber(xp)} XP`}</span>
                        </div>
                      </div>
                      <div />
                    </div>
                  );
                })
              )}
              {!searching && searchSuggestions.length >= 25 && (
                <div className="search-more">... more results</div>
              )}
            </div>
          )}
        </div>
      </div>
      <iframe ref={iframeRef} title="Profile" src={initialSrc} width="100%" height="100%" style={{border: 'none'}}></iframe>
    </div>
  );
};

ProfileModal.displayName = 'ProfileModal';
export default ProfileModal;
