const Viewport = require('./components/Viewport');
const State = require('./components/State');
const Timer = require('./components/Timer');
const Circle = require('./shapes/Circle');
const config = require('../config');
const helpers = require('../helpers');

class Spectator {
  constructor(game, client) {
    this.game = game;
    this.client = client;
    this.state = new State(this.createState.bind(this));
    this.shape = Circle.create(0, 0, 1);

    const { viewport } = config.player;
    this.viewport = new Viewport(this, viewport.width, viewport.height, viewport.spectateZoom);
    this.viewportEntityIds = [];

    this.isSpectating = false;
    this.initialized = false;
    this.duration = 5;
    this.distance = 2000;
    this.timer = new Timer(0, this.duration, this.duration);
  }

  createState() {
    return {
      x: this.toX,
      y: this.toY,
      force: this.force,
    };
  }

  initialize() {
    this.game.map.shape.randomSpawnInside(this.shape);
    this.toX = this.shape.x;
    this.toY = this.shape.y;
    this.updatePoint();
  }

  updatePoint() {
    this.timer.renew();

    const angle = helpers.random(-Math.PI, Math.PI);
    this.startX = this.toX;
    this.startY = this.toY;
    this.toX += this.distance * Math.cos(angle);
    this.toY += this.distance * Math.sin(angle);
  }

  update(dt) {
    const { player } = this.client;

    if (this.isSpectating) {
      this.timer.update(dt);
      if (this.timer.finished || !this.initialized) {
        this.updatePoint();
        this.initialized = true;
      }
      this.shape.x = this.startX + (this.toX - this.startX) * this.timer.progress;
      this.shape.y = this.startY + (this.toY - this.startY) * this.timer.progress;
    } else if (player) {
      this.toX = player.shape.x;
      this.toY = player.shape.y;
      this.viewportEntities = player.viewportEntities;
    }
  }

  getEntitiesInViewport() {
    this.viewportEntityIds = this.game.entitiesQuadtree.get(this.viewport.boundary)
      .map(result => result.entity.id);
    return this.viewportEntityIds;
  }

  cleanup() {
    this.state.cleanup();
  }
}

module.exports = Spectator;
