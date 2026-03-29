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

  queueCardPick() {
    if (this.player.isBot) {
      this._botAutoPickMinor();
      return;
    }

    if (this.isTutorial && this.instantSelect && this.cardPickNumber >= 2) {
      this.instantSelect = false;
    }

    if (this.instantSelect) {
      this.pendingPicks++;
      if (!this.choosingCard) {
        this.startCardPick();
      }
    } else {
      this.availableUpgrades++;
    }
  }

  openCardSelect() {
    if (this.availableUpgrades <= 0) return;
    if (this.choosingCard) return;

    this.availableUpgrades--;
    this.pendingPicks++;
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
    }

    this.majorPicksSkipped++;
    this.cardPickNumber++;
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
    } else if (isMajorCard(cardId)) {
      this.majorCards.push(cardId);
      this.rerollsAvailable++;
      const card = MajorCards[cardId];
    }

    this.chosenCards.push(cardId);
    this.cardPickNumber++;

    if (this.player.flags) {
      this.player.flags.set(Types.Flags.SelectUpgrade, true);
    }

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
    }

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
    if (vm !== 1) {
      const zoomReduction = 1 / vm;
      p.viewport.zoom.multiplier *= Math.max(zoomReduction, 0.65);
    }
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

    if (this.hasMajor(106)) {
      p.sword.flySpeed.multiplier *= 0.75;
    }

    if (this.hasMajor(108)) {
      p.health.regen.multiplier *= 0.75;
    }

    if (this.hasMajor(109) && p.sword.isFlying) {
      p.throwDamageMultiplier *= 0.5;
      p.sword.knockback.multiplier['boxer'] = 0.5;
    }

    if (this.hasMajor(110) && this._trackingExpiry && now < this._trackingExpiry) {
      p.speed.multiplier = this._trackingSpeedMult || 1;
    }

    if (this.hasMajor(111)) {
      p.speed.multiplier *= 0.90;
    }

    if (this.hasMajor(112)) {
      const boostCount = this.accelHitBoosts.length;
      const penaltyCount = this.accelHitPenalties.length;
      if (boostCount > 0) p.speed.multiplier *= (1 + 0.05 * boostCount);
      if (penaltyCount > 0) p.speed.multiplier *= (1 - 0.05 * penaltyCount);
    }

    if (this.hasMajor(113)) {
      p.health.max.multiplier *= 0.92;
    }

    if (this.hasMajor(114)) {
      p.health.regen.multiplier *= 0.85;
    }

    if (this.hasMajor(115)) {
      if (p.health.percent < 0.35) {
        p.sword.damage.multiplier *= 1.25;
        p.speed.multiplier *= 1.05;
      } else if (p.health.percent > 0.80) {
        p.sword.damage.multiplier *= 0.90;
      }
    }

    if (this.hasMajor(116)) {
      p.health.regen.multiplier *= 0.75;
      const ramp = Math.min(3, 1 + (this.rejuvenationTimer / 10) * 2);
      p.health.regen.multiplier *= ramp;
    }

    if (this.hasMajor(117) && this.armorDRActive) {
      p.damageReduction *= 0.70;
      p.sword.damage.multiplier *= 0.90;
    }

    if (this.hasMajor(118) && now < this.disengageBoostExpiry) {
      p.speed.multiplier *= 1.25;
      p.sword.damage.multiplier *= 0.65;
    }

    if (this.hasMajor(119)) {
      p.coinMultiplier *= 1.35;
      p.damageReduction *= 1.25;
    }

    if (this.hasMajor(120)) {
      p.chestDamageMultiplier *= 2.0;
    }

    if (this.hasMajor(123)) {
      p.chestDamageMultiplier = 1.25;
    }

    if (this.hasMajor(124)) {
      p.damageReduction *= 0.75;
      p.sword.knockback.multiplier['tankShell'] = 0.5;
    }

    if (this.hasMajor(128)) {
      const gold = p.levels.coins;
      const drPercent = Math.min(0.35, Math.floor(gold / 100000) * 0.01);
      if (drPercent > 0) p.damageReduction *= (1 - drPercent);
      p.sword.damage.multiplier *= 0.80;
    }

    if (this.hasMajor(129)) {
      p.health.regenWait.multiplier *= 0.001;
      p.health.regen.multiplier *= 0.50;
    }

    const offStacks = (this.minorStacks[1]||0) + (this.minorStacks[2]||0) + (this.minorStacks[3]||0) + (this.minorStacks[4]||0);
    const defStacks = (this.minorStacks[5]||0) + (this.minorStacks[6]||0) + (this.minorStacks[7]||0) + (this.minorStacks[8]||0);
    if (offStacks >= 6 && defStacks >= 6) {
      p.sword.damage.multiplier *= 0.85;
      p.health.max.multiplier *= 0.85;
      p.health.regen.multiplier *= 0.85;
    }
    const throwDmgStacks = this.minorStacks[4] || 0;
    const throwCdStacks = this.minorStacks[12] || 0;
    if (throwDmgStacks >= 3 && throwCdStacks >= 3) {
      p.throwDamageMultiplier *= 0.85;
      p.sword.flyCooldown.multiplier *= 1.15;
    }
  }

  onHitEntity(entity, damage, isThrown) {
    const now = Date.now();
    const targetName = entity.name || entity.type;

    let dmgMult = 1;
    if (this.hasMajor(107) && entity.health) {
      let bonus = 1;
      if (entity.health.percent < 0.40) bonus = 1.25;
      else if (entity.health.percent > 0.80) bonus = 0.85;
      dmgMult *= bonus;
    }

    if (this.hasMajor(113) && !isThrown && entity.type === Types.Entity.Player) {
      const heal = damage * 0.10;
      this.player.health.gain(heal);
    }

    if (this.hasMajor(108)) {
      this.player.health.lastDamage = Math.max(0, (this.player.health.lastDamage || 0) - 500);
    }

    if (this.hasMajor(103) && this.aggressionBoosted) {
      this.aggressionLastHitTime = 0;
    }

    if (this.hasMajor(112)) {
      this.accelHitBoosts.push({ expiry: now + 2000 });
    }

    if (this.hasMajor(111) && entity.type === Types.Entity.Player && typeof entity.addEffect === 'function') {
      try {
        entity.addEffect(Types.Effect.Slow, `ensnare_${this.player.id}`, {
          duration: 3,
          slowMultiplier: 0.93,
        });
      } catch (e) {}
    }

    if (this.hasMajor(125)) {
      const isMob = Types.Groups.Mobs.includes(entity.type);
      if (isMob) {
        dmgMult *= 1.40;
      } else if (entity.type === Types.Entity.Player) {
        dmgMult *= 0.75;
      }
    }

    if (this.hasMajor(127)) {
      const isBoss = [Types.Entity.Yeti, Types.Entity.Chimera, Types.Entity.Roku, Types.Entity.Ancient].includes(entity.type);
      const isMob = Types.Groups.Mobs.includes(entity.type);
      if (isBoss) {
        dmgMult *= 1.25;
      } else if (isMob && !isBoss) {
        dmgMult *= 0.20;
      }
    }

    return dmgMult;
  }

  onDamaged(damage, attacker) {
    const now = Date.now();
    const attackerName = attacker?.name || attacker?.type || 'unknown';

    if (this.hasMajor(103)) {
      this.aggressionLastHitTime = now;
    }

    if (this.hasMajor(110) && attacker && attacker.type === Types.Entity.Player && attacker.speed) {
      const mySpeed = this.player.speed.value;
      const theirSpeed = attacker.speed.value;
      if (theirSpeed > mySpeed) {
        this._trackingSpeedMult = theirSpeed / this.player.speed.baseValue;
      } else {
        this._trackingSpeedMult = theirSpeed / this.player.speed.baseValue;
      }
      this._trackingExpiry = now + 2000;
    }


    if (this.hasMajor(112)) {
      this.accelHitPenalties.push({ expiry: now + 2000 });
    }

    if (this.hasMajor(117)) {
      this.armorHitTimes.push(now);
      const recentHits = this.armorHitTimes.filter(t => now - t < 5000);
      if (recentHits.length >= 3 && !this.armorDRActive) {
        this.armorDRActive = true;
        this.armorDRExpiry = now + 4000;
      }
    }

    if (this.hasMajor(118)) {
      this.disengageBoostExpiry = now + 2000;
    }

    if (this.hasMajor(127) && attacker) {
      const isBoss = [Types.Entity.Yeti, Types.Entity.Chimera, Types.Entity.Roku, Types.Entity.Ancient].includes(attacker.type);
      if (isBoss) {
        return 1.15;
      }
    }

    return 1.0;
  }

  onKill(killedEntity) {
    if (this.hasMajor(114) && killedEntity.type === Types.Entity.Player) {
      this.player.health.percent = 1;
    }
  }

  onDeath() {
    if (this.hasMajor(130) && !this.insuranceUsed) {
      this.insuranceUsed = true;
      const keptGold = Math.round(this.player.levels.coins * 0.40);
      return keptGold;
    }
    return 0;
  }

  getKnockbackMultiplier(entity) {
    let mult = 1;

    if (this.hasMajor(126)) {
      const isMob = Types.Groups.Mobs.includes(entity.type);
      if (isMob) mult *= 0.5;
    }

    return mult;
  }

  getDamageTakenMultiplier(attacker, isThrown) {
    let mult = 1;

    if (this.hasMajor(109) && isThrown) {
      mult *= 0.5;
    }

    if (this.hasMajor(122) && attacker && attacker.type === Types.Entity.Player) {
      const dx = this.player.shape.x - attacker.shape.x;
      const dy = this.player.shape.y - attacker.shape.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2000) mult *= 0.75;
    }

    return mult;
  }

  getDamageDealtMultiplier(target) {
    let mult = 1;

    if (this.hasMajor(122) && target.type === Types.Entity.Player) {
      const dx = this.player.shape.x - target.shape.x;
      const dy = this.player.shape.y - target.shape.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2000) mult *= 0.75;
    }

    return mult;
  }

}


module.exports = CardSystem;
