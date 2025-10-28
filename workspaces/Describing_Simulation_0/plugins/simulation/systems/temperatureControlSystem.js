const { join } = require('path');
const { System } = require(join(__dirname, '../../../dist/core/systems/System'));

const TemperatureComponent = {
  id: 'temperature',
  description: 'Degrees Fahrenheit for the environment.',
  validate(payload) {
    return Boolean(payload && typeof payload.value === 'number');
  },
};

const HeaterComponent = {
  id: 'heater',
  description: 'Represents whether the heater is active.',
  validate(payload) {
    return Boolean(payload && typeof payload.active === 'boolean');
  },
};

class TemperatureControlSystem extends System {
  constructor(options = {}) {
    super();
    this.target = typeof options.target === 'number' ? options.target : 72;
    this.entity = null;
  }

  initialize(context) {
    this.entity = context.entityManager.create();
    context.componentManager.addComponent(this.entity, TemperatureComponent, { value: 65 });
    context.componentManager.addComponent(this.entity, HeaterComponent, { active: true });
  }

  update(context) {
    if (this.entity === null) {
      return;
    }

    const temperatureComponent = context.componentManager.getComponent(this.entity, TemperatureComponent);
    const heaterComponent = context.componentManager.getComponent(this.entity, HeaterComponent);
    if (!temperatureComponent || !heaterComponent) {
      return;
    }

    const current = temperatureComponent.payload.value;
    let heaterActive = heaterComponent.payload.active;

    if (current >= this.target + 1) {
      heaterActive = false;
    } else if (current <= this.target - 1) {
      heaterActive = true;
    }

    const nextTemperature = heaterActive ? Math.min(current + 1, this.target + 5) : Math.max(current - 1, this.target - 5);

    context.componentManager.addComponent(this.entity, TemperatureComponent, { value: nextTemperature });
    context.componentManager.addComponent(this.entity, HeaterComponent, { active: heaterActive });
  }

  destroy(context) {
    if (this.entity === null) {
      return;
    }

    context.componentManager.removeAll(this.entity);
    context.entityManager.remove(this.entity);
    this.entity = null;
  }
}

function createTemperatureControlSystem(options) {
  return new TemperatureControlSystem(options);
}

module.exports = {
  TemperatureControlSystem,
  createTemperatureControlSystem,
};
