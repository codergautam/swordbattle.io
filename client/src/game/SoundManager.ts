import { Sound } from 'phaser';
import Game from './scenes/Game';
import { Settings } from './Settings';

class SoundManager {
  game: Game;
  volume: number = Number(Settings.sound) / 10;
  hit: Sound.NoAudioSound | Sound.HTML5AudioSound | Sound.WebAudioSound | null = null;
  damage: Sound.NoAudioSound | Sound.HTML5AudioSound | Sound.WebAudioSound | null = null;
  coin: Sound.NoAudioSound | Sound.HTML5AudioSound | Sound.WebAudioSound | null = null;

  coinPlayingTime: number = 0;
  coinPlayingCooldown: number = 300;

  constructor(game: Game) {
    this.game = game;
  }

  initialize() {
    const options = {
      volume: this.volume,
    };
    this.hit = this.game.sound.add('hitenemy', options);
    this.damage = this.game.sound.add('damage', options);
    this.coin = this.game.sound.add('coin', options);
  }

  playCoin() {
    if (this.coinPlayingTime === 0) {
      this.coin?.play();
      this.coinPlayingTime = 1;
    }
  }

  update(dt: number) {
    if (this.coinPlayingTime !== 0) {
      this.coinPlayingTime += dt;
      if (this.coinPlayingTime >= this.coinPlayingCooldown) {
        this.coinPlayingTime = 0;
      }
    }
  }

  updateVolume(volume: number) {
    this.volume = volume;
    this.hit?.setVolume(volume);
    this.damage?.setVolume(volume);
    this.coin?.setVolume(volume);
  }
}

export default SoundManager;
