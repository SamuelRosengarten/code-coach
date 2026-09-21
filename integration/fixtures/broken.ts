// Deliberately broken fixture used by the integration tests.
// `missingHelper` is never declared, so the TypeScript language service
// reports TS2304 ("Cannot find name") here — the error Code Coach coaches.
// This file is excluded from the project's own tsc build on purpose.
export const total: number = missingHelper(1, 2);
