import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureStructure } from "../../src/data/paths.js";
import { readBacklog, writeBacklog, addItems, editItem, removeItem } from "../../src/data/backlog.js";
import type { Item } from "../../src/data/items.js";

let tmpDir: string;
let dataDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "dobi-test-"));
  dataDir = ensureStructure(tmpDir);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "test",
    title: "Test task",
    points: 3,
    tags: ["backend"],
    description: "A test task",
    status: "todo",
    ...overrides,
  };
}

describe("backlog CRUD", () => {
  it("returns empty array for missing backlog", () => {
    expect(readBacklog(dataDir)).toEqual([]);
  });

  it("writes and reads items", () => {
    const items = [makeItem({ id: "a1" }), makeItem({ id: "a2", title: "Second" })];
    writeBacklog(dataDir, items);
    const result = readBacklog(dataDir);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("a1");
    expect(result[1].id).toBe("a2");
  });

  it("adds items to existing backlog", () => {
    writeBacklog(dataDir, [makeItem({ id: "a1" })]);
    addItems(dataDir, [makeItem({ id: "a2" })]);
    const result = readBacklog(dataDir);
    expect(result).toHaveLength(2);
  });

  it("edits an item by ID", () => {
    writeBacklog(dataDir, [makeItem({ id: "a1" })]);
    const updated = editItem(dataDir, "a1", { title: "Updated title", points: 5 });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Updated title");
    expect(updated!.points).toBe(5);

    const result = readBacklog(dataDir);
    expect(result[0].title).toBe("Updated title");
  });

  it("returns null when editing non-existent item", () => {
    writeBacklog(dataDir, [makeItem({ id: "a1" })]);
    expect(editItem(dataDir, "nope", { title: "Updated" })).toBeNull();
  });

  it("removes an item by ID", () => {
    writeBacklog(dataDir, [
      makeItem({ id: "a1" }),
      makeItem({ id: "a2", title: "Second" }),
    ]);
    const removed = removeItem(dataDir, "a1");
    expect(removed).not.toBeNull();
    expect(removed!.id).toBe("a1");

    const result = readBacklog(dataDir);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a2");
  });

  it("returns null when removing non-existent item", () => {
    writeBacklog(dataDir, [makeItem({ id: "a1" })]);
    expect(removeItem(dataDir, "nope")).toBeNull();
  });
});
