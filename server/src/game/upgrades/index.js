const Types = require('../Types');
const defs = require('./definitions');

const E = Types.Evolution;
const u = Types.Upgrade;

const upgradeTree = {
  [E.Basic]: [
    [u.Toughened, u.Footwork],
    [u.ClasslessAbility, u.Handling],
    [u.Lavacopy, u.Pacifist],
    [u.Battler, u.Battleswords],
  ],
  [E.Knight]: [
    [u.Momentum, u.Gale],
    [u.Lunge, u.Riposte],
    [u.Striketwice, u.Twothrow],
  ],
  [E.Tank]: [
    [u.Overrun, u.Charging],
    [u.Recovery, u.Blocker],
    [u.Spikes, u.Kinesis],
  ],
  [E.Berserker]: [
    [u.Adapting, u.Normalize],
    [u.Transfer, u.Haste],
  ],
  [E.Vampire]: [
    [u.Sanguine, u.Lifetaker],
    [u.Deathsender, u.Vitality],
  ],
  [E.Rook]: [
    [u.Ramming, u.Teleport],
    [u.KingRook, u.Castle],
  ],
  [E.Samurai]: [
    [u.Iaido, u.Meditation],
    [u.Katana, u.Kunais],
  ],
  [E.Archer]: [
    [u.ArcherCombo, u.Homing],
  ],
  [E.Warrior]:    [[u.Deflect, u.Pacing]],
  [E.Fighter]:    [[u.TwoBoost, u.Flighter]],
  [E.Defender]:   [[u.Slam, u.Fortress]],
  [E.Stalker]:    [[u.Blindness, u.Vision]],
  [E.Fisherman]:  [[u.Sardines, u.Brace]],
  [E.Lumberjack]: [[u.Hunter, u.Offense]],
};

class UpgradeSystem {
  constructor(player) {
    this.player = player;
    this.upgrades = [];
    this.acquiredIds = [];
    this.possibleUpgrades = new Set();
  }

  get tierIndex() { return this.upgrades.length; }

  tree() {
    const evo = this.player.evolutions ? this.player.evolutions.evolution : Types.Evolution.Basic;
    return upgradeTree[evo] || [];
  }

  hasAvailableTier() { return this.tierIndex < this.tree().length; }

  checkForUpgrades() {
    this.possibleUpgrades.clear();
    const tree = this.tree();
    if (this.tierIndex < tree.length) {
      for (const id of tree[this.tierIndex]) this.possibleUpgrades.add(id);
    }
  }

  select(id) {
    if (!this.possibleUpgrades.has(id)) return false;
    const Cls = defs[id];
    if (!Cls) return false;
    this.upgrades.push(new Cls(this.player));
    this.acquiredIds.push(id);
    this.possibleUpgrades.clear();
    return true;
  }

  clear() {
    for (const up of this.upgrades) { try { up.remove(); } catch (e) {} }
    this.upgrades = [];
    this.acquiredIds = [];
    this.possibleUpgrades.clear();
  }

  update(dt) {
    for (const up of this.upgrades) {
      try { up.update(dt); } catch (e) {}
    }
    if (this.acquiredIds.length > 0) {
      this.player.flags.set(Types.Flags.Upgraded, 1);
    }
  }

  hook(name, ...args) {
    for (const up of this.upgrades) {
      const fn = up[name];
      if (typeof fn === 'function') { try { fn.apply(up, args); } catch (e) {} }
    }
  }
}

module.exports = UpgradeSystem;
module.exports.upgradeTree = upgradeTree;
module.exports.definitions = defs;
