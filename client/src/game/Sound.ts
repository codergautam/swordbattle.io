export class Sound {
  id: string;
  source: string[];
  sounds: (Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound)[] = [];
  volume = 1;
  cooldown = 0;
  cooldownTime = 0;

  constructor(id: string | number, source: string[], cooldownTime = 300) {
    this.id = 'audio' + id;
    this.source = source;
    this.cooldownTime = cooldownTime;
  }

  load(scene: Phaser.Scene, path: string) {
    for (let i = 0; i < this.source.length; i++) {
      scene.load.audio(this.id + i, path + this.source[i]);
    }
  }

  initialize(scene: Phaser.Scene) {
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
    if (this.cooldown <= 0) {
      const sound = Phaser.Math.RND.pick(this.sounds);
      sound.play();
      this.cooldown = this.cooldownTime;
    }
  }

  setVolume(volume: number) {
    this.sounds.forEach(sound => sound.setVolume(volume));
  }

  update(dt: number) {
    this.cooldown -= dt;
    if (this.cooldown < 0) {
      this.cooldown = 0;
    }
  }
}
