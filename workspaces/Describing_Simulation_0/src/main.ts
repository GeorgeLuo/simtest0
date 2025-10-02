import { createSimulationServer } from "./server";

const port = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  const server = createSimulationServer();
  const actualPort = await server.start(port);
  // eslint-disable-next-line no-console
  console.log(`Simulation server listening on port ${actualPort}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start simulation server", error);
  process.exitCode = 1;
});
