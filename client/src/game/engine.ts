import PixiPhaser from './pixi';
import { installIntegrityGlobal, registerIntegrityTarget } from './integrity';
import { Camera } from './pixi/scene-services/Camera';

const impl = PixiPhaser as unknown as PhaserNamespace;

installIntegrityGlobal('Phaser', impl);
registerIntegrityTarget((impl as any).Game?.prototype, ['destroy']);
registerIntegrityTarget((impl as any).GameObjects?.Container?.prototype, ['add', 'addChild', 'destroy', 'setVisible']);
registerIntegrityTarget((impl as any).GameObjects?.Graphics?.prototype, ['clear', 'destroy', 'setVisible']);
registerIntegrityTarget(Camera.prototype, ['preRender', 'setZoom', 'zoomTo']);

export default impl;
