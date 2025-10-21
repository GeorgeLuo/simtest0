
// TwoBodySystem simulates a classic two-body gravitational orbit.
const TWO_BODY_COMPONENT = { key: "plugin.twoBody.body" };

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

export class TwoBodySystem {
  constructor(options = {}) {
    if (!options.entityManager || !options.componentManager) {
      throw new Error("TwoBodySystem requires entityManager and componentManager");
    }
    this.entityManager = options.entityManager;
    this.componentManager = options.componentManager;
    this.systemManager = options.systemManager;
    this.outboundBus = options.outboundBus;
    this.getTick = typeof options.getTick === "function" ? options.getTick : () => 0;
    this.gravitationalConstant = positiveNumber(options.gravitationalConstant, 1);
    this.timeStep = positiveNumber(options.timeStep, 0.05);
    this.softening = nonNegativeNumber(options.softening, 0.01);

    this.primary = {
      id:
        typeof options.primaryId === "string" && options.primaryId.length > 0
          ? options.primaryId
          : "Alpha",
      mass: positiveNumber(options.primaryMass, 10),
      color: typeof options.primaryColor === "string" ? options.primaryColor : "#f8d067",
      position: createVector(),
      velocity: createVector(),
    };

    this.secondary = {
      id:
        typeof options.secondaryId === "string" && options.secondaryId.length > 0
          ? options.secondaryId
          : "Beta",
      mass: positiveNumber(options.secondaryMass, 5),
      color: typeof options.secondaryColor === "string" ? options.secondaryColor : "#6fb8ff",
      position: createVector(),
      velocity: createVector(),
    };

    const separation = positiveNumber(options.initialSeparation, 20);
    this.initialState = this.computeInitialState(separation);
    this.primaryEntity = null;
    this.secondaryEntity = null;
    this.tick = 0;
    this.resetState();
  }

  computeInitialState(separation) {
    const totalMass = this.primary.mass + this.secondary.mass;
    const offsetPrimary = -(this.secondary.mass / totalMass) * separation;
    const offsetSecondary = offsetPrimary + separation;
    const orbitalSpeed = Math.sqrt((this.gravitationalConstant * totalMass) / separation);
    const vPrimary = orbitalSpeed * (this.secondary.mass / totalMass);
    const vSecondary = orbitalSpeed * (this.primary.mass / totalMass);
    return {
      primary: {
        position: createVector(offsetPrimary, 0, 0),
        velocity: createVector(0, -vPrimary, 0),
      },
      secondary: {
        position: createVector(offsetSecondary, 0, 0),
        velocity: createVector(0, vSecondary, 0),
      },
    };
  }

  resetState() {
    this.tick = 0;
    this.primary.position = cloneVector(this.initialState.primary.position);
    this.primary.velocity = cloneVector(this.initialState.primary.velocity);
    this.secondary.position = cloneVector(this.initialState.secondary.position);
    this.secondary.velocity = cloneVector(this.initialState.secondary.velocity);
  }

  onInit() {
    this.resetState();
    if (this.primaryEntity === null) {
      this.primaryEntity = this.entityManager.createEntity();
    }
    if (this.secondaryEntity === null) {
      this.secondaryEntity = this.entityManager.createEntity();
    }
    this.syncComponents();
  }

  update() {
    this.tick += 1;
    this.integrate();
    this.syncComponents();
  }

  integrate() {
    const dx = this.secondary.position.x - this.primary.position.x;
    const dy = this.secondary.position.y - this.primary.position.y;
    const dz = this.secondary.position.z - this.primary.position.z;
    const soft = this.softening;
    const distSq = dx * dx + dy * dy + dz * dz + soft * soft;
    const dist = Math.sqrt(distSq);
    if (dist === 0) {
      return;
    }
    const invDist3 = 1 / (distSq * dist);
    const gdt = this.gravitationalConstant * this.timeStep;

    const ax1 = gdt * this.secondary.mass * dx * invDist3;
    const ay1 = gdt * this.secondary.mass * dy * invDist3;
    const az1 = gdt * this.secondary.mass * dz * invDist3;

    const ax2 = -gdt * this.primary.mass * dx * invDist3;
    const ay2 = -gdt * this.primary.mass * dy * invDist3;
    const az2 = -gdt * this.primary.mass * dz * invDist3;

    this.primary.velocity.x += ax1;
    this.primary.velocity.y += ay1;
    this.primary.velocity.z += az1;

    this.secondary.velocity.x += ax2;
    this.secondary.velocity.y += ay2;
    this.secondary.velocity.z += az2;

    this.primary.position.x += this.primary.velocity.x * this.timeStep;
    this.primary.position.y += this.primary.velocity.y * this.timeStep;
    this.primary.position.z += this.primary.velocity.z * this.timeStep;

    this.secondary.position.x += this.secondary.velocity.x * this.timeStep;
    this.secondary.position.y += this.secondary.velocity.y * this.timeStep;
    this.secondary.position.z += this.secondary.velocity.z * this.timeStep;

    this.removeDrift();
  }

  removeDrift() {
    const totalMass = this.primary.mass + this.secondary.mass;
    if (totalMass === 0) {
      return;
    }
    const cx =
      (this.primary.position.x * this.primary.mass +
        this.secondary.position.x * this.secondary.mass) /
      totalMass;
    const cy =
      (this.primary.position.y * this.primary.mass +
        this.secondary.position.y * this.secondary.mass) /
      totalMass;
    const cz =
      (this.primary.position.z * this.primary.mass +
        this.secondary.position.z * this.secondary.mass) /
      totalMass;

    this.primary.position.x -= cx;
    this.primary.position.y -= cy;
    this.primary.position.z -= cz;
    this.secondary.position.x -= cx;
    this.secondary.position.y -= cy;
    this.secondary.position.z -= cz;

    const momentumX =
      this.primary.velocity.x * this.primary.mass +
      this.secondary.velocity.x * this.secondary.mass;
    const momentumY =
      this.primary.velocity.y * this.primary.mass +
      this.secondary.velocity.y * this.secondary.mass;
    const momentumZ =
      this.primary.velocity.z * this.primary.mass +
      this.secondary.velocity.z * this.secondary.mass;

    const vxAdjust = momentumX / totalMass;
    const vyAdjust = momentumY / totalMass;
    const vzAdjust = momentumZ / totalMass;

    this.primary.velocity.x -= vxAdjust;
    this.primary.velocity.y -= vyAdjust;
    this.primary.velocity.z -= vzAdjust;
    this.secondary.velocity.x -= vxAdjust;
    this.secondary.velocity.y -= vyAdjust;
    this.secondary.velocity.z -= vzAdjust;
  }

  syncComponents() {
    if (this.primaryEntity !== null) {
      this.componentManager.addComponent(this.primaryEntity, TWO_BODY_COMPONENT, {
        id: this.primary.id,
        mass: this.primary.mass,
        position: cloneVector(this.primary.position),
        velocity: cloneVector(this.primary.velocity),
        color: this.primary.color,
        tick: this.getTick(),
      });
    }
    if (this.secondaryEntity !== null) {
      this.componentManager.addComponent(this.secondaryEntity, TWO_BODY_COMPONENT, {
        id: this.secondary.id,
        mass: this.secondary.mass,
        position: cloneVector(this.secondary.position),
        velocity: cloneVector(this.secondary.velocity),
        color: this.secondary.color,
        tick: this.getTick(),
      });
    }
  }

  onDestroy() {
    if (this.primaryEntity !== null) {
      this.componentManager.removeAllComponents(this.primaryEntity);
      this.entityManager.removeEntity(this.primaryEntity);
      this.primaryEntity = null;
    }
    if (this.secondaryEntity !== null) {
      this.componentManager.removeAllComponents(this.secondaryEntity);
      this.entityManager.removeEntity(this.secondaryEntity);
      this.secondaryEntity = null;
    }
    this.resetState();
  }
}
