
// SolarSystemSystem approximates the solar system using an n-body integrator
// in astronomical units, solar masses, and years.
const COMPONENT_TYPE = { key: "plugin.solarSystem.body" };

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

const DEFAULT_BODIES = [
  { id: "Sun", mass: 1, semiMajorAxis: 0, angle: 0, color: "#f6d55b" },
  { id: "Mercury", mass: 1.651e-7, semiMajorAxis: 0.387, angle: 0, color: "#b1b3b3" },
  { id: "Venus", mass: 2.447e-6, semiMajorAxis: 0.723, angle: Math.PI * 0.23, color: "#e6b980" },
  { id: "Earth", mass: 3.003e-6, semiMajorAxis: 1.0, angle: Math.PI * 0.5, color: "#4fa3ff" },
  { id: "Mars", mass: 3.213e-7, semiMajorAxis: 1.524, angle: Math.PI * 0.82, color: "#ff6f61" },
  { id: "Jupiter", mass: 9.545e-4, semiMajorAxis: 5.203, angle: Math.PI * 1.37, color: "#f4a460" },
  { id: "Saturn", mass: 2.858e-4, semiMajorAxis: 9.537, angle: Math.PI * 1.92, color: "#f8d87b" },
  { id: "Uranus", mass: 4.366e-5, semiMajorAxis: 19.191, angle: Math.PI * 2.43, color: "#7fffd4" },
  { id: "Neptune", mass: 5.151e-5, semiMajorAxis: 30.068, angle: Math.PI * 2.95, color: "#4169e1" },
];

export class SolarSystemSystem {
  constructor(options = {}) {
    if (!options.entityManager || !options.componentManager) {
      throw new Error("SolarSystemSystem requires entityManager and componentManager");
    }

    this.entityManager = options.entityManager;
    this.componentManager = options.componentManager;
    this.systemManager = options.systemManager;
    this.outboundBus = options.outboundBus;
    this.getTick = typeof options.getTick === "function" ? options.getTick : () => 0;

    this.gravitationalConstant = positiveNumber(
      options.gravitationalConstant,
      39.47841760435743,
    ); // 4π² AU³ / (M☉·yr²)
    this.timeStep = positiveNumber(options.timeStep, 0.002); // years per tick (~0.73 days)
    this.softening = nonNegativeNumber(options.softening, 1e-4);
    this.rotationDirection = options.rotationDirection === "clockwise" ? -1 : 1;

    const templateBodies = Array.isArray(options.bodies) && options.bodies.length > 0
      ? options.bodies
      : DEFAULT_BODIES;

    this.templates = templateBodies.map((body) => ({
      id: body.id,
      mass: positiveNumber(body.mass, 1),
      semiMajorAxis: nonNegativeNumber(body.semiMajorAxis, 0),
      angle: toNumber(body.angle, 0),
      color: typeof body.color === "string" ? body.color : "#ffffff",
    }));

    this.entityIds = this.templates.map(() => null);
    this.bodies = [];
    this.initialState = this.computeInitialState();
    this.resetState();
  }

  computeInitialState() {
    const centralMass = this.templates[0]?.mass ?? 1;
    const totalMass = this.templates.reduce((sum, body) => sum + body.mass, 0) || 1;
    const states = this.templates.map((template) => {
      const position = polarToCartesian(template.semiMajorAxis, template.angle);
      let velocity = createVector();
      if (template.semiMajorAxis > 0) {
        const speed = Math.sqrt((this.gravitationalConstant * centralMass) / template.semiMajorAxis);
        const perpX = -Math.sin(template.angle);
        const perpY = Math.cos(template.angle);
        velocity = createVector(
          speed * perpX * this.rotationDirection,
          speed * perpY * this.rotationDirection,
          0,
        );
      }
      return {
        id: template.id,
        mass: template.mass,
        color: template.color,
        position,
        velocity,
      };
    });

    centreByBarycentre(states, totalMass);
    zeroMomentum(states, totalMass);
    return states.map(cloneBodyState);
  }

  resetState() {
    this.bodies = this.initialState.map(cloneBodyState);
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
    this.integrate();
    this.syncComponents();
  }

  integrate() {
    const dt = this.timeStep;
    const accelerations = computeAccelerations(
      this.bodies,
      this.gravitationalConstant,
      this.softening,
    );
    const dtSquared = dt * dt;

    this.bodies.forEach((body, index) => {
      const accel = accelerations[index];
      body.position.x += body.velocity.x * dt + 0.5 * accel.x * dtSquared;
      body.position.y += body.velocity.y * dt + 0.5 * accel.y * dtSquared;
      body.position.z += body.velocity.z * dt + 0.5 * accel.z * dtSquared;
    });

    const nextAccelerations = computeAccelerations(
      this.bodies,
      this.gravitationalConstant,
      this.softening,
    );

    this.bodies.forEach((body, index) => {
      const accel = accelerations[index];
      const next = nextAccelerations[index];
      body.velocity.x += 0.5 * (accel.x + next.x) * dt;
      body.velocity.y += 0.5 * (accel.y + next.y) * dt;
      body.velocity.z += 0.5 * (accel.z + next.z) * dt;
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

    const centreX = cx / totalMass;
    const centreY = cy / totalMass;
    const centreZ = cz / totalMass;
    const adjustVX = px / totalMass;
    const adjustVY = py / totalMass;
    const adjustVZ = pz / totalMass;

    this.bodies.forEach((body) => {
      body.position.x -= centreX;
      body.position.y -= centreY;
      body.position.z -= centreZ;
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

function polarToCartesian(radius, angle) {
  if (radius === 0) {
    return createVector();
  }
  return createVector(radius * Math.cos(angle), radius * Math.sin(angle), 0);
}

function computeAccelerations(bodies, gravitationalConstant, softening) {
  const accelerations = bodies.map(() => createVector());
  const epsilonSquared = softening * softening;

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const bi = bodies[i];
      const bj = bodies[j];
      const dx = bj.position.x - bi.position.x;
      const dy = bj.position.y - bi.position.y;
      const dz = bj.position.z - bi.position.z;
      const distSq = dx * dx + dy * dy + dz * dz + epsilonSquared;
      const dist = Math.sqrt(distSq);
      if (dist === 0) {
        continue;
      }
      const invDist3 = 1 / (distSq * dist);
      const scalar = gravitationalConstant * invDist3;
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

  return accelerations;
}

function centreByBarycentre(states, totalMass) {
  if (!Number.isFinite(totalMass) || totalMass === 0) {
    return;
  }
  let cx = 0;
  let cy = 0;
  let cz = 0;
  states.forEach((state) => {
    cx += state.position.x * state.mass;
    cy += state.position.y * state.mass;
    cz += state.position.z * state.mass;
  });
  const centreX = cx / totalMass;
  const centreY = cy / totalMass;
  const centreZ = cz / totalMass;
  states.forEach((state) => {
    state.position.x -= centreX;
    state.position.y -= centreY;
    state.position.z -= centreZ;
  });
}

function zeroMomentum(states, totalMass) {
  if (!Number.isFinite(totalMass) || totalMass === 0) {
    return;
  }
  let px = 0;
  let py = 0;
  let pz = 0;
  states.forEach((state) => {
    px += state.velocity.x * state.mass;
    py += state.velocity.y * state.mass;
    pz += state.velocity.z * state.mass;
  });
  const adjustVX = px / totalMass;
  const adjustVY = py / totalMass;
  const adjustVZ = pz / totalMass;
  states.forEach((state) => {
    state.velocity.x -= adjustVX;
    state.velocity.y -= adjustVY;
    state.velocity.z -= adjustVZ;
  });
}

function cloneBodyState(body) {
  return {
    id: body.id,
    mass: body.mass,
    color: body.color,
    position: cloneVector(body.position),
    velocity: cloneVector(body.velocity),
  };
}
