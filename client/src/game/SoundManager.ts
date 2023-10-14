import Game from './scenes/Game';
import { Settings } from './Settings';
import { Sound } from './Sound';
import { SoundTypes } from './Types';

class SoundManager {
  game: Game;
  volume: number = Number(Settings.sound) / 10;
  manager: Partial<Record<SoundTypes, Sound>>;

  constructor(game: Game) {
    this.game = game;
    this.manager = {
      [SoundTypes.EnemyHit]: new Sound(SoundTypes.EnemyHit, [
        'HitEnemy/EnemyHit1.wav', 'HitEnemy/EnemyHit2.wav', 'HitEnemy/EnemyHit3.wav',
      ]),
      [SoundTypes.Damaged]: new Sound(SoundTypes.Damaged, [
        'TakeDamage/TakeDamage1.wav', 'TakeDamage/TakeDamage2.wav', 'TakeDamage/TakeDamage3.wav',
      ]),
      [SoundTypes.LavaDamaged]: new Sound(SoundTypes.LavaDamaged, [
        'TakeDamage/LavaDamage.mp3',
      ], 500),
      [SoundTypes.GetCoin]: new Sound(SoundTypes.GetCoin, [
        'GetCoin/GetCoin1.wav', 'GetCoin/GetCoin2.wav', 'GetCoin/GetCoin3.wav',
      ], 50),
      [SoundTypes.ChestHit]: new Sound(SoundTypes.ChestHit, [
        'HitChest/HitChest1.wav', 'HitChest/HitChest2.wav', 'HitChest/HitChest3.wav',
      ]),
      [SoundTypes.ChestDestroy]: new Sound(SoundTypes.ChestDestroy, [
        'ChestDestroy/ChestDestroy1.wav', 'ChestDestroy/ChestDestroy2.wav', 'ChestDestroy/ChestDestroy3.wav',
      ]),
      [SoundTypes.SwordSwing]: new Sound(SoundTypes.SwordSwing, [
        'SwordSwing/SwordSwing1.wav', 'SwordSwing/SwordSwing2.wav',
      ]),
      [SoundTypes.SwordThrow]: new Sound(SoundTypes.SwordThrow, [
        'SwordThrow/SwordThrow1.wav', 'SwordThrow/SwordThrow2.wav', 'SwordThrow/SwordThrow3.wav',
      ]),
      [SoundTypes.PlayerKill]: new Sound(SoundTypes.PlayerKill, [
        'PlayerKill/PlayerKill1.wav', 'PlayerKill/PlayerKill2.wav', 'PlayerKill/PlayerKill3.wav',
      ]),
      [SoundTypes.PlayerDeath]: new Sound(SoundTypes.PlayerDeath, [
        'PlayerDeath/PlayerDeath1.wav', 'PlayerDeath/PlayerDeath2.wav', 'PlayerDeath/PlayerDeath3.wav',
      ]),
    };
  }

  load(publicPath: string) {
    for (const sound of Object.values(this.manager)) {
      sound.load(this.game, publicPath + '/assets/sound/');
    }
  }

  play(type: SoundTypes | any) {
    const sound = this.manager[type as SoundTypes];
    sound?.play();
  }

  initialize() {
    for (const sound of Object.values(this.manager)) {
      sound.initialize(this.game);
    }
    this.setVolume(this.volume);
  }

  update(dt: number) {
    const player = this.game.gameState.self.entity;
    if (!player) return;

    for (const sound of Object.values(this.manager)) {
      sound.update(dt);
    }
    for (let flag in player.flags) {
      if (player.flags[flag]) {
        this.play(flag);
      }
    }
  }

  setVolume(volume: number) {
    this.volume = volume;
    for (const sound of Object.values(this.manager)) {
      sound.setVolume(volume);
    }
  }
}

export default SoundManager;
