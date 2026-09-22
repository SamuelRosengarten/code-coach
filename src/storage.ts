import * as fs from 'fs';

/**
 * Minimal shape we need from vscode.ExtensionContext, kept local so this
 * module never has to import 'vscode' and can be unit tested in plain Node.
 */
export interface StorageUriSource {
  globalStorageUri: { fsPath: string };
}

// Module-level variable, so it's shared by every call to getStorageFolder()
// within this process (there's only ever one, per running extension).
// This is the cache getStorageFolder() checks before doing any work.
let cachedStorageFolder: string | undefined;

/**
 * Checks whether the folder exists and creates it (recursively, i.e. any
 * missing parent folders too) if not. Safe to call repeatedly — a no-op
 * once the folder is there.
 */
export function ensureStorageFolder(folderPath: string): string {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
}

/**
 * Decision: use globalStorageUri rather than the workspace-scoped
 * storageUri. The dashboard shows progress "over weeks," and a
 * workspace-scoped log would reset every time a student opens a
 * different project/repo, so history needs to persist across workspaces.
 */
export function resolveStorageUri(context: StorageUriSource): { fsPath: string } {
  return context.globalStorageUri;
}

/**
 * Resolves the on-disk folder Code Coach logs to: gets the storage URI,
 * converts it to a filesystem path, and ensures it exists. The result is
 * cached after the first call so this only does real work once per
 * activation instead of on every diagnostic.
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
