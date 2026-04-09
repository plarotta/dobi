import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR_NAME = ".dobi";

const SUBDIRS = ["sprints", "standups", "retros", "sessions", "sessions/archive"] as const;

/**
 * Returns the path to the .dobi/ data directory in the given root (defaults to cwd).
 */
export function getDataDir(root?: string): string {
  return join(root ?? process.cwd(), DATA_DIR_NAME);
}

/**
 * Ensures the .dobi/ directory and all subdirectories exist.
 * Creates them if missing. Returns the data directory path.
 */
export function ensureStructure(root?: string): string {
  const dataDir = getDataDir(root);
  for (const sub of SUBDIRS) {
    const dir = join(dataDir, sub);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  return dataDir;
}
