import Phaser from './engine';
import Game from './scenes/Game';
import { Settings } from './Settings';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  antialias: Settings.antialiasing,
  parent: 'phaser-container',
  backgroundColor: '#000000',
  powerPreference: 'high-performance',
  autoRound: true,
  autoMobilePipeline: true,
  scale: {
    mode: Phaser.Scale.NONE,
  },
  fps: {
    target: 144,
    min: 5,
    smoothStep: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  dom: {
    createContainer: true,
  },
  scene: [Game],
};

export default config;
