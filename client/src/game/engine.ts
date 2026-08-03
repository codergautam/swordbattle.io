import PixiPhaser from './pixi';

const impl = PixiPhaser as unknown as PhaserNamespace;

try { (globalThis as any).Phaser = impl; } catch (e) { }

export default impl;
