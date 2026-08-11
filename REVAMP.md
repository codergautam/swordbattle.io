# LordHank2 Revamp

This branch expands Swordbattle with hardened combat and networking, deterministic performance infrastructure, automatic zombie outbreaks, permanent Valor Crests, five new SVG evolution paths, smarter wildlife, and more social NPC players while preserving the existing world layout, shop, menus, cosmetics catalogs, and currency purchases.

## Pull request summary

This revamp adds double-tap dashing, assists, streak bounties, revenge rewards, anti-farming protections, safer health/input/chat/network handling, detailed tick/packet/event-loop/memory metrics, deterministic collision and snapshot benchmarks, and a 512-unit deterministic spatial grid; it also introduces automatic 20-zombie-per-player outbreaks with predictive dedicated AI, dynamic one-twentieth target health and coin scaling, existing undead artwork, minimap markers, persistent non-spendable Valor Crests and leaderboards, the Bishop, Phantom, Medic, Wraith, Seraph, and Arsenal evolution branches with additive SVG art, development-only outbreak/coin commands, 3-5-wolf boid packs that retain the original wolf stats, and full-health NPC-player alliances that chat, follow each other, share enemies, and prevent friendly fire, all without modifying the existing map data, shop, menus, cosmetics catalogs, or spendable-currency systems.

## Combat and player systems

- **Double-tap dash:** double-tap a movement key outside safety for a short collision-phasing burst. Player damage interrupts it and a cooldown prevents spam.
- **Streaks, bounties, assists, and revenge:** recent contributors receive scaled assist rewards, streaking players build capped bounties, eliminations provide a small heal, and defeating your previous killer grants a capped revenge reward.
- **Anti-farming:** repeated eliminations of the same identity inside two minutes sharply reduce extra rewards, reaching zero on the fourth rapid repeat.
- **Bishop evolution:** Knight can evolve into Bishop at level 12. Its center-mounted cannon automatically fires at the nearest valid player, NPC-player, or mob and cannot be disabled manually; activating Chakram Conclave hides the cannon for exactly five seconds while 36 rotating chakrams damage nearby enemies and block incoming sword throws.
- **Phantom and Wraith:** Stalker can become Phantom at level 24 and Wraith at the level-42 cap. Phase temporarily prevents attacking while granting damage and knockback immunity, then arms one timed ambush hit; entering safety cancels it without an ambush.
- **Medic and Seraph:** Archer can become Medic at level 18 and Seraph at level 42. Real players receive a strong self-heal, while NPC versions also share bounded healing with nearby living NPC teammates that have the same non-null team ID.
- **Arsenal:** Bishop can become Arsenal at level 42, upgrading cannon range, cadence, bolt power, and chakram damage while preserving Bishop's familiar cannon-off/chakram-on ability cycle.
- **Commands:** `/help`, `/stats`, `/dash`, `/bounty`, `/players`, `/event`, `/valor`, and `/valor top` expose the new systems through the existing chat channel.

## Zombie outbreaks and Valor Crests

- Outbreaks automatically schedule after 12-18 minutes of eligible active play, provide a 20-second warning, suspend ordinary bots/mobs, and time out after eight minutes.
- Every eligible player receives one capacity-safe 1,200-unit ring containing 16 Real Zombies, 3 Nightlurkers, and 1 Bone Dragon; late joiners and players leaving shelter receive exactly one deferred ring.
- Dedicated zombie AI runs staggered decisions with target leading, strafing, obstacle response, group spacing, projectile dodging, and 25%/35% retreat hysteresis.
- Each zombie dynamically mirrors one-twentieth of its current target's maximum health and floored coin total without leveling, evolving, entering the player leaderboard, or dropping spendable currency.
- Zombies use the repository's previously unreferenced undead body/sword artwork and appear as dedicated green minimap dots.
- Qualifying signed-in contributors earn permanent, non-spendable Valor Crests through a transactional, idempotent API ledger; profile and top-ten reads power `/valor` and `/valor top`.
- A new additive shield-and-crossed-swords Crest SVG and count appear below existing nametags only when the count is greater than zero.

## Wildlife and NPC players

- Wolves spawn in 3-5-member packs and use boid separation, alignment, cohesion, and shared aggro while retaining their original 75 maximum health and 22 base speed.
- Two nearby NPC players can form a two-member alliance only while both are at full health. They communicate through existing chat bubbles, follow one another, share combat targets, ignore each other when choosing rivals, prevent friendly fire, and disband when a teammate is removed.

## Development tools

- `/admin outbreak` immediately summons an outbreak when one is not already active.
- `/admin coins <amount>` grants the issuing real player between 1 and 10,000,000 coins through the normal level system.
- `/admin help` lists the development commands.
- The complete admin command handler fails closed unless `NODE_ENV=development`; production does not recognize or execute these commands.

## Reliability and abuse resistance

- Input packets are capped, unknown input IDs are ignored, angles are normalized, and mouse force is bounded.
- Chat and commands have server-side cooldowns and length limits.
- Health rejects negative, non-finite, post-death, and overkill mutations.
- Client message limits use wall time instead of tick counts, queues are bounded, and malformed-message accounting is independent of server TPS.

## Performance and replication

- The old runtime Quadtree was replaced by an API-compatible `WorldIndex` with 512-unit cells, separate static/dynamic buckets, exact AABB filtering, query deduplication, incremental membership updates, and stable entity-ID ordering.
- `/serverinfo` reports tick phases, packet-size totals, drops, event-loop delay percentiles, process memory, and uptime.
- Seeded collision and protocol snapshot benchmarks lock deterministic signatures; a five-minute synthetic outbreak soak covers 100 players and 2,000 zombies.
- Spectator full sync no longer sends static map objects twice, while ordinary player full sync behavior remains unchanged.

## Preserved surfaces

- Existing map definitions, biome files, static-map artwork, and world layout are unchanged.
- Existing shop code, menus, cosmetics catalogs, cosmetic ownership, and spendable-currency purchase mechanics are unchanged.
- Existing visual assets are unchanged; the branch only references previously unused zombie artwork and adds standalone Valor Crest, Bishop, Phantom, Medic, Wraith, Seraph, Arsenal, ability-effect, cannon, and chakram SVGs plus zombie minimap dots.
- Existing nametags, health bars, HUD panels, and minimap styling are not repositioned or restyled; additions are event-specific and additive.
- The existing GPL-3.0 license and attribution remain intact.

## Validation

- The Node server suite covers combat rewards, dashing, input/health hardening, rate limiting, performance metrics and benchmarks, spectator synchronization, `WorldIndex`, outbreak lifecycle and AI, target-scaled zombie health/coins, Bishop and Arsenal targeting/projectiles/chakram shielding, Phantom/Wraith phase safety, Medic/Seraph team healing, development-admin lockout, wolf packs/boids, and NPC-player alliances.
- API award tests verify transactional and idempotent Valor updates.
- The client production build completes successfully; its reported lint warnings predate these additions.
