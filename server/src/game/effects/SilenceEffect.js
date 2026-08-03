const Effect = require('./Effect');
const Types = require('../Types');

class SilenceEffect extends Effect {
  update(dt) {
    this.player.modifiers.silenced = true;
    this.player.flags.set(Types.Flags.Silenced, true);

    super.update(dt);
  }
}

module.exports = SilenceEffect;
