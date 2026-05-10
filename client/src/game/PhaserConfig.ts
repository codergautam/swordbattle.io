import Phaser from 'phaser';
import Game from './scenes/Game';
import { Settings } from './Settings';

// Test if WebGL context can actually be created on this device.
// Some devices (broken drivers, school Chromebooks, blocked GPUs) can't create
// a WebGL context, which causes Phaser to crash. Detect and fall back to Canvas.
function canCreateWebGLContext(): boolean {
	// If we previously detected a WebGL failure, skip the test and stay on Canvas
	if (localStorage.getItem('swordbattle:webgl_failed') === '1') {
		return false;
	}
	try {
		const testCanvas = document.createElement('canvas');
		const gl = (testCanvas.getContext('webgl2')
			|| testCanvas.getContext('webgl')
			|| testCanvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
		if (!gl) return false;
		// Verify it's actually usable, not just a stub
		const isContextLost = gl.isContextLost && gl.isContextLost();
		// Clean up the test context
		const loseExt = gl.getExtension('WEBGL_lose_context');
		if (loseExt) loseExt.loseContext();
		return !isContextLost;
	} catch (e) {
		return false;
	}
}

const webglRequested = Settings.useWebGL;
const webglAvailable = webglRequested && canCreateWebGLContext();
if (webglRequested && !webglAvailable) {
	console.warn('[PhaserConfig] WebGL requested but unavailable on this device — falling back to Canvas');
	localStorage.setItem('swordbattle:webgl_failed', '1');
}

// Last-resort safety net: if Phaser still throws "Cannot create WebGL context"
// (e.g. detection passed but Phaser's stricter check fails), mark WebGL as failed
// and reload into Canvas mode automatically.
if (webglAvailable) {
	window.addEventListener('error', (event) => {
		const msg = event?.message || (event?.error && event.error.message) || '';
		if (typeof msg === 'string' && msg.indexOf('WebGL context') !== -1) {
			if (localStorage.getItem('swordbattle:webgl_failed') !== '1') {
				console.warn('[PhaserConfig] Caught WebGL crash — disabling WebGL and reloading');
				localStorage.setItem('swordbattle:webgl_failed', '1');
				window.location.reload();
			}
		}
	});
}

const config: Phaser.Types.Core.GameConfig = {
	type: webglAvailable ? Phaser.WEBGL : Phaser.CANVAS,
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
		target: 60,
		smoothStep: false,
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
}

export default config;
