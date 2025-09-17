import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { EntityManager } from '../../src/ecs/entity/EntityManager.js';
import { SystemManager } from '../../src/ecs/systems/SystemManager.js';
import { timeComponentType } from '../../src/ecs/components/implementations/TimeComponent.js';
import { TimeSystem } from '../../src/ecs/systems/implementations/TimeSystem.js';
import {
  foodResourceComponentType,
} from '../../src/ecs/components/implementations/plugins/FoodResourceComponent.js';
import {
  populationComponentType,
} from '../../src/ecs/components/implementations/plugins/PopulationComponent.js';
import { FoodDecaySystem } from '../../src/ecs/systems/implementations/plugins/FoodDecaySystem.js';
import { PopulationResponseSystem } from '../../src/ecs/systems/implementations/plugins/PopulationResponseSystem.js';

type Snapshot = {
  tick: number;
  food: number;
  population: number;
};

describe('Population and food decline simulation', () => {
  it('records deterministic food and population values over ten ticks', async () => {
    const testFilePath = fileURLToPath(import.meta.url);
    const testDirectory = path.dirname(testFilePath);
    const repositoryRoot = path.resolve(testDirectory, '..', '..', '..', '..', '..');
    const logDirectory = path.join(repositoryRoot, 'verifications');
    const logFilePath = path.join(logDirectory, 'population-food-decline.log');

    await mkdir(logDirectory, { recursive: true });

    const componentManager = new ComponentManager();
    const entityManager = new EntityManager(componentManager);
    const systemManager = new SystemManager();

    componentManager.registerType(timeComponentType);
    componentManager.registerType(foodResourceComponentType);
    componentManager.registerType(populationComponentType);

    const colony = entityManager.create();
    const colonyId = colony.id;

    componentManager.attachComponent(colonyId, foodResourceComponentType, {
      currentFood: 100,
      decayPerTick: 10,
      minimumFood: 0,
    });

    componentManager.attachComponent(colonyId, populationComponentType, {
      currentPopulation: 20,
      perCapitaFoodNeed: 4,
      starvationRate: 0.5,
      minimumPopulation: 1,
    });

    const timeSystem = new TimeSystem(componentManager, colonyId, 'time');
    const foodDecaySystem = new FoodDecaySystem(componentManager);
    const populationResponseSystem = new PopulationResponseSystem(componentManager);

    systemManager.register(timeSystem);
    systemManager.register(foodDecaySystem);
    systemManager.register(populationResponseSystem);

    const snapshots: Snapshot[] = [];

    for (let step = 0; step < 10; step += 1) {
      await systemManager.update(1);

      const time = componentManager.getComponent(colonyId, timeComponentType);
      const food = componentManager.getComponent(colonyId, foodResourceComponentType);
      const population = componentManager.getComponent(colonyId, populationComponentType);

      if (!time || !food || !population) {
        throw new Error('Simulation components were not attached as expected.');
      }

      snapshots.push({
        tick: time.ticks,
        food: food.currentFood,
        population: population.currentPopulation,
      });
    }

    const expectedSnapshots: Snapshot[] = [
      { tick: 1, food: 90, population: 20 },
      { tick: 2, food: 80, population: 20 },
      { tick: 3, food: 70, population: 18.75 },
      { tick: 4, food: 60, population: 16.875 },
      { tick: 5, food: 50, population: 14.6875 },
      { tick: 6, food: 40, population: 12.34375 },
      { tick: 7, food: 30, population: 9.921875 },
      { tick: 8, food: 20, population: 7.4609375 },
      { tick: 9, food: 10, population: 4.98046875 },
      { tick: 10, food: 0, population: 2.490234375 },
    ];

    expect(snapshots).toEqual(expectedSnapshots);

    for (let index = 1; index < snapshots.length; index += 1) {
      expect(snapshots[index].food).toBeLessThanOrEqual(snapshots[index - 1].food);
    }

    const firstDeclineIndex = snapshots.findIndex(
      (snapshot, index) => index > 0 && snapshot.population < snapshots[index - 1].population,
    );

    expect(firstDeclineIndex).toBeGreaterThanOrEqual(2);

    if (firstDeclineIndex >= 0) {
      for (let index = firstDeclineIndex + 1; index < snapshots.length; index += 1) {
        expect(snapshots[index].population).toBeLessThanOrEqual(snapshots[index - 1].population);
      }
    }

    const logLines = [
      'tick,food,population',
      ...snapshots.map((snapshot) => `${snapshot.tick},${snapshot.food},${snapshot.population}`),
    ];

    await writeFile(logFilePath, `${logLines.join('\n')}\n`, 'utf-8');

    const logContents = await readFile(logFilePath, 'utf-8');
    expect(logContents.trim().split('\n')).toEqual(logLines);
  });
});
