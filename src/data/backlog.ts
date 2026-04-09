import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Item } from "./items.js";
import { parseItems, serializeItems } from "./markdown.js";

function backlogPath(dataDir: string): string {
  return join(dataDir, "backlog.md");
}

/**
 * Read all items from the backlog.
 */
export function readBacklog(dataDir: string): Item[] {
  const path = backlogPath(dataDir);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf-8");
  return parseItems(content);
}

/**
 * Write items to the backlog, replacing all existing content.
 */
export function writeBacklog(dataDir: string, items: Item[]): void {
  const path = backlogPath(dataDir);
  const header = "# Backlog\n\n";
  writeFileSync(path, header + serializeItems(items) + "\n", "utf-8");
}

/**
 * Add items to the end of the backlog.
 */
export function addItems(dataDir: string, newItems: Item[]): void {
  const existing = readBacklog(dataDir);
  writeBacklog(dataDir, [...existing, ...newItems]);
}

/**
 * Edit a backlog item by ID. Returns the updated item or null if not found.
 */
export function editItem(
  dataDir: string,
  id: string,
  updates: Partial<Omit<Item, "id">>
): Item | null {
  const items = readBacklog(dataDir);
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates };
  writeBacklog(dataDir, items);
  return items[idx];
}

/**
 * Remove a backlog item by ID. Returns the removed item or null if not found.
 */
export function removeItem(dataDir: string, id: string): Item | null {
  const items = readBacklog(dataDir);
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const [removed] = items.splice(idx, 1);
  writeBacklog(dataDir, items);
  return removed;
}
