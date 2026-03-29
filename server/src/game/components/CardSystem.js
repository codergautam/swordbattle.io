const { MinorCards, MajorCards, getCard, isMinorCard, isMajorCard, getAllMinorIds, getAllMajorIds, getMajorCardsByCategory } = require('./CardDefinitions');
const Types = require('../Types');
const api = require('../../network/api');

const pickTimeout = 20;
const tutorialPickTimeout = 45;

class CardSystem {
  constructor(player) {
    this.player = player;
    this.chosenCards = [];
    this.minorStacks = {};
    this.majorCards = [];
    this.cardOffers = [];
    this.choosingCard = false;
    this.cardTimer = 0;
    this.cardPickNumber = 0;
    this.pendingPicks = 0;

    this.instantSelect = false;
    this.availableUpgrades = 0;

    this.rerollsAvailable = 1;
    this.currentExcluded = [];
    this.hasRerolledThisPick = false;

    this.lastSkipResults = [];
    this.majorPicksSkipped = 0;

    this.isTutorial = false;
    this.tutorialRerollEveryPick = false;

    this.aggressionLastHitTime = 0;
    this.aggressionBoosted = false;

    this.accelHitBoosts = [];
    this.accelHitPenalties = [];

    this.armorHitTimes = [];
    this.armorDRActive = false;
    this.armorDRExpiry = 0;

    this.disengageBoostExpiry = 0;

    this.rejuvenationTimer = 0;

    this._trackingExpiry = 0;
    this._trackingSpeedMult = 1;

    this.insuranceUsed = false;

    this.doubleHitPending = false;
    this.doubleHitMissed = false;
  }

  hasMajor(cardId) {
    return this.majorCards.includes(cardId);
  }

  // Debug: log major card activations
  _debugLog(msg) {
    if (this.player.isBot) return;
    console.log(`[Cards ${this.player.name}] ${msg}`);
  }

  // ============ PICK SYSTEM ============

  queueCardPick() {
    // Bots: silently pick a random minor card, no freeze/UI
    if (this.player.isBot) {
      this._botAutoPickMinor();
      return;
    }

    if (this.isTutorial && this.instantSelect && this.cardPickNumber >= 2) {
      this.instantSelect = false;
      this._debugLog('Tutorial: switched to button mode after 2 instant picks');
    }

    if (this.instantSelect) {
      this.pendingPicks++;
      if (!this.choosingCard) {
        this.startCardPick();
      }
    } else {
      this.availableUpgrades++;
      this._debugLog(`Upgrade queued (availableUpgrades=${this.availableUpgrades})`);
    }
  }

  openCardSelect() {
    if (this.availableUpgrades <= 0) return;
    if (this.choosingCard) return;

    this.availableUpgrades--;
    this.pendingPicks++;
    this._debugLog(`openCardSelect: consumed 1 upgrade, available=${this.availableUpgrades}, pending=${this.pendingPicks}`);
    this.startCardPick();
  }

  _botAutoPickMinor() {
    const { getAllMinorIds } = require('./CardDefinitions');
    const allMinorIds = getAllMinorIds();
    const eligible = allMinorIds.filter(id => {
      const card = MinorCards[id];
      return (this.minorStacks[id] || 0) < card.max;
    });
    if (eligible.length === 0) return;
    const cardId = eligible[Math.floor(Math.random() * eligible.length)];
    this.minorStacks[cardId] = (this.minorStacks[cardId] || 0) + 1;
    this.chosenCards.push(cardId);
    this.cardPickNumber++;
  }

  startCardPick() {
    const offers = this.generateOffers();
    if (offers.length === 0) {
      this.pendingPicks = Math.max(0, this.pendingPicks - 1);
      return;
    }
    this.cardOffers = offers;
    this.choosingCard = true;
    this.hasRerolledThisPick = false;
    this.currentExcluded = [];
    this.lastSkipResults = [];

    if (this.instantSelect && this.isTutorial) {
      this.cardTimer = 999;
    } else if (this.isTutorial) {
      this.cardTimer = tutorialPickTimeout;
    } else {
      this.cardTimer = pickTimeout;
    }
    this._debugLog(`startCardPick: choosingCard=true, offers=[${offers}], timer=${this.cardTimer}`);
  }

  generateOffers() {
    const isMajorPick = this.cardPickNumber > 0 && (this.cardPickNumber + 1) % 5 === 0;
    if (isMajorPick) {
      return this.generateMajorOffers();
    }
    return this.generateMinorOffers();
  }

  generateMinorOffers(excludeIds = []) {
    const eligible = [];
    const allMinorIds = getAllMinorIds();

    for (const id of allMinorIds) {
      if (excludeIds.includes(id)) continue;
      const card = MinorCards[id];
      const stacks = this.minorStacks[id] || 0;
      if (stacks >= card.max) continue;

      let weight = 10;
      const categoryCounts = this.getCategoryCounts();
      const minCount = Math.min(...Object.values(categoryCounts), 999);
      if ((categoryCounts[card.category] || 0) === minCount) weight += 5;
      if (stacks < 2) weight += 3;
      if (stacks > 2) weight -= 3 * (stacks - 2);

      const sharpStabs = this.minorStacks[1] || 0;
      const quickSwing = this.minorStacks[2] || 0;
      const regenerate = this.minorStacks[6] || 0;
      const fastHeal = this.minorStacks[7] || 0;
      const sizeScale = this.minorStacks[13] || 0;
      if ((id === 1 || id === 2) && (sharpStabs + quickSwing) >= 3) weight -= 5;
      if ((id === 6 || id === 7) && (regenerate + fastHeal) >= 3) weight -= 5;
      if (id === 13 && sizeScale >= 2) weight -= 5;

      weight = Math.max(1, weight);
      eligible.push({ id, weight });
    }

    if (eligible.length === 0) return [];

    const picked = [];
    const remaining = [...eligible];
    for (let i = 0; i < 3 && remaining.length > 0; i++) {
      const totalWeight = remaining.reduce((sum, c) => sum + c.weight, 0);
      let roll = Math.random() * totalWeight;
      let chosen = remaining[0];
      for (const card of remaining) {
        roll -= card.weight;
        if (roll <= 0) { chosen = card; break; }
      }
      picked.push(chosen.id);
      const idx = remaining.findIndex(c => c.id === chosen.id);
      remaining.splice(idx, 1);
    }
    return picked;
  }

  generateMajorOffers() {
    const majorOrder = [
      ['swordsmanship'],
      ['throwing'],
      ['predator'],
      ['standGround', 'vampiric'],
      ['fortification'],
      ['prospector'],
      ['pacifism', 'beastSlayer'],
      ['endurance'],
    ];

    const majorPickIndex = this.majorCards.length + this.majorPicksSkipped;

    if (majorPickIndex >= majorOrder.length) {
      return this.generateMinorOffers();
    }

    const slot = majorOrder[majorPickIndex];
    const chosenCategory = slot[Math.floor(Math.random() * slot.length)];
    this._debugLog(`Major pick #${majorPickIndex + 1}: category=${chosenCategory} (from ${JSON.stringify(slot)})`);

    const allMajorIds = getAllMajorIds();
    const categoryCards = allMajorIds.filter(id => {
      const card = MajorCards[id];
      return card && card.category === chosenCategory;
    });

    if (categoryCards.length === 0) {
      return this.generateMinorOffers();
    }

    return categoryCards;
  }

  getCategoryCounts() {
    const counts = { offensive: 0, defensive: 0, utility: 0 };
    for (const [id, stacks] of Object.entries(this.minorStacks)) {
      const card = MinorCards[id];
      if (card && counts[card.category] !== undefined) counts[card.category] += stacks;
    }
    return counts;
  }

  rerollOffers() {
    if (!this.choosingCard) return;
    if (this.hasRerolledThisPick) return;
    if (!this.tutorialRerollEveryPick && this.rerollsAvailable <= 0) return;
    if (this.cardOffers.some(id => isMajorCard(id))) return;

    this.currentExcluded.push(...this.cardOffers);
    const newOffers = this.generateMinorOffers(this.currentExcluded);
    if (newOffers.length === 0) return;

    this.cardOffers = newOffers;
    this.hasRerolledThisPick = true;
    if (!this.tutorialRerollEveryPick) this.rerollsAvailable--;
    if (this.cardTimer < 900) {
      this.cardTimer = Math.min(this.cardTimer + 5, this.isTutorial ? tutorialPickTimeout : pickTimeout);
    }
    this._debugLog(`Rerolled: new offers=[${newOffers}], rerolls left=${this.rerollsAvailable}, timer=${this.cardTimer.toFixed(1)}`);
  }

  skipMajorCard() {
    if (!this.choosingCard) return;
    if (!this.cardOffers.some(id => isMajorCard(id))) return;

    const allMinorIds = getAllMinorIds();
    const upgradeable = allMinorIds
      .filter(id => {
        const card = MinorCards[id];
        return (this.minorStacks[id] || 0) < card.max;
      })
      .sort((a, b) => (this.minorStacks[a] || 0) - (this.minorStacks[b] || 0));

    const toUpgrade = upgradeable.slice(0, 3);
    if (toUpgrade.length === 0) return;

    this.lastSkipResults = [];
    for (const id of toUpgrade) {
      this.minorStacks[id] = (this.minorStacks[id] || 0) + 1;
      this.chosenCards.push(id);
      this.lastSkipResults.push(id);
      const card = MinorCards[id];
      this._debugLog(`Skip upgrade: ${card.name} → stack ${this.minorStacks[id]}`);
    }

    this.majorPicksSkipped++;
    this.cardPickNumber++;
    this._debugLog(`Skipped major card, upgraded ${toUpgrade.length} minors`);
    this.finishPick();
  }

  selectCard(cardId) {
    if (!this.choosingCard) return;
    if (!this.cardOffers.includes(cardId)) return;

    if (isMinorCard(cardId)) {
      const card = MinorCards[cardId];
      const stacks = this.minorStacks[cardId] || 0;
      if (stacks >= card.max) return;
      this.minorStacks[cardId] = stacks + 1;
      this._debugLog(`Selected minor: ${card.name} (stack ${stacks+1}/${card.max}, mult=${this.getMultiplier(cardId).toFixed(3)})`);
    } else if (isMajorCard(cardId)) {
      this.majorCards.push(cardId);
      this.rerollsAvailable++; // +1 reroll after picking a major
      const card = MajorCards[cardId];
      this._debugLog(`Selected MAJOR: ${card.name} (${card.category}), rerolls now=${this.rerollsAvailable}`);
    }

    this.chosenCards.push(cardId);
    this.cardPickNumber++;
    this._debugLog(`Pick #${this.cardPickNumber}, pending=${this.pendingPicks-1}`);

    try {
      const card = getCard(cardId);
      const accountId = this.player.client?.account?.id;
      api.post('/analytics/upgrade-select', {
        card_id: cardId,
        card_name: card?.name || String(cardId),
        is_major: isMajorCard(cardId),
        card_pick_number: this.cardPickNumber,
        evolution: this.player.evolutions?.evolution || 0,
        coins: this.player.levels?.coins || 0,
        level: this.player.levels?.level || 0,
        minor_stacks: JSON.stringify(this.minorStacks),
        major_cards: JSON.stringify(this.majorCards),
        account_id: accountId || null,
      });
    } catch (e) {
    }

    this.finishPick();
  }

  finishPick() {
    this.choosingCard = false;
    this.cardOffers = [];
    this.cardTimer = 0;
    this.pendingPicks = Math.max(0, this.pendingPicks - 1);
    this._debugLog(`finishPick: choosingCard=false, pendingPicks=${this.pendingPicks}`);
    if (this.pendingPicks > 0) {
      this._nextPickPending = true;
    }
  }

  cancelPick() {
    if (!this.choosingCard) return;
    this.choosingCard = false;
    this.cardOffers = [];
    this.cardTimer = 0;
    this.pendingPicks = 0;
  }

  update(dt) {
    if (this.choosingCard) {
      this.cardTimer -= dt;
      if (this.cardTimer <= 0) {
        const randomCard = this.cardOffers[Math.floor(Math.random() * this.cardOffers.length)];
        this.selectCard(randomCard);
      }
    }

    if (this._nextPickPending && !this.choosingCard) {
      this._nextPickPending = false;
      if (this.pendingPicks > 0) {
        this.startCardPick();
      }
    }

    const now = Date.now();

    if (!this._lastStatsDump) this._lastStatsDump = 0;
    if (now - this._lastStatsDump > 5000 && this.chosenCards.length > 0) {
      this._lastStatsDump = now;
      const p = this.player;
      const stats = [];
      stats.push(`HP: ${(p.health.percent*100).toFixed(0)}%`);
      stats.push(`Speed: ${p.speed.value.toFixed(0)}`);
      stats.push(`Dmg: ${p.sword.damage.value.toFixed(1)}`);
      stats.push(`KB: ${p.sword.knockback.value.toFixed(0)}`);
      stats.push(`Regen: ${p.health.regen.value.toFixed(2)}`);
      stats.push(`RegenWait: ${p.health.regenWait.value.toFixed(0)}ms`);
      stats.push(`CoinMult: ${p.coinMultiplier.toFixed(2)}`);
      stats.push(`ThrowDmg: ${p.throwDamageMultiplier.toFixed(2)}`);
      stats.push(`DR: ${p.damageReduction.toFixed(2)}`);
      if (this.majorCards.length > 0) {
        const majorNames = this.majorCards.map(id => MajorCards[id]?.name || id);
        stats.push(`Majors: [${majorNames.join(', ')}]`);
      }
      if (this.hasMajor(103)) stats.push(`Aggression: ${this.aggressionLastHitTime > 0 ? ((now - this.aggressionLastHitTime)/1000).toFixed(1) + 's ago' : 'idle'}`);
      if (this.hasMajor(112)) stats.push(`Accel: +${this.accelHitBoosts.length}/-${this.accelHitPenalties.length}`);
      if (this.hasMajor(117)) stats.push(`Armor: ${this.armorDRActive ? 'ACTIVE' : 'off'} (${this.armorHitTimes.length} hits)`);
      if (this.hasMajor(116)) stats.push(`Rejuv: ${this.rejuvenationTimer.toFixed(1)}s`);
      if (this.hasMajor(118)) stats.push(`Disengage: ${now < this.disengageBoostExpiry ? 'BOOSTED' : 'off'}`);
      this._debugLog(`STATS: ${stats.join(' | ')}`);
    }

    // Acceleration: expire old boosts/penalties
    this.accelHitBoosts = this.accelHitBoosts.filter(b => now < b.expiry);
    this.accelHitPenalties = this.accelHitPenalties.filter(b => now < b.expiry);

    if (this.armorDRActive && now > this.armorDRExpiry) {
      this.armorDRActive = false;
    }
    this.armorHitTimes = this.armorHitTimes.filter(t => now - t < 5000);

    if (this.hasMajor(116)) {
      const lastDmg = this.player.health.lastDamage || 0;
      this.rejuvenationTimer = (now - lastDmg) / 1000;
    }
  }

  getMultiplier(cardId) {
    const stacks = this.minorStacks[cardId] || 0;
    if (stacks === 0) return 1;
    const card = MinorCards[cardId];
    if (!card) return 1;
    let sum = 0;
    for (let i = 0; i < stacks; i++) {
      sum += card.values[i];
    }
    return 1 + sum;
  }

  applyCardEffects() {
    const p = this.player;

    const cardDmg = this.getMultiplier(1);
    p.sword.damage.multiplier *= Math.min(cardDmg, 1.60);
    const qsm = this.getMultiplier(2);
    if (qsm !== 1) p.sword.swingDuration.multiplier['cards'] = 1 / Math.min(qsm, 1.35);
    const hhm = this.getMultiplier(3);
    if (hhm !== 1) p.sword.knockback.multiplier['cards'] = Math.min(hhm, 1.40);
    p.throwDamageMultiplier *= Math.min(this.getMultiplier(4), 1.50);
    p.health.max.multiplier *= Math.min(this.getMultiplier(5), 1.50);
    p.health.regen.multiplier *= Math.min(this.getMultiplier(6), 1.60);
    const fhm = this.getMultiplier(7);
    if (fhm !== 1) p.health.regenWait.multiplier *= (1 / Math.min(fhm, 1.40));
    p.knockbackResistance.multiplier *= Math.min(this.getMultiplier(8), 1.40);
    p.speed.multiplier *= Math.min(this.getMultiplier(9), 1.30);
    p.coinMultiplier *= this.getMultiplier(10);
    const vm = this.getMultiplier(11);
    if (vm !== 1) p.viewport.zoom.multiplier *= (1 / vm);
    const tpm = this.getMultiplier(12);
    if (tpm !== 1) p.sword.flyCooldown.multiplier *= (1 / Math.min(tpm, 1.35));
    const sm = this.getMultiplier(13);
    if (sm !== 1) p.shape.setScale(Math.min(sm, 1.15));

    const now = Date.now();

    if (this.hasMajor(101)) {
      p.sword.swingArc = -Math.PI / 2;
      p.sword.knockback.multiplier['cleave'] = 0.75;
    }

    if (this.hasMajor(103)) {
      const timeSinceHit = this.aggressionLastHitTime > 0 ? (now - this.aggressionLastHitTime) : Infinity;
      if (timeSinceHit < 2000) {
        p.sword.damage.multiplier *= 1.5;
        this.aggressionBoosted = true;
      } else if (timeSinceHit < 3000) {
        p.sword.damage.multiplier *= 0.75;
        this.aggressionBoosted = false;
      } else {
        this.aggressionBoosted = false;
      }
    }

    if (this.hasMajor(104)) {
      if (p.sword.isFlying) {
        p.sword.damage.multiplier *= 0.7;
      }
      p.sword.flyCooldown.multiplier *= 1.25;
    }

    if (this.hasMajor(105)) {
      p.sword.flyDuration.multiplier *= 0.7;
      if (p.sword.isFlying) {
        p.sword.damage.multiplier *= 0.65;
      }
    }

    // 106 Spare Sword: can melee while throwing, -25% throw speed
    if (this.hasMajor(106)) {
      p.sword.flySpeed.multiplier *= 0.75;
    }

    // --- Predator ---
    // 107 Finisher: +25% vs <40% HP, -10% vs >40% (applied in onHitEntity)
    // 108 Regensteal: hits reduce regen wait by 0.5s, -25% regen rate
    if (this.hasMajor(108)) {
      p.health.regen.multiplier *= 0.75;
    }

    // 109 Boxer: -50% throw damage/knockback taken (applied in onDamaged)
    // Also affects own throws (applied in applyCardEffects for throw)
    if (this.hasMajor(109) && p.sword.isFlying) {
      p.throwDamageMultiplier *= 0.5;
      p.sword.knockback.multiplier['boxer'] = 0.5;
    }

    // --- Stand Ground ---
    // 110 Tracking: speed matching on hit (handled in onDamaged)
    if (this.hasMajor(110) && this._trackingExpiry && now < this._trackingExpiry) {
      p.speed.multiplier = this._trackingSpeedMult || 1; // Override speed to matched value
    }

    // 111 Ensnare: self -10% speed permanently (slow on hit handled in onHitEntity)
    if (this.hasMajor(111)) {
      p.speed.multiplier *= 0.90;
    }

    // 112 Acceleration: +5% per hit dealt (2s), -5% per hit taken (2s)
    if (this.hasMajor(112)) {
      const boostCount = this.accelHitBoosts.length;
      const penaltyCount = this.accelHitPenalties.length;
      if (boostCount > 0) p.speed.multiplier *= (1 + 0.05 * boostCount);
      if (penaltyCount > 0) p.speed.multiplier *= (1 - 0.05 * penaltyCount);
    }

    // --- Vampiric ---
    // 113 Vampire Aspect: -8% max HP (heal on hit handled in onHitEntity)
    if (this.hasMajor(113)) {
      p.health.max.multiplier *= 0.92;
    }

    // 114 Soul Harvest: -15% regen (full heal on kill handled in onKill)
    if (this.hasMajor(114)) {
      p.health.regen.multiplier *= 0.85;
    }

    // 115 Blood Frenzy: <35% HP: +25% dmg, +5% spd; >80% HP: -10% dmg
    if (this.hasMajor(115)) {
      if (p.health.percent < 0.35) {
        p.sword.damage.multiplier *= 1.25;
        p.speed.multiplier *= 1.05;
      } else if (p.health.percent > 0.80) {
        p.sword.damage.multiplier *= 0.90;
      }
    }

    // --- Fortification ---
    // 116 Rejuvenation: regen ramps over time (up to 3x after ~10s), -25% base regen
    if (this.hasMajor(116)) {
      p.health.regen.multiplier *= 0.75;
      const ramp = Math.min(3, 1 + (this.rejuvenationTimer / 10) * 2);
      p.health.regen.multiplier *= ramp;
    }

    // 117 Adaptive Armor: 30% DR when active, -10% damage during DR
    if (this.hasMajor(117) && this.armorDRActive) {
      p.damageReduction *= 0.70; // 30% DR
      p.sword.damage.multiplier *= 0.90;
    }

    // 118 Disengage: +25% speed for 2s after hit, -35% damage while boosted
    if (this.hasMajor(118) && now < this.disengageBoostExpiry) {
      p.speed.multiplier *= 1.25;
      p.sword.damage.multiplier *= 0.65;
    }

    // --- Prospector ---
    // 119 Midas Touch: +35% gold, +25% damage taken
    if (this.hasMajor(119)) {
      p.coinMultiplier *= 1.35;
      p.damageReduction *= 1.25; // Takes 25% MORE damage
    }

    // 120 Chest Keys: double chest damage
    if (this.hasMajor(120)) {
      p.chestDamageMultiplier *= 2.0;
    }

    // 121 Scavenger: ground coins = 50 (handled in Coin.js), -10% chest coins
    // Chest coin reduction handled in onChestDestroy or Chest.js

    // --- Pacifism ---
    // 122 Ceasefire: nearby players -25% damage both ways (applied in damage calc)
    // Just sets a flag; damage reduction checked in Sword.js processTargetsCollision

    // 123 PvE Master: +25% chest damage
    if (this.hasMajor(123)) {
      p.chestDamageMultiplier = 1.25;
    }

    // 124 Tank Shell: +25% DR, -50% knockback dealt
    if (this.hasMajor(124)) {
      p.damageReduction *= 0.75; // 25% DR
      p.sword.knockback.multiplier['tankShell'] = 0.5;
    }

    // --- Beast Slayer ---
    // 125 Hunting Instinct: +40% vs mobs, +20% mob gold, -25% vs players
    // Applied in onHitEntity based on target type

    // 126 Butcherer: mobs don't aggro (checked in mob damaged()), -50% knockback vs mobs
    // Knockback handled in onHitEntity

    // 127 Boss Hunter: +25% boss damage, -80% vs mobs, bosses +15% to player
    // Applied in onHitEntity

    // --- Endurance ---
    // 128 Fortress: +1% DR per 100k gold (max 35%), -20% player damage
    if (this.hasMajor(128)) {
      const gold = p.levels.coins;
      const drPercent = Math.min(0.35, Math.floor(gold / 100000) * 0.01);
      if (drPercent > 0) p.damageReduction *= (1 - drPercent);
      p.sword.damage.multiplier *= 0.80;
    }

    // 129 Regeneration Mastery: near-instant regen start, -50% regen rate
    if (this.hasMajor(129)) {
      p.health.regenWait.multiplier *= 0.001; // Near-zero wait (avoid multiplying to exactly 0)
      p.health.regen.multiplier *= 0.50;
    }

    // 130 Insurance: on death keep 40% gold (handled in onDeath)

    // === ANTI-SYNERGY: diminish when stacking offense + defense too heavily ===
    // Count offensive stacks (damage, attack speed, knockback, throw damage)
    const offStacks = (this.minorStacks[1]||0) + (this.minorStacks[2]||0) + (this.minorStacks[3]||0) + (this.minorStacks[4]||0);
    // Count defensive stacks (HP, regen, regen cooldown, KB resist)
    const defStacks = (this.minorStacks[5]||0) + (this.minorStacks[6]||0) + (this.minorStacks[7]||0) + (this.minorStacks[8]||0);
    // If both offense and defense are heavily stacked (6+ each), diminish both by 15%
    if (offStacks >= 6 && defStacks >= 6) {
      p.sword.damage.multiplier *= 0.85;
      p.health.max.multiplier *= 0.85;
      p.health.regen.multiplier *= 0.85;
    }
  }

  // ============ EVENT HOOKS (called from Player.js / Sword.js) ============

  // Called when this player's sword hits an entity
  onHitEntity(entity, damage, isThrown) {
    const now = Date.now();
    const targetName = entity.name || entity.type;

    let dmgMult = 1;
    if (this.hasMajor(107) && entity.health) {
      let bonus = 1;
      if (entity.health.percent < 0.40) bonus = 1.25;
      else if (entity.health.percent > 0.80) bonus = 0.85;
      dmgMult *= bonus;
      this._debugLog(`Finisher: target ${targetName} at ${(entity.health.percent*100).toFixed(0)}% HP → ${bonus}x`);
    }

    if (this.hasMajor(113) && !isThrown && entity.type === Types.Entity.Player) {
      const heal = damage * 0.10;
      this.player.health.gain(heal);
      this._debugLog(`Vampire Aspect: healed ${heal.toFixed(1)} from melee hit on ${targetName}`);
    }

    if (this.hasMajor(108)) {
      this.player.health.lastDamage = Math.max(0, (this.player.health.lastDamage || 0) - 500);
      this._debugLog(`Regensteal: reduced regen wait by 0.5s`);
    }

    if (this.hasMajor(103) && this.aggressionBoosted) {
      this.aggressionLastHitTime = 0;
      this._debugLog(`Aggression: consumed boost on hit`);
    }

    if (this.hasMajor(112)) {
      this.accelHitBoosts.push({ expiry: now + 2000 });
      this._debugLog(`Acceleration: +5% speed boost (${this.accelHitBoosts.length} active)`);
    }

    if (this.hasMajor(111) && entity.type === Types.Entity.Player && typeof entity.addEffect === 'function') {
      try {
        entity.addEffect(Types.Effect.Slow, `ensnare_${this.player.id}`, {
          duration: 3,
          slowMultiplier: 0.93,
        });
        this._debugLog(`Ensnare: slowed ${targetName} by 7%`);
      } catch (e) {}
    }

    if (this.hasMajor(125)) {
      const isMob = Types.Groups.Mobs.includes(entity.type);
      if (isMob) {
        dmgMult *= 1.40;
        this._debugLog(`Hunting Instinct: +40% vs mob ${targetName}`);
      } else if (entity.type === Types.Entity.Player) {
        dmgMult *= 0.75;
        this._debugLog(`Hunting Instinct: -25% vs player ${targetName}`);
      }
    }

    if (this.hasMajor(127)) {
      const isBoss = [Types.Entity.Yeti, Types.Entity.Chimera, Types.Entity.Roku, Types.Entity.Ancient].includes(entity.type);
      const isMob = Types.Groups.Mobs.includes(entity.type);
      if (isBoss) {
        dmgMult *= 1.25;
        this._debugLog(`Boss Hunter: +25% vs boss ${targetName}`);
      } else if (isMob && !isBoss) {
        dmgMult *= 0.20;
        this._debugLog(`Boss Hunter: -80% vs mob ${targetName}`);
      }
    }

    if (dmgMult !== 1) {
      this._debugLog(`onHitEntity total dmgMult=${dmgMult.toFixed(2)} (thrown=${isThrown})`);
    }
    return dmgMult;
  }

  // Called when this player takes damage
  onDamaged(damage, attacker) {
    const now = Date.now();
    const attackerName = attacker?.name || attacker?.type || 'unknown';

    if (this.hasMajor(103)) {
      this.aggressionLastHitTime = now;
      this._debugLog(`Aggression: hit by ${attackerName}, boost window started`);
    }

    // 110 Tracking: match speed with attacker for 2s
    if (this.hasMajor(110) && attacker && attacker.speed) {
      const mySpeed = this.player.speed.value;
      const theirSpeed = attacker.speed.value;
      if (theirSpeed > mySpeed) {
        // Attacker is faster: boost to their speed
        this._trackingSpeedMult = theirSpeed / this.player.speed.baseValue;
        this._debugLog(`Tracking: boosted to ${theirSpeed.toFixed(0)} (attacker faster)`);
      } else {
        // We're faster: slow to their speed
        this._trackingSpeedMult = theirSpeed / this.player.speed.baseValue;
        this._debugLog(`Tracking: slowed to ${theirSpeed.toFixed(0)} (we're faster)`);
      }
      this._trackingExpiry = now + 2000;
    }

    this._debugLog(`onDamaged: ${damage.toFixed(1)} from ${attackerName}`);

    // 112 Acceleration: -5% speed for 2s per hit taken
    if (this.hasMajor(112)) {
      this.accelHitPenalties.push({ expiry: now + 2000 });
    }

    // 117 Adaptive Armor: track hits, activate DR if 3 hits in 5s
    if (this.hasMajor(117)) {
      this.armorHitTimes.push(now);
      const recentHits = this.armorHitTimes.filter(t => now - t < 5000);
      if (recentHits.length >= 3 && !this.armorDRActive) {
        this.armorDRActive = true;
        this.armorDRExpiry = now + 4000;
        this._debugLog(`Adaptive Armor: ACTIVATED (${recentHits.length} hits in 5s) → 30% DR for 4s`);
      }
    }

    // 118 Disengage: +25% speed for 2s after being hit
    if (this.hasMajor(118)) {
      this.disengageBoostExpiry = now + 2000;
      this._debugLog(`Disengage: +25% speed for 2s, -35% damage`);
    }

    // 109 Boxer: -50% damage from thrown swords
    // This is applied in the damage calculation, not here

    // 127 Boss Hunter: bosses deal +15% to player
    if (this.hasMajor(127) && attacker) {
      const isBoss = [Types.Entity.Yeti, Types.Entity.Chimera, Types.Entity.Roku, Types.Entity.Ancient].includes(attacker.type);
      if (isBoss) {
        this._debugLog(`Boss Hunter: taking +15% from boss ${attackerName}`);
        return 1.15;
      }
    }

    return 1.0;
  }

  // Called when this player kills another player
  onKill(killedEntity) {
    // 114 Soul Harvest: kill = full heal
    if (this.hasMajor(114) && killedEntity.type === Types.Entity.Player) {
      this.player.health.percent = 1;
      this._debugLog(`Soul Harvest: full heal on kill of ${killedEntity.name}`);
    }
  }

  // Called when player is about to die - returns gold to keep (0 = normal)
  onDeath() {
    // 130 Insurance: on death keep 40% gold, one-time use
    if (this.hasMajor(130) && !this.insuranceUsed) {
      this.insuranceUsed = true;
      const keptGold = Math.round(this.player.levels.coins * 0.40);
      this._debugLog(`Insurance: keeping ${keptGold} gold on death (one-time)`);
      return keptGold;
    }
    return 0;
  }

  // Returns knockback multiplier for hitting a specific entity
  getKnockbackMultiplier(entity) {
    let mult = 1;

    // 126 Butcherer: -50% knockback vs mobs
    if (this.hasMajor(126)) {
      const isMob = Types.Groups.Mobs.includes(entity.type);
      if (isMob) mult *= 0.5;
    }

    return mult;
  }

  // Returns damage reduction multiplier when taking damage from a specific source
  getDamageTakenMultiplier(attacker, isThrown) {
    let mult = 1;

    // 109 Boxer: -50% throw damage/knockback taken
    if (this.hasMajor(109) && isThrown) {
      mult *= 0.5;
    }

    // 122 Ceasefire: nearby players take -25% damage both ways
    if (this.hasMajor(122) && attacker && attacker.type === Types.Entity.Player) {
      const dx = this.player.shape.x - attacker.shape.x;
      const dy = this.player.shape.y - attacker.shape.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2000) mult *= 0.75;
    }

    return mult;
  }

  // Returns damage multiplier when dealing damage to a specific target
  getDamageDealtMultiplier(target) {
    let mult = 1;

    // 122 Ceasefire: nearby players deal -25% damage
    if (this.hasMajor(122) && target.type === Types.Entity.Player) {
      const dx = this.player.shape.x - target.shape.x;
      const dy = this.player.shape.y - target.shape.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2000) mult *= 0.75;
    }

    // 123 PvE Master: -50% coins from player kills (handled in death coin calc)

    return mult;
  }

}


module.exports = CardSystem;
