const Effect = require('./Effect');

class StunEffect extends Effect {
  constructor(player, id, config) {
    super(player, id, config);
  }

  update(dt) {
    // Prevent all actions
    this.player.modifiers.stunned = true;

    super.update(dt);
  }
}

module.exports = StunEffect;
