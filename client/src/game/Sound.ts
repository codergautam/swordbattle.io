export class Sound {
  id: string;
  source: string[];
  sounds: (Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound)[] = [];
  volume = 1;
  volumeScale = 1;
  cooldown = 0;
  cooldownTime = 0;
  overlap = false;
  private scene?: Phaser.Scene;

  constructor(id: string | number, source: string[], cooldownTime = 300, volumeScale = 1, overlap = false) {
    this.id = 'audio' + id;
    this.source = source;
    this.cooldownTime = cooldownTime;
    this.volumeScale = volumeScale;
    this.overlap = overlap;
  }

  load(scene: Phaser.Scene, path: string) {
    for (let i = 0; i < this.source.length; i++) {
      scene.load.audio(this.id + i, path + this.source[i]);
    }
  }

  initialize(scene: Phaser.Scene) {
    this.scene = scene;
    const options = { volume: this.volume };
    for (let i = 0; i < this.source.length; i++) {
      try {
      this.sounds.push(scene.sound.add(this.id + i.toString(), options));
      } catch(e) {
        console.log("Failed to initialize sound", e);
      }
    }
  }

  play() {
    if (this.cooldown > 0) return;
    if (this.overlap && this.scene) {
      const key = this.id + Phaser.Math.RND.between(0, this.source.length - 1);
      this.scene.sound.play(key, { volume: this.volume * this.volumeScale });
    } else {
      const sound = Phaser.Math.RND.pick(this.sounds);
      if (!sound) return;
      sound.play();
    }
    this.cooldown = this.cooldownTime;
  }

  setVolume(volume: number) {
    this.volume = volume;
    this.sounds.forEach(sound => sound.setVolume(volume * this.volumeScale));
  }

  update(dt: number) {
    this.cooldown -= dt;
    if (this.cooldown < 0) {
      this.cooldown = 0;
    }
  }
}
