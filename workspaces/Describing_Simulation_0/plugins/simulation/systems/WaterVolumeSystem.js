import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const DEFAULT_EVALUATION_ENDPOINT = "http://127.0.0.1:3000/evaluation/frame";

function toNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampDensity(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return value;
}

function waterDensityKgPerM3(tempC) {
  const t = toNumber(tempC, 0);
  const density =
    999.842594 +
    0.06793952 * t -
    0.00909529 * t * t +
    0.0001001685 * t * t * t -
    0.000001120083 * t * t * t * t +
    0.000000006536332 * t * t * t * t * t;
  return clampDensity(density);
}

function litersFromMassKg(massKg, density) {
  return (massKg / density) * 1000;
}

function postJson(target, payload) {
  if (!target) {
    return;
  }
  try {
    const url = new URL(target);
    const data = JSON.stringify(payload);
    const client = url.protocol === "https:" ? https : http;
    const options = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(data),
      },
    };
    const req = client.request(options, (res) => {
      res.on("error", () => {});
      res.resume();
    });
    req.on("error", () => {});
    req.write(data);
    req.end();
  } catch {
    // ignore transport errors
  }
}

export class WaterVolumeSystem {
  constructor(options = {}) {
    this.tick = 0;
    this.initialTemperatureC = toNumber(options.startTemperatureC, 20);
    this.temperatureC = this.initialTemperatureC;
    this.maxTemperatureC = toNumber(options.maxTemperatureC, 100);
    this.heatingRateC = Math.max(0, toNumber(options.heatingRateC, 2));
    this.initialVolumeLiters = Math.max(0, toNumber(options.initialVolumeLiters, 1));
    this.referenceDensity = waterDensityKgPerM3(this.initialTemperatureC);
    this.massKg = this.referenceDensity * (this.initialVolumeLiters / 1000);
    this.containerVolumeLiters = toNumber(options.containerVolumeLiters, NaN);
    this.evaluationEndpoint =
      typeof options.evaluationEndpoint === "string" && options.evaluationEndpoint.length > 0
        ? options.evaluationEndpoint
        : DEFAULT_EVALUATION_ENDPOINT;
    this.telemetryEvery = Math.max(1, Math.trunc(toNumber(options.telemetryEvery, 1)));
    this.includeCooling = Boolean(options.includeCooling);
  }

  onInit() {
    this.publishSnapshot("init");
  }

  update() {
    this.tick += 1;
    const heating = this.temperatureC < this.maxTemperatureC;
    if (heating) {
      this.temperatureC = Math.min(
        this.maxTemperatureC,
        this.temperatureC + this.heatingRateC,
      );
    } else if (this.includeCooling && this.temperatureC > this.initialTemperatureC) {
      this.temperatureC = Math.max(
        this.initialTemperatureC,
        this.temperatureC - this.heatingRateC,
      );
    }

    if (this.tick % this.telemetryEvery === 0 || heating === false) {
      this.publishSnapshot("update");
    }
  }

  onDestroy() {
    this.publishSnapshot("destroy");
  }

  computeState() {
    const density = waterDensityKgPerM3(this.temperatureC);
    const volumeLiters = litersFromMassKg(this.massKg, density);
    const expansionRatio = this.initialVolumeLiters === 0
      ? 1
      : volumeLiters / this.initialVolumeLiters;
    const expansionPercent = (expansionRatio - 1) * 100;
    const containerFill = Number.isFinite(this.containerVolumeLiters) && this.containerVolumeLiters > 0
      ? volumeLiters / this.containerVolumeLiters
      : null;
    return {
      tick: this.tick,
      temperatureC: this.temperatureC,
      densityKgPerM3: density,
      volumeLiters,
      expansionRatio,
      expansionPercent,
      containerFillRatio: containerFill,
    };
  }

  publishSnapshot(phase) {
    const state = this.computeState();
    const payload = {
      frame: {
        phase,
        tick: state.tick,
        temperatureC: state.temperatureC,
        volumeLiters: state.volumeLiters,
        densityKgPerM3: state.densityKgPerM3,
        expansionRatio: state.expansionRatio,
        expansionPercent: state.expansionPercent,
        initialTemperatureC: this.initialTemperatureC,
        initialVolumeLiters: this.initialVolumeLiters,
        maxTemperatureC: this.maxTemperatureC,
        heatingRateC: this.heatingRateC,
        containerVolumeLiters: Number.isFinite(this.containerVolumeLiters)
          ? this.containerVolumeLiters
          : null,
        containerFillRatio: state.containerFillRatio,
        timestamp: new Date().toISOString(),
      },
    };
    postJson(this.evaluationEndpoint, payload);
  }
}
