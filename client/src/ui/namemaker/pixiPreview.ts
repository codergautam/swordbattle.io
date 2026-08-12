import {
  Application,
  Assets,
  Texture,
  Sprite,
  Container,
  Graphics,
  Text,
  TextStyle,
  TilingSprite,
  SCALE_MODES,
} from 'pixi.js-legacy';
import * as cosmetics from '../../game/cosmetics.json';
import { withAssetVersion } from '../../assetVersion';
import { NameStyle, resolveClanColor } from '../../game/nameStyles';
import { buildNameTag } from '../../game/pixiNameTag';

const { skins } = cosmetics as any;
const PUBLIC = process.env.PUBLIC_URL || '';
const playerBase = `${PUBLIC}/assets/game/player/`;
const tileBase = `${PUBLIC}/assets/game/tiles/`;

const swingArc = -Math.PI / 3;
const swingMs = 150;
const targetBodyPx = 150;
const shadowOffsetY = 16;
const shadowAlpha = 0.22;
const swingKeys = new Set(['SPACE', 'C', 'E', 'SHIFT']);

function skinById(id: number): any {
  return Object.values(skins).find((s: any) => s.id === id) || skins.player;
}

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export class PixiNamePreview {
  private app: Application;
  private world: Container;
  private grass: TilingSprite | null = null;
  private playerRoot: Container;

  private bodyContainer: Container;
  private swordContainer: Container;
  private body: Sprite;
  private sword: Sprite;
  private shBodyContainer: Container;
  private shSwordContainer: Container;
  private shBody: Sprite;
  private shSword: Sprite;

  private healthGfx: Graphics;
  private nameLayer: Container;

  private bodyW = 256;
  private bodyH = 256;

  private angle = Math.PI / 2;
  private mouseX = 0;
  private mouseY = 0;
  private hasMouse = false;

  private held = new Set<string>();
  private raising = false;
  private progress = 0;

  private curName = 'Player';
  private curClan = '';
  private curStyle: NameStyle = { fill: '#ffffff', outline: '#000000' };
  private curSkinId = 1;
  private destroyed = false;

  constructor(parent: HTMLElement, width: number, height: number) {
    this.app = new Application({
      width,
      height,
      antialias: true,
      backgroundColor: 0x4b8b3b,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    parent.appendChild(this.app.view as HTMLCanvasElement);

    this.world = new Container();
    this.app.stage.addChild(this.world);

    this.shSword = new Sprite(Texture.EMPTY);
    this.shSword.anchor.set(0.5);
    this.shSword.rotation = Math.PI / 4;
    this.shSword.tint = 0x000000;
    this.shSwordContainer = new Container();
    this.shSwordContainer.addChild(this.shSword);
    this.shBody = new Sprite(Texture.EMPTY);
    this.shBody.anchor.set(0.5);
    this.shBody.rotation = -Math.PI / 2;
    this.shBody.tint = 0x000000;
    this.shBodyContainer = new Container();
    this.shBodyContainer.addChild(this.shSwordContainer, this.shBody);
    const shadowRoot = new Container();
    shadowRoot.position.set(0, shadowOffsetY);
    shadowRoot.alpha = shadowAlpha;
    shadowRoot.addChild(this.shBodyContainer);

    this.sword = new Sprite(Texture.EMPTY);
    this.sword.anchor.set(0.5);
    this.sword.rotation = Math.PI / 4;
    this.swordContainer = new Container();
    this.swordContainer.addChild(this.sword);
    this.body = new Sprite(Texture.EMPTY);
    this.body.anchor.set(0.5);
    this.body.rotation = -Math.PI / 2;
    this.bodyContainer = new Container();
    this.bodyContainer.addChild(this.swordContainer, this.body);

    this.healthGfx = new Graphics();
    this.nameLayer = new Container();

    this.playerRoot = new Container();
    this.playerRoot.addChild(shadowRoot, this.bodyContainer, this.healthGfx, this.nameLayer);
    this.world.addChild(this.playerRoot);

    this.layout(width, height);

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    const view = this.app.view as HTMLCanvasElement;
    view.style.touchAction = 'none';
    view.addEventListener('pointerdown', this.onCanvasDown);

    this.setSkin(1);
    this.app.ticker.add(this.tick);

    if ((document as any).fonts?.load) {
      (document as any).fonts.load("700 42px 'Saira'").then(() => {
        if (!this.destroyed) this.rebuildNameTag();
      }).catch(() => {});
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.hasMouse = true;
  };
  private onCanvasDown = () => { this.held.add('mouse'); };
  private onPointerUp = () => { this.held.delete('mouse'); };
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat || isTyping()) return;
    const k = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();
    if (swingKeys.has(k)) { if (k === 'SPACE') e.preventDefault(); this.held.add(k); }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();
    if (swingKeys.has(k)) this.held.delete(k);
  };
  private onBlur = () => { this.held.clear(); };

  private layout(width: number, height: number) {
    this.app.renderer.resize(width, height);
    if (this.grass) {
      this.grass.width = width;
      this.grass.height = height;
    }
    this.playerRoot.position.set(width / 2, height / 2 + Math.min(60, height * 0.08));
  }

  resize(width: number, height: number) {
    if (this.destroyed) return;
    this.layout(width, height);
  }

  setName(name: string) {
    this.curName = name;
    if (!this.destroyed) this.rebuildNameTag();
  }

  setClan(clan: string) {
    this.curClan = clan;
    if (!this.destroyed) this.rebuildNameTag();
  }

  setStyle(style: NameStyle) {
    this.curStyle = style;
    if (!this.destroyed) this.rebuildNameTag();
  }

  private clanStyleObject(): TextStyle {
    return new TextStyle({
      fontFamily: "'Saira', sans-serif",
      fontWeight: '700',
      fontSize: 42,
      lineJoin: 'round',
      fill: resolveClanColor(this.curClan),
      stroke: '#000000',
      strokeThickness: 5,
    });
  }

  private rebuildNameTag() {
    this.nameLayer.removeChildren().forEach((c) => c.destroy({ children: true, texture: true }));
    const y = -this.bodyH / 2 - 50;

    const nameTag = buildNameTag(this.curName || ' ', this.curStyle, 42);
    const nameW = (nameTag as any).textWidth || 0;
    if (this.curClan) {
      const clanText = new Text(`[${this.curClan}] `, this.clanStyleObject());
      clanText.anchor.set(0, 1);
      const total = clanText.width + nameW;
      clanText.position.set(-total / 2, y);
      nameTag.position.set(-total / 2 + clanText.width + nameW / 2, y);
      this.nameLayer.addChild(clanText, nameTag);
    } else {
      nameTag.position.set(0, y);
      this.nameLayer.addChild(nameTag);
    }
  }

  async setSkin(id: number) {
    this.curSkinId = id;
    const skin = skinById(id);
    try {
      const [bodyTex, swordTex] = await Promise.all([
        this.loadTexture(playerBase + skin.bodyFileName),
        this.loadTexture(playerBase + skin.swordFileName),
      ]);
      if (this.destroyed || this.curSkinId !== id) return;
      this.applyTextures(bodyTex, swordTex);
    } catch (e) {
      if (id !== 1 && !this.destroyed) this.setSkin(1);
    }
  }

  private async loadTexture(url: string): Promise<Texture> {
    const tex: Texture = await Assets.load(withAssetVersion(url));
    tex.baseTexture.scaleMode = SCALE_MODES.LINEAR;
    return tex;
  }

  private applyTextures(bodyTex: Texture, swordTex: Texture) {
    this.body.texture = bodyTex;
    this.shBody.texture = bodyTex;
    this.sword.texture = swordTex;
    this.shSword.texture = swordTex;

    this.bodyW = bodyTex.width || 256;
    this.bodyH = bodyTex.height || 256;
    this.sword.position.set(this.bodyW / 2, this.bodyH / 2);
    this.shSword.position.set(this.bodyW / 2, this.bodyH / 2);

    const displayScale = targetBodyPx / this.bodyW;
    this.playerRoot.scale.set(displayScale);

    this.drawBars();
    this.rebuildNameTag();
  }

  async setGrass(file = 'grass.jpg') {
    try {
      const tex = await this.loadTexture(tileBase + file);
      if (this.destroyed) return;
      if (!this.grass) {
        this.grass = new TilingSprite(tex, this.app.renderer.width, this.app.renderer.height);
        this.grass.tileScale.set(0.5);
        this.world.addChildAt(this.grass, 0);
      } else {
        this.grass.texture = tex;
      }
    } catch (e) {
    }
  }

  private tick = () => {
    if (this.destroyed) return;
    const dt = this.app.ticker.deltaMS;

    if (this.hasMouse) {
      const rect = (this.app.view as HTMLCanvasElement).getBoundingClientRect();
      const px = rect.left + this.playerRoot.x;
      const py = rect.top + this.playerRoot.y;
      this.angle = Math.atan2(this.mouseY - py, this.mouseX - px);
    }
    this.bodyContainer.rotation = this.angle;
    this.shBodyContainer.rotation = this.angle;

    const isHeld = this.held.size > 0;
    if (isHeld && !this.raising && this.progress === 0) this.raising = true;
    if (this.raising) {
      this.progress = Math.min(1, this.progress + dt / swingMs);
      if (this.progress >= 1) this.raising = false;
    } else if (!isHeld && this.progress > 0) {
      this.progress = Math.max(0, this.progress - dt / swingMs);
    }
    const swing = swingArc * this.progress;
    this.swordContainer.rotation = swing;
    this.shSwordContainer.rotation = swing;
  };

  private drawBars() {
    const g = this.healthGfx;
    g.clear();

    const width = 200;
    const height = 30;
    const x = -width / 2;
    const y = -this.bodyH / 2 - 40;
    const bw = 3;

    const drawBar = (by: number, bHeight: number, value: number, fill: number, glossAlpha: number) => {
      g.beginFill(0x000000, 0.9);
      g.drawRoundedRect(x - bw, by - bw, width + bw * 2, bHeight + bw * 2, bw * 1.5);
      g.endFill();
      g.beginFill(0x222222, 0.85);
      g.drawRoundedRect(x, by, width, bHeight, bw);
      g.endFill();
      const fillW = width * value;
      if (fillW > 0.5) {
        g.beginFill(fill, 1);
        g.drawRoundedRect(x, by, fillW, bHeight, bw);
        g.endFill();
        g.beginFill(0xffffff, glossAlpha);
        g.drawRoundedRect(x, by, fillW, bHeight * 0.4, bw);
        g.endFill();
      }
    };

    drawBar(y, height, 1, 0x44dd44, 0.2);
    drawBar(y + height + 4, height * 0.5, 1, 0xffdd00, 0.25);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    const view = this.app.view as HTMLCanvasElement;
    view.removeEventListener('pointerdown', this.onCanvasDown);
    this.app.ticker.remove(this.tick);
    try {
      this.app.destroy(true, { children: true });
    } catch (e) {}
  }
}
