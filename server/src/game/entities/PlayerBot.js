const Player = require('./Player');
const Timer = require('../components/Timer');
const Types = require('../Types');
const helpers = require('../../helpers');

const BehaviourStages = {
  Idle: 0,
  RandomMovement: 1,
  TargetPlayer: 2,
  // TargetLeader: 3,
  TargetCoins: 4,
  TargetChests: 5,
  RunAway: 6,
};

const BehaviourConfig = {
  [BehaviourStages.Idle]: {
    duration: [3, 5],
    actions: [],
    targets: [],
  },
  [BehaviourStages.RandomMovement]: {
    duration: [1, 3],
    actions: ['randomMovement'],
    targets: [],
  },
  [BehaviourStages.TargetPlayer]: {
    duration: [10, 15],
    actions: ['target', 'attack'],
    targets: [Types.Entity.Player],
  },
  // [BehaviourStages.TargetLeader]: {
  //   duration: [25, 35],
  //   actions: ['target', 'attack'],
  //   targets: [],
  // },
  [BehaviourStages.TargetCoins]: {
    duration: [20, 25],
    actions: ['target'],
    targets: [Types.Entity.Coin],
  },
  [BehaviourStages.TargetChests]: {
    duration: [20, 25],
    actions: ['target', 'attack'],
    targets: [Types.Entity.Chest],
    force: [50, 90],
  },
  [BehaviourStages.RunAway]: {
    duration: [1, 5],
    actions: ['runAway', 'attack'],
    targets: [],
  },
};

class PlayerAI extends Player {
  constructor(game, objectData) {
    super(game, objectData.name);

    this.isBot = true;
    this.target = null;
    this.attackCooldown = 0;
    this.smartness = Math.random();
    this.stageTimer = new Timer(0, 0, 0);
    this.changeDirectionTimer = new Timer(0, 3, 5);
    // give up on a target after 5-7 seconds
    this.targetTimer = new Timer(0, 5, 7);

    this.game.map.shape.randomSpawnInside(this.shape);
    this.changeStage();
  }

  resetTargetTimer() {
    this.targetTimer.renew();
    this.targetTimer.active = false; // Initially set to inactive until a target is acquired
  }

  changeStage(stage) {
    if (stage === undefined) {
      stage = helpers.randomChoice(
        Object.values(BehaviourStages).filter(type => type !== BehaviourStages.RunAway),
      );
    }
    this.stage = stage;
    this.stageConfig = BehaviourConfig[this.stage];
    this.stageTimer.minTime = this.stageConfig.duration[0];
    this.stageTimer.maxTime = this.stageConfig.duration[1];
    this.stageTimer.renew();
    this.resetTargetTimer();
    this.target = null;
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

        // Update and check the target timer
        if (this.target) {
          if (!this.targetTimer.active) {
            this.targetTimer.active = true;
            this.targetTimer.renew();
          }
          this.targetTimer.update(dt);
          if (this.targetTimer.finished) {
            this.target = null; // Give up on the target
            // random movement after giving up on the target
            this.changeStage(BehaviourStages.RandomMovement);
            this.changeDirectionTimer.finished = true;

            this.resetTargetTimer();
          }
        }

    if (!this.target) {
      if (this.stage === BehaviourStages.TargetLeader) {
        // this.target = this.game.leaderPlayer;
        console.log('Targeting leader is not implemented yet');
      } else {
        const targets = this.getEntitiesInViewport().map(id => this.game.entities.get(id)).filter(e => e);
        let minDistance = Infinity;
        for (const target of targets) {
          if (target === this) continue;
          if (!this.stageConfig.targets.includes(target.type)) continue;

          const distance = helpers.distance(this.shape.x, this.shape.y, target.shape.x, target.shape.y);
          if (distance < minDistance) {
            this.target = target;
            minDistance = distance;
          }
        }
      }
    }

    for (const action of this.stageConfig.actions) {
      switch (action) {
        case 'randomMovement':
          this.randomMovement();
          break;
        case 'target':
          this.targetEntity(dt, this.stageConfig.actions.includes('attack'), this.stageConfig.force);
          break;
        case 'runAway':
          this.runAway(dt, this.stageConfig.actions.includes('attack'));
          break;
      }
    }

    this.checkUpgrades();

    super.applyInputs(dt);
  }

  checkUpgrades() {
    if (this.levels.upgradePoints > 0) {
      const buff = helpers.randomChoice(Object.values(Types.Buff));
      this.levels.addBuff(buff);
    }
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
      this.movementDirection += helpers.random(-Math.PI, Math.PI) / 2;
    }

    this.mouse = {
      angle: this.movementDirection,
      force: helpers.random(100, 150),
    };
  }

  targetEntity(dt, attack = false, force = [100, 150]) {
    if (!this.target) {
      return this.randomMovement();
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

  runAway(dt, attack = false) {
    if (!this.target || (this.health.percent > 0.5)) {
      return this.changeStage();
    }

    const angle = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
    const movementAngle = helpers.angle(this.target.shape.x, this.target.shape.y, this.shape.x, this.shape.y);
    const distance = helpers.distance(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);

    if (attack) this.attack(distance);

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
    if (entity) {
      // 20% chance of angry and fight back
      if (Math.random() > 0.8) {
        // if health is less than 0.2, then run away
        // if (this.health.percent < 0.2) {
        //   this.changeStage(BehaviourStages.RunAway);
        //   this.target = entity;
        // } else

        if (this.stage !== BehaviourStages.RunAway) {
          this.changeStage(BehaviourStages.TargetPlayer);
          this.target = entity;
        }
      }
    }

    super.damaged(damage, entity);
  }

  remove(reason) {
    super.remove(reason);

    // only spawn if total player count is less than game.aiPlayerCount
    // if(this.game.players.size < this.game.aiPlayerCount) {
    //   console.log('respawning AI bot');
    //   this.game.map.spawnPlayerBot();
    // }
  }
}

module.exports = PlayerAI;
