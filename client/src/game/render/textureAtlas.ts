import Phaser from '../engine';

const atlasKey = 'gameAtlasPage0';
let patched = false;
let built = false;
const packedKeys = new Set<string>();

const blocklist = new Set<string>([
  '__DEFAULT', '__MISSING', '__WHITE', '__NORMAL',
  'rockTile', 'fireTile', 'earthTile', 'iceTile', 'river', 'riverBottom', 'riverTop',
  'safezone', 'sand', 'sandRock', 'sandMud', 'sandAsh', 'tutorialTile', 'meadowTile',
  'savannaTile', 'alpineTile', 'dirtTile', 'rocksTile', 'desertTile', 'oasisTile',
  'gameAtlasPage0',
]);

export function isAtlasEnabled(): boolean {
  try { return new URLSearchParams(window.location.search).has('atlas'); } catch (e) { return false; }
}

export function buildTextureAtlas(scene: Phaser.Scene) {
  if (built || !isAtlasEnabled()) return;
  try {
    const page = 2048;
    const pad = 2;
    const tex = scene.textures;

    const keys = tex.getTextureKeys().filter((k) => {
      if (blocklist.has(k)) return false;
      const t = tex.get(k);
      const src = t && t.source && t.source[0];
      if (!src || (src as any).isRenderTexture) return false;
      if (t.frameTotal > 1) return false;
      const w = src.width, h = src.height;
      return w > 0 && h > 0 && w <= 1024 && h <= 1024;
    });
    if (keys.length === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = page;
    canvas.height = page;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frames: { key: string, x: number, y: number, w: number, h: number }[] = [];
    let x = 0, y = 0, rowH = 0;
    for (const key of keys) {
      const img = tex.get(key).getSourceImage() as CanvasImageSource;
      const w = (img as any).width, h = (img as any).height;
      if (!w || !h) continue;
      if (x + w + pad > page) { x = 0; y += rowH + pad; rowH = 0; }
      if (y + h + pad > page) break;
      ctx.drawImage(img, x, y);
      frames.push({ key, x, y, w, h });
      x += w + pad;
      if (h > rowH) rowH = h;
    }
    if (frames.length === 0) return;

    if (tex.exists(atlasKey)) tex.remove(atlasKey);
    const atlasTex = tex.addCanvas(atlasKey, canvas);
    if (!atlasTex) return;
    for (const f of frames) {
      atlasTex.add(f.key, 0, f.x, f.y, f.w, f.h);
      packedKeys.add(f.key);
    }

    patchFactories();
    built = true;
    // eslint-disable-next-line no-console
    console.log(`[atlas] packed ${frames.length}/${keys.length} textures onto 1 page — those sprites now batch instead of forcing a flush each.`);
  } catch (e) {
    console.warn('[atlas] build failed — running without atlas', e);
    packedKeys.clear();
  }
}

function patchFactories() {
  if (patched) return;
  patched = true;
  const P: any = Phaser;
  const fac = P?.GameObjects?.GameObjectFactory?.prototype;
  if (fac) {
    for (const name of ['sprite', 'image']) {
      const orig = fac[name];
      if (typeof orig !== 'function') continue;
      fac[name] = function patchedFactory(this: any, x: number, y: number, key: any, frame?: any) {
        if (typeof key === 'string' && frame === undefined && packedKeys.has(key)) {
          return orig.call(this, x, y, atlasKey, key);
        }
        return orig.call(this, x, y, key, frame);
      };
    }
  }
  for (const proto of [P?.GameObjects?.Sprite?.prototype, P?.GameObjects?.Image?.prototype]) {
    if (!proto || typeof proto.setTexture !== 'function') continue;
    const orig = proto.setTexture;
    proto.setTexture = function patchedSetTexture(this: any, key: any, frame?: any) {
      if (typeof key === 'string' && frame === undefined && packedKeys.has(key)) {
        return orig.call(this, atlasKey, key);
      }
      return orig.call(this, key, frame);
    };
  }
}
