import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  // Repo root — the extension under development.
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  const fixtureWorkspace = path.resolve(extensionDevelopmentPath, 'integration/fixtures');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    // A fresh user-data-dir per run means global storage starts empty, which
    // is what makes the clean-install assertion meaningful.
    launchArgs: [fixtureWorkspace, '--disable-workspace-trust'],
  });
}

main().catch((err) => {
  console.error('Integration tests failed:', err);
  process.exit(1);
});
