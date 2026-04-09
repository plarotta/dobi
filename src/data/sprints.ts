import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Item, ItemStatus } from "./items.js";
import { parseItems, serializeItems } from "./markdown.js";

export type SprintStatus = "active" | "closed";

export interface Sprint {
  number: number;
  goal: string;
  durationWeeks: number;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string;
  plannedPoints: number;
  completedPoints: number;
  status: SprintStatus;
  items: Item[];
}

export interface SprintSummary {
  number: number;
  goal: string;
  plannedPoints: number;
  completedPoints: number;
  status: SprintStatus;
  startDate: string;
  endDate: string;
}

function sprintsDir(dataDir: string): string {
  return join(dataDir, "sprints");
}

function sprintFilename(num: number): string {
  return `sprint-${String(num).padStart(3, "0")}.md`;
}

function sprintPath(dataDir: string, num: number): string {
  return join(sprintsDir(dataDir), sprintFilename(num));
}

/**
 * Parse a sprint file into a Sprint object.
 */
function parseSprint(content: string, num: number): Sprint {
  const lines = content.split("\n");

  let goal = "";
  let durationWeeks = 2;
  let startDate = "";
  let endDate = "";
  let plannedPoints = 0;
  let completedPoints = 0;
  let status: SprintStatus = "active";

  for (const line of lines) {
    const goalMatch = line.match(/^# Sprint \d+ — "(.+)"$/);
    if (goalMatch) {
      goal = goalMatch[1];
      continue;
    }

    if (line.startsWith("- **Goal:**")) {
      goal = goal || line.replace("- **Goal:**", "").trim();
    } else if (line.startsWith("- **Duration:**")) {
      const durMatch = line.match(/(\d+) weeks?/);
      if (durMatch) durationWeeks = parseInt(durMatch[1], 10);
      const dateMatch = line.match(
        /\((\d{4}-\d{2}-\d{2})\s*[–-]\s*(\d{4}-\d{2}-\d{2})\)/
      );
      if (dateMatch) {
        startDate = dateMatch[1];
        endDate = dateMatch[2];
      }
    } else if (line.startsWith("- **Planned:**")) {
      const ptsMatch = line.match(/(\d+) pts/);
      if (ptsMatch) plannedPoints = parseInt(ptsMatch[1], 10);
    } else if (line.startsWith("- **Completed:**")) {
      const ptsMatch = line.match(/(\d+) pts/);
      if (ptsMatch) completedPoints = parseInt(ptsMatch[1], 10);
    } else if (line.startsWith("- **Status:**")) {
      status = line.includes("closed") ? "closed" : "active";
    }
  }

  const items = parseItems(content);

  return {
    number: num,
    goal,
    durationWeeks,
    startDate,
    endDate,
    plannedPoints,
    completedPoints,
    status,
    items,
  };
}

/**
 * Serialize a Sprint to markdown.
 */
function serializeSprint(sprint: Sprint): string {
  const completedPoints = sprint.items
    .filter((i) => i.status === "done")
    .reduce((sum, i) => sum + i.points, 0);

  const lines = [
    `# Sprint ${sprint.number} — "${sprint.goal}"`,
    "",
    `- **Goal:** ${sprint.goal}`,
    `- **Duration:** ${sprint.durationWeeks} weeks (${sprint.startDate} – ${sprint.endDate})`,
    `- **Planned:** ${sprint.plannedPoints} pts`,
    `- **Completed:** ${completedPoints} pts`,
    `- **Status:** ${sprint.status}`,
    "",
    "## Items",
    "",
    serializeItems(sprint.items),
    "",
  ];

  return lines.join("\n");
}

/**
 * List all sprint numbers from the sprints directory.
 */
function listSprintNumbers(dataDir: string): number[] {
  const dir = sprintsDir(dataDir);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => /^sprint-\d+\.md$/.test(f))
    .map((f) => parseInt(f.match(/sprint-(\d+)\.md/)![1], 10))
    .sort((a, b) => a - b);
}

/**
 * Read a specific sprint by number.
 */
export function readSprint(dataDir: string, num: number): Sprint | null {
  const path = sprintPath(dataDir, num);
  if (!existsSync(path)) return null;
  return parseSprint(readFileSync(path, "utf-8"), num);
}

/**
 * Find the current active sprint, if any.
 */
export function getCurrentSprint(dataDir: string): Sprint | null {
  const numbers = listSprintNumbers(dataDir);
  for (const num of numbers.reverse()) {
    const sprint = readSprint(dataDir, num);
    if (sprint && sprint.status === "active") return sprint;
  }
  return null;
}

/**
 * Get the next sprint number (auto-increment).
 */
function nextSprintNumber(dataDir: string): number {
  const numbers = listSprintNumbers(dataDir);
  return numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
}

/**
 * Create a new sprint. Returns the created Sprint.
 */
export function createSprint(
  dataDir: string,
  goal: string,
  durationWeeks: number,
  startDate: string,
  items: Item[]
): Sprint {
  const num = nextSprintNumber(dataDir);

  // Compute end date
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + durationWeeks * 7);
  const endDate = end.toISOString().split("T")[0];

  // All items start as todo in a new sprint
  const sprintItems = items.map((item) => ({ ...item, status: "todo" as const }));
  const plannedPoints = sprintItems.reduce((sum, i) => sum + i.points, 0);

  const sprint: Sprint = {
    number: num,
    goal,
    durationWeeks,
    startDate,
    endDate,
    plannedPoints,
    completedPoints: 0,
    status: "active",
    items: sprintItems,
  };

  writeFileSync(sprintPath(dataDir, num), serializeSprint(sprint), "utf-8");
  return sprint;
}

/**
 * Update an item's status in a sprint.
 */
export function updateSprintItem(
  dataDir: string,
  sprintNum: number,
  itemId: string,
  newStatus: ItemStatus
): Sprint | null {
  const sprint = readSprint(dataDir, sprintNum);
  if (!sprint) return null;

  const item = sprint.items.find((i) => i.id === itemId);
  if (!item) return null;

  item.status = newStatus;
  sprint.completedPoints = sprint.items
    .filter((i) => i.status === "done")
    .reduce((sum, i) => sum + i.points, 0);

  writeFileSync(
    sprintPath(dataDir, sprintNum),
    serializeSprint(sprint),
    "utf-8"
  );
  return sprint;
}

/**
 * Close a sprint. Moves incomplete items back to backlog if specified.
 * Returns the closed sprint and any incomplete items.
 */
export function closeSprint(
  dataDir: string,
  sprintNum: number
): { sprint: Sprint; incompleteItems: Item[] } | null {
  const sprint = readSprint(dataDir, sprintNum);
  if (!sprint) return null;

  sprint.status = "closed";
  sprint.completedPoints = sprint.items
    .filter((i) => i.status === "done")
    .reduce((sum, i) => sum + i.points, 0);

  const incompleteItems = sprint.items.filter((i) => i.status !== "done");

  writeFileSync(
    sprintPath(dataDir, sprintNum),
    serializeSprint(sprint),
    "utf-8"
  );

  return { sprint, incompleteItems };
}

/**
 * Get summaries of all sprints, newest first.
 */
export function listSprints(dataDir: string): SprintSummary[] {
  return listSprintNumbers(dataDir)
    .reverse()
    .map((num) => {
      const sprint = readSprint(dataDir, num);
      if (!sprint) return null;
      return {
        number: sprint.number,
        goal: sprint.goal,
        plannedPoints: sprint.plannedPoints,
        completedPoints: sprint.completedPoints,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      };
    })
    .filter((s): s is SprintSummary => s !== null);
}
