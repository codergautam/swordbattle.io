// Authoritative source. Boids.js is the dependency-free CommonJS build used
// by the JavaScript game server.
export interface Vector2 {
  x: number;
  y: number;
}

export interface BoidAgent {
  id: number;
  position: Vector2;
  velocity: Vector2;
  maxSpeed: number;
  radius?: number;
}

export interface BoidGoal extends Vector2 {
  weight?: number;
}

export interface BoidBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  margin?: number;
}

export interface BoidContext {
  goal?: BoidGoal | null;
  bounds?: BoidBounds | null;
  wander?: Vector2 | null;
}

export interface BoidConfig {
  perceptionRadius: number;
  separationRadius: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  goalWeight: number;
  boundsWeight: number;
  wanderWeight: number;
  maxForce: number;
}

export interface BoidSteering extends Vector2 {
  neighborCount: number;
}

export const DEFAULT_BOID_CONFIG: Readonly<BoidConfig> = Object.freeze({
  perceptionRadius: 900,
  separationRadius: 210,
  separationWeight: 2.35,
  alignmentWeight: 0.82,
  cohesionWeight: 0.68,
  goalWeight: 1.55,
  boundsWeight: 2.8,
  wanderWeight: 0.16,
  maxForce: 2.9,
});

const EPSILON = 1e-8;

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function limit(x: number, y: number, maximum: number): Vector2 {
  const magnitudeSquared = x * x + y * y;
  if (magnitudeSquared <= maximum * maximum || magnitudeSquared <= EPSILON) {
    return { x, y };
  }
  const scale = maximum / Math.sqrt(magnitudeSquared);
  return { x: x * scale, y: y * scale };
}

function desiredVelocity(x: number, y: number, speed: number): Vector2 {
  const magnitudeSquared = x * x + y * y;
  if (magnitudeSquared <= EPSILON) return { x: 0, y: 0 };
  const scale = speed / Math.sqrt(magnitudeSquared);
  return { x: x * scale, y: y * scale };
}

// Exact overlaps need a stable escape direction or a flock can remain stacked.
function overlapDirection(firstId: number, secondId: number): Vector2 {
  const lowerId = Math.min(firstId, secondId);
  const upperId = Math.max(firstId, secondId);
  let hash = ((lowerId + 1) * 73856093) ^ ((upperId + 1) * 19349663);
  hash = (hash ^ (hash >>> 13)) >>> 0;
  const angle = (hash / 0xffffffff) * Math.PI * 2;
  const sign = firstId < secondId ? 1 : -1;
  return { x: Math.cos(angle) * sign, y: Math.sin(angle) * sign };
}

/**
 * Stateless, allocation-light Reynolds boids controller. It deliberately has
 * no pack identifier: every supplied neighbor participates, so nearby flocks
 * naturally merge and can split again as the world changes.
 */
export class BoidsController {
  readonly config: Readonly<BoidConfig>;

  constructor(config: Partial<BoidConfig> = {}) {
    this.config = Object.freeze({ ...DEFAULT_BOID_CONFIG, ...config });
  }

  steer(agent: BoidAgent, candidates: readonly BoidAgent[], context: BoidContext = {}): BoidSteering {
    const config = this.config;
    const perceptionSquared = config.perceptionRadius * config.perceptionRadius;
    const separationSquared = config.separationRadius * config.separationRadius;
    const maxSpeed = Math.max(0, finite(agent.maxSpeed));
    const velocityX = finite(agent.velocity.x);
    const velocityY = finite(agent.velocity.y);

    let separationX = 0;
    let separationY = 0;
    let alignmentX = 0;
    let alignmentY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let cohesionWeight = 0;
    let neighborCount = 0;

    for (let index = 0; index < candidates.length; index += 1) {
      const neighbor = candidates[index];
      if (!neighbor || neighbor.id === agent.id) continue;

      let dx = finite(neighbor.position.x) - finite(agent.position.x);
      let dy = finite(neighbor.position.y) - finite(agent.position.y);
      let distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > perceptionSquared) continue;

      if (distanceSquared <= EPSILON) {
        const escape = overlapDirection(agent.id, neighbor.id);
        dx = escape.x;
        dy = escape.y;
        distanceSquared = 1;
      }

      const distance = Math.sqrt(distanceSquared);
      const proximity = 1 - Math.min(1, distance / config.perceptionRadius);
      neighborCount += 1;
      alignmentX += finite(neighbor.velocity.x);
      alignmentY += finite(neighbor.velocity.y);
      cohesionX += finite(neighbor.position.x) * proximity;
      cohesionY += finite(neighbor.position.y) * proximity;
      cohesionWeight += proximity;

      const combinedRadius = Math.max(
        config.separationRadius,
        finite(agent.radius || 0) + finite(neighbor.radius || 0) + 30,
      );
      if (distanceSquared < Math.max(separationSquared, combinedRadius * combinedRadius)) {
        const pressure = Math.max(0, (combinedRadius - distance) / combinedRadius);
        separationX -= (dx / distance) * (0.25 + pressure * pressure * 1.75);
        separationY -= (dy / distance) * (0.25 + pressure * pressure * 1.75);
      }
    }

    let forceX = 0;
    let forceY = 0;
    const addDesired = (x: number, y: number, weight: number): void => {
      if (weight === 0 || (x * x + y * y) <= EPSILON) return;
      const desired = desiredVelocity(x, y, maxSpeed);
      forceX += (desired.x - velocityX) * weight;
      forceY += (desired.y - velocityY) * weight;
    };

    if (neighborCount > 0) {
      addDesired(separationX, separationY, config.separationWeight);
      addDesired(
        alignmentX / neighborCount,
        alignmentY / neighborCount,
        config.alignmentWeight,
      );
      if (cohesionWeight > EPSILON) {
        addDesired(
          cohesionX / cohesionWeight - finite(agent.position.x),
          cohesionY / cohesionWeight - finite(agent.position.y),
          config.cohesionWeight,
        );
      }
    }

    if (context.goal) {
      addDesired(
        finite(context.goal.x) - finite(agent.position.x),
        finite(context.goal.y) - finite(agent.position.y),
        config.goalWeight * finite(context.goal.weight ?? 1),
      );
    }

    if (context.wander) {
      addDesired(context.wander.x, context.wander.y, config.wanderWeight);
    }

    const bounds = context.bounds;
    if (bounds) {
      const margin = Math.max(1, finite(bounds.margin ?? config.perceptionRadius));
      const x = finite(agent.position.x);
      const y = finite(agent.position.y);
      let boundaryX = 0;
      let boundaryY = 0;

      if (x < bounds.minX + margin) boundaryX += (bounds.minX + margin - x) / margin;
      if (x > bounds.maxX - margin) boundaryX -= (x - (bounds.maxX - margin)) / margin;
      if (y < bounds.minY + margin) boundaryY += (bounds.minY + margin - y) / margin;
      if (y > bounds.maxY - margin) boundaryY -= (y - (bounds.maxY - margin)) / margin;
      addDesired(boundaryX, boundaryY, config.boundsWeight);
    }

    const limited = limit(forceX, forceY, config.maxForce);
    return { x: limited.x, y: limited.y, neighborCount };
  }
}
