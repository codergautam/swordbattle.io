# LordHank2 Revamp

This branch deliberately changes gameplay and server behavior without modifying the existing visual language, world map, or shop.

## Gameplay additions

- **Double-tap dash:** double-tap a movement key outside the safe zone for a short collision-phasing burst. Taking player damage interrupts it, and a cooldown prevents spam.
- **Kill streaks and bounties:** players on streaks build a server-calculated bounty. Eliminating them awards bonus coins and a small health recovery.
- **Assists:** recent contributors who dealt at least 12% of the victim's maximum health receive assist credit and a contribution-scaled coin award.
- **Revenge rewards:** eliminating the player who last eliminated you grants a modest, capped coin bonus.
- **Anti-farming:** repeatedly eliminating the same identity inside two minutes sharply reduces all extra combat rewards, reaching zero on the fourth rapid repeat.
- **Combat commands:** `/help`, `/stats`, `/dash`, `/bounty`, and `/players` expose the new systems through the existing chat channel.

## Reliability and abuse resistance

- Input packets are capped and unknown input IDs are ignored.
- Angles are normalized, including a valid zero angle.
- Mouse force is bounded to the strength the movement code actually supports.
- Chat and command responses have separate server-side cooldowns.
- Health rejects negative, non-finite, post-death, and overkill mutations.
- The server package now has a Node-native automated test suite covering the new systems.

## Protected surfaces

The revamp does not modify:

- files in `client/public/assets`
- client rendering, HUD styling, animation, or sound code
- `server/src/game/maps`, `server/src/game/biomes`, `server/src/game/entities/mapObjects`, or `server/src/game/GameMap.js`
- cosmetics data or shop components/services

The existing GPL-3.0 license and attribution remain intact.
