import { createServer } from './server';

/**
 * Application bootstrap for the describing simulation workspace.
 */
export async function main(): Promise<void> {
  await createServer();
}

if (require.main === module) {
  // eslint-disable-next-line no-void
  void main();
}
