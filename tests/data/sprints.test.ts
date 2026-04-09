import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureStructure } from "../../src/data/paths.js";
import {
  createSprint,
  readSprint,
  getCurrentSprint,
  updateSprintItem,
  closeSprint,
  listSprints,
} from "../../src/data/sprints.js";
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

function makeItems(): Item[] {
  return [
    { id: "a1", title: "Task A", points: 3, tags: ["backend"], description: "Desc A", status: "todo" },
    { id: "a2", title: "Task B", points: 2, tags: ["infra"], description: "Desc B", status: "todo" },
    { id: "a3", title: "Task C", points: 5, tags: ["frontend"], description: "Desc C", status: "todo" },
  ];
}

describe("sprint lifecycle", () => {
  it("creates a sprint with auto-incrementing number", () => {
    const sprint = createSprint(dataDir, "Auth & CI", 2, "2026-04-07", makeItems());
    expect(sprint.number).toBe(1);
    expect(sprint.goal).toBe("Auth & CI");
    expect(sprint.plannedPoints).toBe(10);
    expect(sprint.status).toBe("active");
    expect(sprint.items).toHaveLength(3);

    const sprint2 = createSprint(dataDir, "Sprint 2", 1, "2026-04-21", [makeItems()[0]]);
    expect(sprint2.number).toBe(2);
  });

  it("reads a sprint by number", () => {
    createSprint(dataDir, "Test Sprint", 2, "2026-04-07", makeItems());
    const sprint = readSprint(dataDir, 1);
    expect(sprint).not.toBeNull();
    expect(sprint!.goal).toBe("Test Sprint");
    expect(sprint!.items).toHaveLength(3);
  });

  it("returns null for non-existent sprint", () => {
    expect(readSprint(dataDir, 99)).toBeNull();
  });

  it("finds the current active sprint", () => {
    createSprint(dataDir, "Sprint 1", 2, "2026-04-07", makeItems());
    const current = getCurrentSprint(dataDir);
    expect(current).not.toBeNull();
    expect(current!.goal).toBe("Sprint 1");
  });

  it("returns null when no active sprint", () => {
    createSprint(dataDir, "Sprint 1", 2, "2026-04-07", makeItems());
    closeSprint(dataDir, 1);
    expect(getCurrentSprint(dataDir)).toBeNull();
  });

  it("updates a sprint item status", () => {
    createSprint(dataDir, "Test", 2, "2026-04-07", makeItems());
    const updated = updateSprintItem(dataDir, 1, "a1", "done");
    expect(updated).not.toBeNull();

    const sprint = readSprint(dataDir, 1);
    expect(sprint!.items.find((i) => i.id === "a1")!.status).toBe("done");
    expect(sprint!.completedPoints).toBe(3);
  });

  it("closes a sprint and returns incomplete items", () => {
    createSprint(dataDir, "Test", 2, "2026-04-07", makeItems());
    updateSprintItem(dataDir, 1, "a1", "done");

    const result = closeSprint(dataDir, 1);
    expect(result).not.toBeNull();
    expect(result!.sprint.status).toBe("closed");
    expect(result!.sprint.completedPoints).toBe(3);
    expect(result!.incompleteItems).toHaveLength(2);
    expect(result!.incompleteItems.map((i) => i.id)).toEqual(["a2", "a3"]);
  });

  it("lists sprint summaries newest first", () => {
    createSprint(dataDir, "Sprint 1", 2, "2026-04-07", makeItems());
    createSprint(dataDir, "Sprint 2", 2, "2026-04-21", [makeItems()[0]]);

    const summaries = listSprints(dataDir);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].number).toBe(2);
    expect(summaries[1].number).toBe(1);
  });
});
