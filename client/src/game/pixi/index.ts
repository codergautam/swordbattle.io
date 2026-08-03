import * as PhaserShim from './PhaserShim';
import { Game } from './boot/PixiGame';
import { Scene } from './boot/Scene';
import { Container, Sprite, Image, Text, Graphics, TileSprite } from './display';

const PixiPhaser: any = {
  Game,
  Scene,

  AUTO: PhaserShim.AUTO,
  CANVAS: PhaserShim.CANVAS,
  WEBGL: PhaserShim.WEBGL,
  HEADLESS: PhaserShim.HEADLESS,

  Scale: PhaserShim.Scale,
  Math: PhaserShim.Math,
  Geom: PhaserShim.Geom,
  Display: PhaserShim.Display,
  BlendModes: PhaserShim.BlendModes,
  Utils: PhaserShim.Utils,
  Curves: PhaserShim.Curves,
  Scenes: PhaserShim.Scenes,
  Loader: PhaserShim.Loader,

  GameObjects: { Container, Sprite, Image, Text, Graphics, TileSprite },
};

export default PixiPhaser;
