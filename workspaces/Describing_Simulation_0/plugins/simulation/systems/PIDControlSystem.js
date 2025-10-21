
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const DEFAULT_EVALUATION_ENDPOINT = "http://localhost:3000/evaluation/frame";

function toNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function postJson(target, payload) {
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

export class PIDControlSystem {
  constructor(options = {}) {
    this.kp = toNumber(options.kp, 1);
    this.ki = toNumber(options.ki, 0);
    this.kd = toNumber(options.kd, 0);
    this.setPoint = toNumber(options.setPoint, 1);
    this.initial = toNumber(options.initial, 0);
    this.dt = toNumber(options.sampleTime, 0.1);
    this.plantGain = toNumber(options.plantGain, 1);
    this.plantTimeConstant = Math.max(toNumber(options.plantTimeConstant, 1), 1e-6);
    this.integralLimit = toNumber(options.integralLimit, 100);
    this.telemetryEvery = Math.max(Math.trunc(toNumber(options.telemetryEvery, 1)), 1);
    this.evaluationEndpoint =
      typeof options.evaluationEndpoint === "string" && options.evaluationEndpoint.length > 0
        ? options.evaluationEndpoint
        : DEFAULT_EVALUATION_ENDPOINT;

    this.reset();
  }

  reset() {
    this.tick = 0;
    this.measured = this.initial;
    this.integral = 0;
    this.prevError = this.setPoint - this.measured;
    this.output = 0;
  }

  onInit() {
    this.publishTelemetry(this.createSnapshot("init"));
  }

  update() {
    this.tick += 1;
    const error = this.setPoint - this.measured;
    this.integral += error * this.dt;

    if (Number.isFinite(this.integralLimit)) {
      if (this.integral > this.integralLimit) {
        this.integral = this.integralLimit;
      } else if (this.integral < -this.integralLimit) {
        this.integral = -this.integralLimit;
      }
    }

    const derivative = (error - this.prevError) / this.dt;
    this.output = this.kp * error + this.ki * this.integral + this.kd * derivative;

    const plantDerivative = (this.output * this.plantGain - this.measured) / this.plantTimeConstant;
    this.measured += plantDerivative * this.dt;

    this.prevError = error;

    if (this.tick % this.telemetryEvery === 0) {
      this.publishTelemetry(this.createSnapshot());
    }
  }

  onDestroy() {
    this.publishTelemetry(this.createSnapshot("destroy"));
  }

  createSnapshot(phase = "update") {
    const error = this.setPoint - this.measured;
    return {
      phase,
      tick: this.tick,
      setPoint: this.setPoint,
      measured: this.measured,
      error,
      output: this.output,
      integral: this.integral,
      derivative: this.dt ? (error - this.prevError) / this.dt : 0,
      timestamp: new Date().toISOString(),
    };
  }

  publishTelemetry(snapshot) {
    if (!this.evaluationEndpoint) {
      return;
    }

    const payload = {
      frame: {
        tick: snapshot.tick,
        phase: snapshot.phase,
        pid: {
          setPoint: snapshot.setPoint,
          measured: snapshot.measured,
          error: snapshot.error,
          output: snapshot.output,
          integral: snapshot.integral,
          derivative: snapshot.derivative,
        },
        timestamp: snapshot.timestamp,
      },
    };

    postJson(this.evaluationEndpoint, payload);
  }
}

