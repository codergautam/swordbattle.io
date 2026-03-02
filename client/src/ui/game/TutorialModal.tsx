import { useEffect, useState, useCallback } from 'react';
import { crazygamesSDK } from '../../crazygames/sdk';
import './TutorialModal.scss';

const alwaysShow = false; // for dev

const storageKey = 'swordbattle:tutorialSeen';

const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

interface TutorialPage {
  content: JSX.Element;
}

function buildPages(mobile: boolean, isCrazygames: boolean, fromMenu?: boolean): TutorialPage[] {
  const pages: TutorialPage[] = [
    {
      content: (
        <>
          <p className="tutorial-heading">Welcome to Swordbattle.io!</p>
          {mobile ? (
            <p>
              <span className="hl-yellow">Tap</span> to swing your sword, and
              press the <span className="hl-yellow">Throw button</span> to throw
              your sword.
            </p>
          ) : (
            <p>
              Press <span className="hl-yellow">Space</span> or{' '}
              <span className="hl-yellow">Left Click</span> to swing your sword,
              and press <span className="hl-yellow">Right Click</span> or{' '}
              <span className="hl-yellow">C</span> to throw your sword.
            </p>
          )}
          <p>
            Collect <span className="hl-gold">coins</span> from{' '}
            <span className="hl-red">stabbing players</span>,{' '}
            <span className="hl-green">hunting mobs</span>, or{' '}
            <span className="hl-blue">breaking chests</span> to become larger
            and stronger! Collecting enough coins unlocks{' '}
            <span className="hl-cyan">upgrades</span> and{' '}
            <span className="hl-purple">Evolutions</span>, so collect as many coins as you can!
          </p>
          <img className="tutorial-image" src="/assets/tutorialPage1.png" alt="Welcome" />
        </>
      ),
    },

    {
      content: (
        <>
          <p className="tutorial-heading">Evolutions</p>
          <p>
            Collect at least{' '}
            <span className="hl-gold">1,000 coins</span> to choose your first{' '}
            <span className="hl-purple">Evolution</span>! Evolutions change your
            stats to be better in certain ways, and later tiers of Evolutions
            can even give you{' '}
            <span className="hl-cyan">unique modifiers</span> that do special
            things!
          </p>
          <p>
            Each Evolution also comes with a{' '}
            <span className="hl-yellow">special ability</span> that can be
            activated with{' '}
            {mobile ? (
              <span className="hl-yellow">the ability button</span>
            ) : (
              <span className="hl-yellow">G or the ability button</span>
            )}
            , changing your stats or doing a special move, and can give you the
            advantage in fights or other situations.
          </p>
          <img className="tutorial-image" src="/assets/tutorialPage2.png" alt="Evolutions" />
        </>
      ),
    },

    {
      content: (
        <>
          <p className="tutorial-heading">Getting Coins Fast</p>
          <p>
            The easiest way to get coins quickly is to find{' '}
            <span className="hl-blue">chests</span> around the map. Chests spawn
            in various rarities, from small chests giving only{' '}
            <span className="hl-gold">50 coins</span> to giant chests that can
            drop over <span className="hl-gold">10,000 coins</span>!
          </p>
          <p>
            You can also hunt down <span className="hl-green">mobs</span> in the
            biomes throughout the map to earn some quick coins. The 3 main
            biomes (<span className="hl-green">Forest</span>,{' '}
            <span className="hl-blue">Snow</span>, and{' '}
            <span className="hl-red">Lava</span> biome, as seen in the minimap
            at the bottom-right) also contain{' '}
            <span className="hl-purple">special bosses</span>, which drop{' '}
            <span className="hl-gold">TONS of coins</span>, but are hard to kill
            and shoot deadly projectiles!
          </p>
          <img className="tutorial-image" src="/assets/tutorialPage3.png" alt="Getting Coins" />
        </>
      ),
    },

    {
      content: (
        <>
          <p className="tutorial-heading">Basic Strategies</p>
          <p>
            <span className="hl-yellow">Stand back</span> when throwing your
            sword at other players, as it disables your swing attack for a
            couple seconds.
          </p>
          <p>
            Biomes can also be used to your advantage, like the{' '}
            <span className="hl-blue">River biome</span> increasing your
            movement speed, or hitting enemies into the{' '}
            <span className="hl-red">Lava Pools</span> of the lava biome to
            burn them!
          </p>
          <p>
            You should also <span className="hl-red">stay away from bosses</span>{' '}
            when fighting players, and don&apos;t be afraid to{' '}
            <span className="hl-green">run away</span> if you don&apos;t want to
            fight!
          </p>
          <img className="tutorial-image" src="/assets/tutorialPage4.png" alt="Strategies" />
        </>
      ),
    },

    ...(isCrazygames
      ? []
      : [
          {
            content: (
              <>
                <p className="tutorial-heading">Saving Progress</p>
                <p>
                  Back at the main menu, you can create an account through the{' '}
                  <span className="hl-cyan">&quot;Sign Up!&quot;</span> button.
                  Having an account gives many perks, like{' '}
                  <span className="hl-yellow">saving your games</span>,
                  collecting <span className="hl-purple">Gems</span> that you
                  can spend on cool skins, and even getting on the{' '}
                  <span className="hl-gold">Rankings</span> tab with enough
                  dedication!
                </p>
                <p>
                  You can also enable other things like the{' '}
                  <span className="hl-cyan">chat</span> through the settings in
                  the main menu.
                </p>
                <img className="tutorial-image" src="/assets/tutorialPage5.png" alt="Saving Progress" />
              </>
            ),
          },
        ]),

    ...(fromMenu
      ? []
      : [
          {
            content: (
              <>
                <p className="tutorial-heading tutorial-ready">
                  You&apos;re ready to play the game!
                </p>
                <p>
                  Close this tab and leave the safezone to start collecting coins and
                  fighting other players!
                </p>
                <p className="tutorial-tip">
                  (Tip: go to the <span className="hl-green">Forest biome</span> at
                  the left to start, as it&apos;s the safest biome)
                </p>
              </>
            ),
          },
        ]),
  ];

  return pages;
}

function TutorialModal({ game, onClose, centered }: { game?: Phaser.Game | undefined; onClose: () => void; centered?: boolean }) {
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(false); // controls fade-in
  const [fadingOut, setFadingOut] = useState(false);

  const mobile = isMobile();
  const isCG = crazygamesSDK.shouldUseSDK();
  const [pages] = useState(() => buildPages(mobile, isCG, centered));
  const totalPages = pages.length;

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    if (centered && !alwaysShow) {
      try { localStorage.setItem(storageKey, '1'); } catch (_) {}
    }
  }, [centered]);

  // Auto-hide at 500 coins
  useEffect(() => {
    if (!game) return;
    const handler = (players: any[], selfId: number) => {
      const self = players.find((p: any) => p.id === selfId);
      if (self && self.coins >= 500) {
        dismiss();
      }
    };
    game.events.on('playersUpdate', handler);
    return () => { game.events.off('playersUpdate', handler); };
  }, [game]);

  const dismiss = useCallback(() => {
    if (fadingOut) return;
    setFadingOut(true);
    if (!alwaysShow) {
      try { localStorage.setItem(storageKey, '1'); } catch (_) {}
    }
    setTimeout(() => onClose(), 400);
  }, [fadingOut, onClose]);

  const prev = () => setPage((p) => Math.max(0, p - 1));
  const next = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  const isFirst = page === 0;
  const isLast = page === totalPages - 1;

  return (
    <div className={`tutorial-overlay ${visible && !fadingOut ? 'show' : ''} ${centered ? 'centered' : ''}`}>
      <div className="tutorial-modal">
        {/* Close button */}
        <button className="tutorial-close" onClick={dismiss} />

        {/* Header */}
        <div className="tutorial-title">Basic Tutorial</div>

        {/* Page content */}
        <div className="tutorial-body">{pages[page].content}</div>

        {/* Navigation */}
        <div className="tutorial-nav">
          <button
            className={`tutorial-nav-btn ${isFirst ? 'disabled' : ''}`}
            onClick={prev}
            disabled={isFirst}
          >
            &lsaquo;
          </button>
          <span className="tutorial-page-indicator">
            Page {page + 1} of {totalPages}
          </span>
          <button
            className={`tutorial-nav-btn ${isLast ? 'disabled' : ''}`}
            onClick={next}
            disabled={isLast}
          >
            &rsaquo;
          </button>
        </div>
      </div>
    </div>
  );
}

export function shouldShowTutorial(): boolean {
  if (alwaysShow) return true;
  try {
    return !localStorage.getItem(storageKey);
  } catch (_) {
    return false;
  }
}

TutorialModal.displayName = 'TutorialModal';
export default TutorialModal;
