const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");

const drawState = {
  history: [],
  maxHistory: 600,
};

function appendHistory(entry) {
  drawState.history.push(entry);
  if (drawState.history.length > drawState.maxHistory) {
    drawState.history.shift();
  }
}

function handleFrameEvent(event) {
  try {
    const frame = JSON.parse(event.data);
    const bodies = extractBodies(frame).slice(0, 2);
    if (bodies.length === 0) {
      statusEl.textContent =
        "Status: streaming, waiting for two-body components…";
      return;
    }

    appendHistory({ tick: frame.tick, bodies });
    drawFrame(frame.tick, bodies, drawState.history);
    updateTelemetry(frame, bodies);
  } catch (error) {
    console.error("Failed to parse frame", error);
    statusEl.textContent = "Status: stream parse error (see console)";
  }
}

function handleErrorEvent(event) {
  const message = event?.data ?? "unknown";
  statusEl.textContent = `Status: stream error (${message})`;
}

function extractBodies(frame) {
  const bodies = [];
  for (const entity of frame.entities ?? []) {
    for (const component of entity.components ?? []) {
      const data = component?.data;
      if (data && hasVector(data.position)) {
        bodies.push({
          id: data.id ?? `entity-${entity.id}`,
          mass: data.mass ?? 1,
          position: normalizeVector(data.position),
          velocity: normalizeVector(data.velocity ?? { x: 0, y: 0, z: 0 }),
          componentType: component.type,
        });
      }
    }
  }
  return bodies;
}

function hasVector(candidate) {
  return (
    candidate &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number"
  );
}

function normalizeVector(vector) {
  return {
    x: Number(vector.x) || 0,
    y: Number(vector.y) || 0,
    z: Number(vector.z) || 0,
  };
}

function updateTelemetry(frame, bodies) {
  statusEl.textContent = `Status: streaming (tick ${frame.tick})`;
  const summary = {
    tick: frame.tick,
    bodies: bodies.map((body) => ({
      id: body.id,
      mass: body.mass,
      position: body.position,
      velocity: body.velocity,
      componentType: body.componentType,
    })),
  };
  detailsEl.textContent = JSON.stringify(summary, null, 2);
}

function drawFrame(tick, bodies, history) {
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.6,
  );
  gradient.addColorStop(0, "rgba(20, 24, 48, 1)");
  gradient.addColorStop(1, "rgba(5, 6, 14, 1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const scaling = computeScaling(bodies, history, width, height);
  drawTrails(history, scaling);
  drawBodies(bodies, scaling);
  drawTickLabel(tick, width, height);
}

function computeScaling(currentBodies, history, width, height) {
  const positions = [];
  currentBodies.forEach((body) => positions.push(body.position));
  history.forEach((entry) =>
    entry.bodies.forEach((body) => positions.push(body.position)),
  );

  if (positions.length === 0) {
    return {
      scale: 20,
      offsetX: width / 2,
      offsetY: height / 2,
    };
  }

  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const margin = 0.2;
  const available = Math.min(width, height) * (1 - margin);
  const scale = available / Math.max(spanX || 1, spanY || 1);

  const offsetX =
    width / 2 - (Math.max(...xs) + Math.min(...xs)) * 0.5 * scale;
  const offsetY =
    height / 2 + (Math.max(...ys) + Math.min(...ys)) * 0.5 * scale;

  return { scale, offsetX, offsetY };
}

function drawTrails(history, scaling) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";

  const trails = new Map();
  history.forEach((entry) => {
    entry.bodies.forEach((body, index) => {
      const projected = project(body.position, scaling);
      if (!trails.has(index)) {
        trails.set(index, []);
      }
      trails.get(index).push(projected);
    });
  });

  trails.forEach((points) => {
    ctx.beginPath();
    points.forEach((point, idx) => {
      if (idx === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  });
}

function drawBodies(bodies, scaling) {
  bodies.forEach((body, index) => {
    const { x, y } = project(body.position, scaling);
    const radius = Math.max(4, 10 + Math.log(body.mass + 1));
    const hue = (index * 160) % 360;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    glow.addColorStop(0, `hsla(${hue}, 80%, 75%, 1)`);
    glow.addColorStop(1, `hsla(${hue}, 70%, 45%, 0)`);

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(${hue}, 90%, 70%, 1)`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(body.id, x, y - radius - 8);
  });
}

function drawTickLabel(tick, width, height) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "16px 'SF Mono', 'Consolas', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`Tick: ${tick}`, 18, height - 24);
}

function project(position, scaling) {
  return {
    x: scaling.offsetX + position.x * scaling.scale,
    y: scaling.offsetY - position.y * scaling.scale,
  };
}

function initialise() {
  statusEl.textContent = "Status: connecting…";
  const source = new EventSource("/stream");
  source.onmessage = handleFrameEvent;
  source.onerror = handleErrorEvent;
}

initialise();
