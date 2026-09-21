import { runAll } from './harness';

export async function run(): Promise<void> {
  // Importing the suite registers its tests with the harness.
  await import('./extension.test');
  await runAll();
}
