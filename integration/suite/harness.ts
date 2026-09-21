type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

export function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

/** Runs every registered test, collecting failures so one bad case doesn't hide the rest. */
export async function runAll(): Promise<void> {
  const failures: string[] = [];

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok - ${name}`);
    } catch (err) {
      const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
      console.error(`  not ok - ${name}\n${message}`);
      failures.push(`${name}: ${message}`);
    }
  }

  console.log(`\n${tests.length - failures.length}/${tests.length} integration tests passed`);

  if (failures.length > 0) {
    throw new Error(`${failures.length} integration test(s) failed:\n${failures.join('\n\n')}`);
  }
}

/** Polls until `predicate` returns a truthy value, or throws once `timeoutMs` elapses. */
export async function waitFor<T>(
  description: string,
  predicate: () => T | undefined | Promise<T | undefined>,
  timeoutMs = 60_000,
  intervalMs = 250
): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await predicate();
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${description}`);
}
