import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { test, waitFor } from './harness';
import { FRIENDLY_HINT } from '../../src/hints';
import { isErrorEvent, ErrorEvent } from '../../src/schema';
import type { CodeCoachApi } from '../../src/extension';

const EXTENSION_ID = 'code-coach.code-coach';

async function activateExtension(): Promise<CodeCoachApi> {
  const extension = vscode.extensions.getExtension<CodeCoachApi>(EXTENSION_ID);
  assert.ok(extension, `Extension ${EXTENSION_ID} was not found in the test host`);
  return extension.isActive ? extension.exports : await extension.activate();
}

function fixtureUri(): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected the fixture folder to be open as a workspace');
  return vscode.Uri.file(path.join(folder.uri.fsPath, 'broken.ts'));
}

function hoverText(hovers: vscode.Hover[]): string {
  return hovers
    .flatMap((hover) => hover.contents)
    .map((content) => (typeof content === 'string' ? content : content.value))
    .join('\n');
}

function readEvents(logFilePath: string): ErrorEvent[] {
  if (!fs.existsSync(logFilePath)) {
    return [];
  }
  return fs
    .readFileSync(logFilePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ErrorEvent);
}

test('the extension activates and creates its global storage folder on a clean profile', async () => {
  const api = await activateExtension();

  assert.ok(api.storageFolder, 'Expected the extension to expose its storage folder');
  assert.equal(
    fs.existsSync(api.storageFolder),
    true,
    `Storage folder was not created at ${api.storageFolder}`
  );
  assert.equal(fs.statSync(api.storageFolder).isDirectory(), true);
});

test('the real TypeScript language service reports the error as source "ts" code 2304', async () => {
  await activateExtension();
  const uri = fixtureUri();
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);

  const diagnostic = await waitFor(
    'a TS2304 diagnostic on the fixture file',
    () =>
      vscode.languages
        .getDiagnostics(uri)
        .find((d) => d.source === 'ts' && String(getCode(d)) === '2304')
  );

  assert.match(diagnostic.message, /missingHelper/);
});

test('hovering the error shows the friendly hint instead of only the raw compiler message', async () => {
  await activateExtension();
  const uri = fixtureUri();
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);

  const diagnostic = await waitFor(
    'a TS2304 diagnostic on the fixture file',
    () =>
      vscode.languages
        .getDiagnostics(uri)
        .find((d) => d.source === 'ts' && String(getCode(d)) === '2304')
  );

  const text = await waitFor('the Code Coach hint to appear in the hover', async () => {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider',
      uri,
      diagnostic.range.start
    );
    const combined = hoverText(hovers ?? []);
    return combined.includes(FRIENDLY_HINT) ? combined : undefined;
  });

  assert.ok(text.includes(FRIENDLY_HINT));
});

test('every occurrence is appended to the JSONL log as a valid, schema-conforming line', async () => {
  const api = await activateExtension();
  const uri = fixtureUri();
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);

  const events = await waitFor('an error event in the JSONL log', () => {
    const logged = readEvents(api.logFilePath);
    return logged.length > 0 ? logged : undefined;
  });

  for (const event of events) {
    assert.equal(isErrorEvent(event), true, `Logged line did not match the schema: ${JSON.stringify(event)}`);
  }

  const coached = events.find((event) => event.errorType === 'ts:2304');
  assert.ok(coached, `Expected a ts:2304 event, got: ${JSON.stringify(events)}`);
  assert.equal(coached.language, 'typescript');
  assert.match(coached.file, /broken\.ts$/);
  assert.equal(coached.line, 5);
});

function getCode(diagnostic: vscode.Diagnostic): string | number | undefined {
  const code = diagnostic.code;
  if (code !== null && typeof code === 'object' && 'value' in code) {
    return code.value;
  }
  return code;
}
