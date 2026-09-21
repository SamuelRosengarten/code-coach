import * as fs from 'fs';

/**
 * Minimal shape we need from vscode.ExtensionContext, kept local so this
 * module never has to import 'vscode' and can be unit tested in plain Node.
 */
export interface StorageUriSource {
  globalStorageUri: { fsPath: string };
}

let cachedStorageFolder: string | undefined;

/**
 * Checks whether the folder exists and creates it (recursively) if not
 * (issues #22, #23). Safe to call repeatedly — a no-op once the folder
 * is there.
 */
export function ensureStorageFolder(folderPath: string): string {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
}

/**
 * Decision (issue #20): use globalStorageUri rather than the
 * workspace-scoped storageUri. The dashboard shows progress "over weeks,"
 * and a workspace-scoped log would reset every time a student opens a
 * different project/repo, so history needs to persist across workspaces.
 */
export function resolveStorageUri(context: StorageUriSource): { fsPath: string } {
  return context.globalStorageUri;
}

/**
 * Resolves the on-disk folder Code Coach logs to: gets the storage URI
 * (#19), converts it to a filesystem path (#21), and ensures it exists
 * (#22, #23). The result is cached after the first call (#24) so it only
 * does this work once per activation instead of on every diagnostic.
 */
export function getStorageFolder(context: StorageUriSource): string {
  if (cachedStorageFolder) {
    return cachedStorageFolder;
  }
  const uri = resolveStorageUri(context);
  cachedStorageFolder = ensureStorageFolder(uri.fsPath);
  return cachedStorageFolder;
}

/** Test-only escape hatch to reset the module-level cache between tests. */
export function __resetStorageCacheForTests(): void {
  cachedStorageFolder = undefined;
}
