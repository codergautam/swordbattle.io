const Player = require('./Player');
const Timer = require('../components/Timer');
const Types = require('../Types');
const helpers = require('../../helpers');

const BehaviourStages = {
  Idle: 0,
  RandomMovement: 1,
  SparPlayer: 2,
  TargetBot: 3,
  TargetCoins: 4,
  TargetChests: 5,
  RunAway: 6,
};

const RandomStagePool = [
  BehaviourStages.Idle,
  BehaviourStages.RandomMovement,
  BehaviourStages.RandomMovement,
  BehaviourStages.TargetCoins,
  BehaviourStages.TargetCoins,
  BehaviourStages.TargetCoins,
  BehaviourStages.TargetCoins,
  BehaviourStages.TargetChests,
  BehaviourStages.TargetChests,
  BehaviourStages.TargetChests,
  BehaviourStages.TargetBot,
  BehaviourStages.TargetBot,
];

const BehaviourConfig = {
  [BehaviourStages.Idle]: {
    duration: [4, 8],
    actions: [],
    targets: [],
  },
  [BehaviourStages.RandomMovement]: {
    duration: [3, 6],
    actions: ['randomMovement'],
    targets: [],
  },
  [BehaviourStages.SparPlayer]: {
    duration: [5, 10],
    actions: ['target', 'sparAttack'],
    targets: [Types.Entity.Player],
  },
  [BehaviourStages.TargetBot]: {
    duration: [8, 15],
    actions: ['target', 'attack'],
    targets: [Types.Entity.Player],
  },
  [BehaviourStages.TargetCoins]: {
    duration: [15, 25],
    actions: ['target'],
    targets: [Types.Entity.Coin],
  },
  [BehaviourStages.TargetChests]: {
    duration: [15, 25],
    actions: ['targetChest', 'attack'],
    targets: [Types.Entity.Chest],
    force: [50, 90],
  },
  [BehaviourStages.RunAway]: {
    duration: [2, 5],
    actions: ['runAway'],
    targets: [],
  },
};

class PlayerAI extends Player {
  constructor(game, objectData) {
    super(game, objectData.name);

    this.isBot = true;
    this.coinShield = 0;
    this.target = null;
    this.attackCooldown = 0;
    this.smartness = Math.random();
    this.stageTimer = new Timer(0, 0, 0);
    this.changeDirectionTimer = new Timer(0, 3, 5);
    this.targetTimer = new Timer(0, 8, 12);
    this.sparDamageDealt = 0;
    this.movementDirection = helpers.random(-Math.PI, Math.PI);

    this.game.map.shape.randomSpawnInside(this.shape);
    this.changeStage();
  }

  resetTargetTimer() {
    this.targetTimer.renew();
    this.targetTimer.active = false;
  }

  changeStage(stage) {
    if (stage === undefined) {
      stage = helpers.randomChoice(RandomStagePool);
    }
    this.stage = stage;
    this.stageConfig = BehaviourConfig[this.stage];
    this.stageTimer.minTime = this.stageConfig.duration[0];
    this.stageTimer.maxTime = this.stageConfig.duration[1];
    this.stageTimer.renew();
    this.resetTargetTimer();
    this.target = null;
    this.sparDamageDealt = 0;
  }

  isTargetInRealFight(target) {
    if (!target || !target.combatLog || target.type !== Types.Entity.Player) return false;
    for (const [fighterId, log] of target.combatLog) {
      if (fighterId === this.id) continue;
      const fighter = this.game.entities.get(fighterId);
      if (!fighter || fighter.removed || fighter.isBot) continue;
      if (fighter.type === Types.Entity.Player) {
        if (log.damageDealt > 5 || log.damageReceived > 5) {
          return true;
        }
      }
    }
    return false;
  }

  applyInputs(dt) {
    this.stageTimer.update(dt);
    if (this.stageTimer.finished) {
      this.changeStage();
    }
    this.attackCooldown -= dt;
    if (this.attackCooldown < 0) {
      this.attackCooldown = 0;
    }
    if (this.target && this.target.removed) {
      this.target = null;
    }

    if (this.target) {
      if (!this.targetTimer.active) {
        this.targetTimer.active = true;
        this.targetTimer.renew();
      }
      this.targetTimer.update(dt);
      if (this.targetTimer.finished) {
        this.target = null;
        this.changeStage(BehaviourStages.RandomMovement);
        this.changeDirectionTimer.finished = true;
        this.resetTargetTimer();
      }
    }

    if (this.stage === BehaviourStages.SparPlayer && this.target) {
      const target = this.target;
      const log = this.combatLog.get(target.id);
      if (log) this.sparDamageDealt = Math.max(this.sparDamageDealt, log.damageDealt);
      if (this.isTargetInRealFight(target)) {
        this.changeStage(BehaviourStages.RandomMovement);
      }
      else if (target.health && target.health.percent < 0.2) {
        this.changeStage(BehaviourStages.RandomMovement);
      }
      else if (target.health && this.sparDamageDealt > target.health.max.value * 0.6) {
        this.changeStage(BehaviourStages.RunAway);
        this.target = target;
      }
    }

    if (!this.target) {
      const targets = this.getEntitiesInViewport().map(id => this.game.entities.get(id)).filter(e => e);
      let minDistance = Infinity;
      for (const target of targets) {
        if (target === this) continue;
        if (!this.stageConfig.targets.includes(target.type)) continue;

        if (this.stage === BehaviourStages.SparPlayer) {
          if (target.isBot) continue;
          if (this.isTargetInRealFight(target)) continue;
        }

        if (this.stage === BehaviourStages.TargetBot) {
          if (!target.isBot) continue;
        }

        const distance = helpers.distance(this.shape.x, this.shape.y, target.shape.x, target.shape.y);
        if (distance < minDistance) {
          this.target = target;
          minDistance = distance;
        }
      }
    }

    for (const action of this.stageConfig.actions) {
      switch (action) {
        case 'randomMovement':
          this.randomMovement(dt);
          break;
        case 'target':
          this.targetEntity(dt, false, this.stageConfig.force);
          break;
        case 'targetChest':
          this.targetChest(dt, this.stageConfig.force);
          break;
        case 'sparAttack':
          this.targetEntity(dt, true, this.stageConfig.force);
          break;
        case 'attack':
          if (this.target) {
            const distance = helpers.distance(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
            this.attack(distance);
          }
          break;
        case 'runAway':
          this.runAway(dt, false);
          break;
      }
    }

    this.checkUpgrades();

    super.applyInputs(dt);
  }

  checkUpgrades() {
    // Bots auto pick cards
    if (this.smartness > 0.6) {
      if (this.evolutions.possibleEvols.size > 0) {
        const evol = helpers.randomChoice(Array.from(this.evolutions.possibleEvols));
        this.evolutions.upgrade(evol);
      }
    }
  }

  randomMovement(dt) {
    this.changeDirectionTimer.update(dt);
    if (this.changeDirectionTimer.finished) {
      this.changeDirectionTimer.renew();
      this.movementDirection += helpers.random(-Math.PI / 3, Math.PI / 3);
    }

    this.angle = this.movementDirection;
    this.mouse = {
      angle: this.movementDirection,
      force: helpers.random(100, 150),
    };
  }

  targetEntity(dt, attack = false, force = [100, 150]) {
    if (!this.target) {
      return this.randomMovement(dt);
    }

    const targetPos = this.target.shape.center;
    const angle = helpers.angle(this.shape.x, this.shape.y, targetPos.x, targetPos.y);
    const distance = helpers.distance(this.shape.x, this.shape.y, targetPos.x, targetPos.y);

    if (attack) this.attack(distance);

    this.angle = helpers.angleLerp(this.angle, angle, dt / 0.2);
    this.movementDirection = helpers.angleLerp(this.movementDirection, angle, dt / 0.2);
    this.mouse = {
      angle: this.movementDirection,
      force: helpers.random(force[0], force[1]),
    };
  }

  targetChest(dt, force = [50, 90]) {
    if (!this.target) {
      return this.randomMovement(dt);
    }

    const targetPos = this.target.shape.center;
    const angleToTarget = helpers.angle(this.shape.x, this.shape.y, targetPos.x, targetPos.y);
    const distance = helpers.distance(this.shape.x, this.shape.y, targetPos.x, targetPos.y);

    this.angle = helpers.angleLerp(this.angle, angleToTarget, dt / 0.15);

    const desiredDist = (this.target.shape.radius || 50) + (this.shape.radius || 30) + 30;
    if (distance > desiredDist + 50) {
      this.movementDirection = helpers.angleLerp(this.movementDirection, angleToTarget, dt / 0.2);
      this.mouse = {
        angle: this.movementDirection,
        force: helpers.random(force[0], force[1]),
      };
    } else {
      this.mouse = {
        angle: angleToTarget,
        force: 10,
      };
    }
  }

  runAway(dt, attack = false) {
    if (!this.target || (this.health.percent > 0.5)) {
      return this.changeStage();
    }

    const angle = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
    const movementAngle = helpers.angle(this.target.shape.x, this.target.shape.y, this.shape.x, this.shape.y);

    if (attack) {
      const distance = helpers.distance(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
      this.attack(distance);
    }

    this.angle = helpers.angleLerp(this.angle, angle, dt / 0.2);
    this.movementDirection = helpers.angleLerp(this.movementDirection, movementAngle, dt / 0.2);
    this.mouse = {
      angle: this.movementDirection,
      force: helpers.random(130, 150),
    };
  }

  attack(distance) {
    if (!this.sword.isAnimationFinished || this.sword.isFlying) {
      this.inputs.clear();
      return;
    }
    if (this.attackCooldown > 0) return;

    if (distance < 300) {
      this.inputs.inputDown(Types.Input.SwordSwing);
    }
    else if (distance < 1300) {
      this.inputs.inputDown(Types.Input.SwordThrow);
    }
    this.attackCooldown = helpers.random(0.5, 1.3);
  }

  damaged(damage, entity) {
    if (entity && entity.type === Types.Entity.Player && !entity.isBot) {
      if (Math.random() < 0.8) {
        if (this.stage !== BehaviourStages.RunAway && !this.isTargetInRealFight(entity)) {
          this.changeStage(BehaviourStages.SparPlayer);
          this.target = entity;
          this.sparDamageDealt = 0;
        }
      }
    } else if (entity && !entity.isBot) {
      if (this.health.percent < 0.3) {
        this.changeStage(BehaviourStages.RunAway);
        this.target = entity;
      }
    }

    super.damaged(damage, entity);
  }

  remove(reason) {
    super.remove(reason);
  }
}

module.exports = PlayerAI;
