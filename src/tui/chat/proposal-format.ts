/**
 * Human-readable formatting and parsing for proposal data.
 * Replaces raw JSON editing in approval cards.
 */

import type { Item, ItemStatus } from "../../data/items.js";

// ── Formatters ──────────────────────────────────────────

function formatBacklogAdd(data: Item[]): string {
  return data
    .map((item, i) => {
      const lines = [
        `Item ${i + 1}:`,
        `  Title: ${item.title}`,
        `  Points: ${item.points}`,
        `  Tags: ${item.tags.join(", ") || "none"}`,
        `  Description: ${item.description || "none"}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}

function formatBacklogEdit(data: { item_id: string; updates: Record<string, unknown> }): string {
  const lines = [`Item ID: ${data.item_id}`];
  const u = data.updates;
  if (u.title !== undefined) lines.push(`Title: ${u.title}`);
  if (u.points !== undefined) lines.push(`Points: ${u.points}`);
  if (u.tags !== undefined) lines.push(`Tags: ${(u.tags as string[]).join(", ")}`);
  if (u.description !== undefined) lines.push(`Description: ${u.description}`);
  return lines.join("\n");
}

function formatSprintPlan(data: { goal: string; duration_weeks: number; start_date: string; items: Item[] }): string {
  const lines = [
    `Goal: ${data.goal}`,
    `Duration: ${data.duration_weeks} weeks`,
    `Start: ${data.start_date}`,
    "",
    "Items:",
    ...data.items.map((i) => `  - ${i.id} ${i.title} (${i.points} pts) [${i.tags.join(", ")}]`),
  ];
  return lines.join("\n");
}

function formatSprintUpdate(data: Array<{ item_id: string; new_status: ItemStatus }>): string {
  return data.map((u) => `${u.item_id}: ${u.new_status}`).join("\n");
}

function formatSprintClose(data: { incomplete_action: string }): string {
  return `Incomplete items: ${data.incomplete_action}`;
}

function formatStandup(data: { date: string; yesterday: string[]; today: string[]; blockers: string[] }): string {
  const lines = [
    `Date: ${data.date}`,
    "",
    "Yesterday:",
    ...(data.yesterday.length > 0 ? data.yesterday.map((s) => `  - ${s}`) : ["  - (none)"]),
    "",
    "Today:",
    ...(data.today.length > 0 ? data.today.map((s) => `  - ${s}`) : ["  - (none)"]),
    "",
    "Blockers:",
    ...(data.blockers.length > 0 ? data.blockers.map((s) => `  - ${s}`) : ["  - (none)"]),
  ];
  return lines.join("\n");
}

function formatRetro(data: { sprintNumber: number; wentWell: string[]; didntGoWell: string[]; actionItems: string[] }): string {
  const lines = [
    `Sprint: ${data.sprintNumber}`,
    "",
    "What went well:",
    ...data.wentWell.map((s) => `  - ${s}`),
    "",
    "What didn't go well:",
    ...data.didntGoWell.map((s) => `  - ${s}`),
    "",
    "Action items:",
    ...data.actionItems.map((s) => `  - ${s}`),
  ];
  return lines.join("\n");
}

// ── Parsers ─────────────────────────────────────────────

function parseListItems(text: string, header: string): string[] {
  const regex = new RegExp(`${header}:\\s*\\n((?:\\s*-[^\\n]*\\n?)*)`, "i");
  const match = text.match(regex);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter((l) => l.length > 0 && l !== "(none)");
}

function parseField(text: string, field: string): string {
  const regex = new RegExp(`^\\s*${field}:\\s*(.+)$`, "im");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function parseBacklogAdd(text: string): Item[] {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());
  const items: Item[] = [];

  for (const block of blocks) {
    const title = parseField(block, "Title");
    const points = parseInt(parseField(block, "Points") || "0", 10);
    const tagsStr = parseField(block, "Tags");
    const tags = tagsStr && tagsStr !== "none"
      ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    const desc = parseField(block, "Description");
    const description = desc === "none" ? "" : desc;

    // Try to get the id from an existing item block, or it'll be regenerated
    const idMatch = block.match(/ID:\s*(\S+)/i);
    const id = idMatch ? idMatch[1] : "";

    if (title) {
      items.push({ id, title, points, tags, description, status: "todo" as const });
    }
  }

  return items;
}

function parseBacklogEdit(text: string): { item_id: string; updates: Record<string, unknown> } {
  const item_id = parseField(text, "Item ID");
  const updates: Record<string, unknown> = {};

  const title = parseField(text, "Title");
  if (title) updates.title = title;

  const points = parseField(text, "Points");
  if (points) updates.points = parseInt(points, 10);

  const tagsStr = parseField(text, "Tags");
  if (tagsStr) {
    updates.tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
  }

  const desc = parseField(text, "Description");
  if (desc) updates.description = desc;

  return { item_id, updates };
}

function parseSprintPlan(text: string): { goal: string; duration_weeks: number; start_date: string; items: Item[] } {
  const goal = parseField(text, "Goal");
  const durationStr = parseField(text, "Duration");
  const duration_weeks = parseInt(durationStr || "2", 10);
  const start_date = parseField(text, "Start");

  // Parse items: "  - id title (N pts) [tags]"
  const itemLines = text.split("\n").filter((l) => /^\s*-\s+\S/.test(l));
  const items: Item[] = itemLines.map((line) => {
    const m = line.match(/^\s*-\s+(\S+)\s+(.+?)\s+\((\d+)\s*pts?\)\s*\[([^\]]*)\]/);
    if (m) {
      return {
        id: m[1],
        title: m[2],
        points: parseInt(m[3], 10),
        tags: m[4].split(",").map((t) => t.trim()).filter(Boolean),
        description: "",
        status: "todo" as const,
      };
    }
    // Fallback: just grab what we can
    const simple = line.replace(/^\s*-\s+/, "").trim();
    return { id: "", title: simple, points: 0, tags: [], description: "", status: "todo" as const };
  });

  return { goal, duration_weeks, start_date, items };
}

function parseSprintUpdate(text: string): Array<{ item_id: string; new_status: ItemStatus }> {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes(":"))
    .map((l) => {
      const [item_id, status] = l.split(":").map((s) => s.trim());
      return { item_id, new_status: status as ItemStatus };
    });
}

function parseSprintClose(text: string): { incomplete_action: string } {
  const action = parseField(text, "Incomplete items") || "backlog";
  return { incomplete_action: action };
}

function parseStandup(text: string): { date: string; yesterday: string[]; today: string[]; blockers: string[] } {
  return {
    date: parseField(text, "Date"),
    yesterday: parseListItems(text, "Yesterday"),
    today: parseListItems(text, "Today"),
    blockers: parseListItems(text, "Blockers"),
  };
}

function parseRetro(text: string): { sprintNumber: number; wentWell: string[]; didntGoWell: string[]; actionItems: string[] } {
  return {
    sprintNumber: parseInt(parseField(text, "Sprint") || "0", 10),
    wentWell: parseListItems(text, "What went well"),
    didntGoWell: parseListItems(text, "What didn't go well"),
    actionItems: parseListItems(text, "Action items"),
  };
}

// ── Public API ──────────────────────────────────────────

export function formatProposal(type: string, data: unknown): string {
  switch (type) {
    case "backlog_add": return formatBacklogAdd(data as Item[]);
    case "backlog_edit": return formatBacklogEdit(data as { item_id: string; updates: Record<string, unknown> });
    case "backlog_remove": return `Item ID: ${(data as { item_id: string }).item_id}`;
    case "sprint_plan": return formatSprintPlan(data as any);
    case "sprint_update": return formatSprintUpdate(data as any);
    case "sprint_close": return formatSprintClose(data as any);
    case "standup": return formatStandup(data as any);
    case "retro": return formatRetro(data as any);
    default: return JSON.stringify(data, null, 2);
  }
}

export function parseProposal(type: string, text: string): unknown {
  switch (type) {
    case "backlog_add": return parseBacklogAdd(text);
    case "backlog_edit": return parseBacklogEdit(text);
    case "backlog_remove": return { item_id: parseField(text, "Item ID") };
    case "sprint_plan": return parseSprintPlan(text);
    case "sprint_update": return parseSprintUpdate(text);
    case "sprint_close": return parseSprintClose(text);
    case "standup": return parseStandup(text);
    case "retro": return parseRetro(text);
    default: return JSON.parse(text);
  }
}
