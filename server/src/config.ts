import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

// server/src -> the repo root, wherever the process was started from
export const REPO_ROOT = resolve(import.meta.dirname, "../..");

// CLIENT_DIR may be relative (client/dist): it means relative to the repo root,
// so `pnpm start` works from any working directory. Unset = API only
export function resolveClientDir(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return isAbsolute(raw) ? raw : resolve(REPO_ROOT, raw);
}

export function hasClientBuild(clientDir: string): boolean {
  return existsSync(join(clientDir, "index.html"));
}
