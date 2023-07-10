import VirtualJoystickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin.js';
import Phaser from 'phaser';
import Game from './scenes/Game';
import { Settings } from './Settings';

const config: Phaser.Types.Core.GameConfig = {
	type: Settings.useWebGL ? Phaser.WEBGL : Phaser.CANVAS,
	parent: 'phaser-container',
	backgroundColor: '#000000',
	powerPreference: 'high-performance',
	scale: {
		width: '100%',
		height: '100%',
	},
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { y: 0 },
			debug: false,
		},
	},
	plugins: {
		global: [{
			key: 'rexVirtualJoystick',
			plugin: VirtualJoystickPlugin,
			start: true
		}],
	},
	scene: [Game],
}

export default config;
