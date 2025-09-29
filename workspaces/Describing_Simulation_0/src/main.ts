import { createSimEvalServer } from './server/server';

const port = Number(process.env.PORT ?? 3000);

async function start() {
  const instance = createSimEvalServer();
  instance.server.listen(port, () => {
    const address = instance.port ?? port;
    console.log(`SimEval server listening on port ${address}`);
  });

  const shutdown = async () => {
    console.log('Shutting down SimEval server...');
    await instance.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Failed to start SimEval server', error);
  process.exit(1);
});
