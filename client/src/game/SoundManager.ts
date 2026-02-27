import Game from './scenes/Game';
import { Settings } from './Settings';
import { Sound } from './Sound';
import { FlagTypes } from './Types';

class SoundManager {
  game: Game;
  volume: number = Number(Settings.sound) / 10;
  manager: Partial<Record<FlagTypes, Sound>>;

  constructor(game: Game) {
    this.game = game;
    this.manager = {
      [FlagTypes.EnemyHit]: new Sound(FlagTypes.EnemyHit, [
        'HitEnemy/EnemyHit4.wav', 'HitEnemy/EnemyHit5.wav', 'HitEnemy/EnemyHit6.wav',
      ]),
      [FlagTypes.Damaged]: new Sound(FlagTypes.Damaged, [
        'TakeDamage/TakeDamage1.wav', 'TakeDamage/TakeDamage2.wav', 'TakeDamage/TakeDamage3.wav',
      ]),
      [FlagTypes.LavaDamaged]: new Sound(FlagTypes.LavaDamaged, [
        'TakeDamage/LavaDamage.mp3',
      ], 500),
      [FlagTypes.GetCoin]: new Sound(FlagTypes.GetCoin, [
        'GetCoin/GetCoin1.wav', 'GetCoin/GetCoin2.wav', 'GetCoin/GetCoin3.wav',
      ], 50),
      [FlagTypes.GetToken]: new Sound(FlagTypes.GetToken, [
        'GetCoin/GetCoin1.wav', 'GetCoin/GetCoin2.wav', 'GetCoin/GetCoin3.wav',
      ], 50),
      [FlagTypes.ChestHit]: new Sound(FlagTypes.ChestHit, [
        'HitChest/HitChest4.wav', 'HitChest/HitChest5.wav', 'HitChest/HitChest6.wav',
      ]),
      [FlagTypes.ChestDestroy]: new Sound(FlagTypes.ChestDestroy, [
        'ChestDestroy/ChestDestroy1.wav', 'ChestDestroy/ChestDestroy2.wav', 'ChestDestroy/ChestDestroy3.wav',
      ]),
      [FlagTypes.SwordSwing]: new Sound(FlagTypes.SwordSwing, [
        'SwordSwing/SwordSwing1.wav',
      ]),
      [FlagTypes.SwordThrow]: new Sound(FlagTypes.SwordThrow, [
        'SwordThrow/SwordThrow1.wav', 'SwordThrow/SwordThrow2.wav', 'SwordThrow/SwordThrow3.wav',
      ]),
      [FlagTypes.PlayerKill]: new Sound(FlagTypes.PlayerKill, [
        'PlayerKill/PlayerKill1.wav', 'PlayerKill/PlayerKill2.wav', 'PlayerKill/PlayerKill3.wav',
      ]),
      [FlagTypes.PlayerDeath]: new Sound(FlagTypes.PlayerDeath, [
        'PlayerDeath/PlayerDeath1.wav', 'PlayerDeath/PlayerDeath2.wav', 'PlayerDeath/PlayerDeath3.wav',
      ]),
      [FlagTypes.PoisonDamaged]: new Sound(FlagTypes.PoisonDamaged, [
        'PoisonDamaged/PoisonDamaged1.wav', 'PoisonDamaged/PoisonDamaged2.wav', 'PoisonDamaged/PoisonDamaged3.wav',
      ]),
      [FlagTypes.ShockwaveHit]: new Sound(FlagTypes.ShockwaveHit, [
        'TakeDamage/LavaDamage.mp3',
      ]),
    };
  }

  load(publicPath: string) {
    for (const sound of Object.values(this.manager)) {
      sound.load(this.game, publicPath + '/assets/sound/');
    }
  }

  play(type: FlagTypes | any) {
    const sound = this.manager[type as FlagTypes];
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
    for (const key of Object.keys(this.manager)) {
      const flagNum = Number(key) as unknown as FlagTypes;
      if (player.flags && player.flags[flagNum]) {
        this.play(flagNum);
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
