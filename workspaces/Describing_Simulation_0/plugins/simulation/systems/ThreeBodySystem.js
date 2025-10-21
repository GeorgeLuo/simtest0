
// ThreeBodySystem simulates a simple three-body gravitational interaction.
const COMPONENT_TYPE = { key: "plugin.threeBody.body" };

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function positiveNumber(value, fallback) {
  const numeric = toNumber(value, fallback);
  return numeric > 0 ? numeric : fallback;
}

function nonNegativeNumber(value, fallback) {
  const numeric = toNumber(value, fallback);
  return numeric >= 0 ? numeric : fallback;
}

function createVector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function cloneVector(vector) {
  if (!vector || typeof vector !== "object") {
    return createVector();
  }
  return createVector(toNumber(vector.x, 0), toNumber(vector.y, 0), toNumber(vector.z, 0));
}

function createBody(kind, options, defaults) {
  const idOption = options[`${kind}Id`];
  const massOption = options[`${kind}Mass`];
  const colorOption = options[`${kind}Color`];
  return {
    id: typeof idOption === "string" && idOption.length > 0 ? idOption : defaults.id,
    mass: positiveNumber(massOption, defaults.mass),
    color: typeof colorOption === "string" ? colorOption : defaults.color,
    position: createVector(),
    velocity: createVector(),
  };
}

const BODY_DEFAULTS = {
  primary: { id: "Helios", mass: 18, color: "#f6c76e" },
  secondary: { id: "Selene", mass: 6, color: "#7aa0ff" },
  tertiary: { id: "Nyx", mass: 2, color: "#ff7fb0" },
};

export class ThreeBodySystem {
  constructor(options = {}) {
    if (!options.entityManager || !options.componentManager) {
      throw new Error("ThreeBodySystem requires entityManager and componentManager");
    }

    this.entityManager = options.entityManager;
    this.componentManager = options.componentManager;
    this.systemManager = options.systemManager;
    this.outboundBus = options.outboundBus;
    this.getTick = typeof options.getTick === "function" ? options.getTick : () => 0;

    this.gravitationalConstant = positiveNumber(options.gravitationalConstant, 1);
    this.timeStep = positiveNumber(options.timeStep, 0.12);
    this.softening = nonNegativeNumber(options.softening, 0.05);
    this.rotationDirection = options.rotationDirection === "clockwise" ? -1 : 1;

    this.bodies = [
      createBody("primary", options, BODY_DEFAULTS.primary),
      createBody("secondary", options, BODY_DEFAULTS.secondary),
      createBody("tertiary", options, BODY_DEFAULTS.tertiary),
    ];

    this.entityIds = this.bodies.map(() => null);
    this.tick = 0;

    this.initialSeparation = positiveNumber(options.initialSeparation, 30);
    this.tertiaryDistance = positiveNumber(
      options.tertiaryDistance,
      this.initialSeparation * 0.75,
    );

    this.initialState = this.computeInitialState();
    this.resetState();
  }

  computeInitialState() {
    const side = Math.max(this.initialSeparation, 1e-6);
    const sqrt3 = Math.sqrt(3);
    const radius = side / sqrt3;

    const basePositions = [
      createVector(radius, 0, 0),
      createVector(-radius / 2, (sqrt3 / 2) * radius, 0),
      createVector(-radius / 2, -(sqrt3 / 2) * radius, 0),
    ];

    const totalMass = this.bodies.reduce((sum, body) => sum + body.mass, 0) || 1;
    let cx = 0;
    let cy = 0;
    let cz = 0;

    basePositions.forEach((pos, index) => {
      const mass = this.bodies[index]?.mass ?? totalMass / basePositions.length;
      cx += pos.x * mass;
      cy += pos.y * mass;
      cz += pos.z * mass;
    });

    cx /= totalMass;
    cy /= totalMass;
    cz /= totalMass;

    const centredPositions = basePositions.map((pos) =>
      createVector(pos.x - cx, pos.y - cy, pos.z - cz),
    );

    const omega = radius > 0
      ? Math.sqrt((this.gravitationalConstant * totalMass) / (radius * radius * radius))
      : 0;

    return centredPositions.map((position) => {
      const radialMagnitude = Math.hypot(position.x, position.y);
      let velocity;
      if (!Number.isFinite(radialMagnitude) || radialMagnitude === 0 || omega === 0) {
        velocity = createVector();
      } else {
        const perpX = -position.y;
        const perpY = position.x;
        const perpMag = Math.hypot(perpX, perpY);
        const speed = omega * radialMagnitude;
        const scale = (speed / perpMag) * this.rotationDirection;
        velocity = createVector(perpX * scale, perpY * scale, 0);
      }
      return {
        position,
        velocity,
      };
    });
  }

  resetState() {
    this.tick = 0;
    this.bodies.forEach((body, index) => {
      const state = this.initialState[index];
      body.position = cloneVector(state.position);
      body.velocity = cloneVector(state.velocity);
    });
    this.removeDrift();
  }

  onInit() {
    this.resetState();
    this.bodies.forEach((_, index) => {
      if (this.entityIds[index] === null) {
        this.entityIds[index] = this.entityManager.createEntity();
      }
    });
    this.syncComponents();
  }

  update() {
    this.tick += 1;
    this.integrate();
    this.syncComponents();
  }

  integrate() {
    const accelerations = this.bodies.map(() => createVector());
    const soft = this.softening;
    const dt = this.timeStep;

    for (let i = 0; i < this.bodies.length; i += 1) {
      for (let j = i + 1; j < this.bodies.length; j += 1) {
        const bi = this.bodies[i];
        const bj = this.bodies[j];

        const dx = bj.position.x - bi.position.x;
        const dy = bj.position.y - bi.position.y;
        const dz = bj.position.z - bi.position.z;
        const distSq = dx * dx + dy * dy + dz * dz + soft * soft;
        const dist = Math.sqrt(distSq);
        if (dist === 0) {
          continue;
        }
        const invDist3 = 1 / (distSq * dist);
        const scalar = this.gravitationalConstant * invDist3;
        const ax = scalar * dx;
        const ay = scalar * dy;
        const az = scalar * dz;

        accelerations[i].x += ax * bj.mass;
        accelerations[i].y += ay * bj.mass;
        accelerations[i].z += az * bj.mass;

        accelerations[j].x -= ax * bi.mass;
        accelerations[j].y -= ay * bi.mass;
        accelerations[j].z -= az * bi.mass;
      }
    }

    this.bodies.forEach((body, index) => {
      const accel = accelerations[index];
      body.velocity.x += accel.x * dt;
      body.velocity.y += accel.y * dt;
      body.velocity.z += accel.z * dt;

      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
      body.position.z += body.velocity.z * dt;
    });

    this.removeDrift();
  }

  removeDrift() {
    const totalMass = this.bodies.reduce((sum, body) => sum + body.mass, 0);
    if (!Number.isFinite(totalMass) || totalMass <= 0) {
      return;
    }

    let cx = 0;
    let cy = 0;
    let cz = 0;
    let px = 0;
    let py = 0;
    let pz = 0;

    this.bodies.forEach((body) => {
      cx += body.position.x * body.mass;
      cy += body.position.y * body.mass;
      cz += body.position.z * body.mass;
      px += body.velocity.x * body.mass;
      py += body.velocity.y * body.mass;
      pz += body.velocity.z * body.mass;
    });

    const centerX = cx / totalMass;
    const centerY = cy / totalMass;
    const centerZ = cz / totalMass;
    const adjustVX = px / totalMass;
    const adjustVY = py / totalMass;
    const adjustVZ = pz / totalMass;

    this.bodies.forEach((body) => {
      body.position.x -= centerX;
      body.position.y -= centerY;
      body.position.z -= centerZ;
      body.velocity.x -= adjustVX;
      body.velocity.y -= adjustVY;
      body.velocity.z -= adjustVZ;
    });
  }

  syncComponents() {
    this.bodies.forEach((body, index) => {
      const entityId = this.entityIds[index];
      if (entityId === null) {
        return;
      }
      this.componentManager.addComponent(entityId, COMPONENT_TYPE, {
        id: body.id,
        mass: body.mass,
        position: cloneVector(body.position),
        velocity: cloneVector(body.velocity),
        color: body.color,
        tick: this.getTick(),
      });
    });
  }

  onDestroy() {
    this.entityIds.forEach((entityId, index) => {
      if (entityId === null) {
        return;
      }
      this.componentManager.removeAllComponents(entityId);
      this.entityManager.removeEntity(entityId);
      this.entityIds[index] = null;
    });
    this.resetState();
  }
}
