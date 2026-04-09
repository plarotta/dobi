import type { Item, ItemStatus } from "./items.js";

const STATUS_MAP: Record<string, ItemStatus> = {
  "[ ]": "todo",
  "[~]": "wip",
  "[x]": "done",
};

const STATUS_CHECKBOX: Record<ItemStatus, string> = {
  todo: "[ ]",
  wip: "[~]",
  done: "[x]",
};

/**
 * Pattern for parsing an item line:
 *   - [ ] `id` **Title** (N pts) [tag1] [tag2] — Description
 *
 * Groups:
 *   1: checkbox ([ ], [~], [x])
 *   2: id
 *   3: title
 *   4: points
 *   5: rest after points (tags + description)
 */
const ITEM_LINE_RE =
  /^- \[([ ~x])\] `([^`]+)` \*\*(.+?)\*\* \((\d+) pts?\)(.*?)$/;

/**
 * Parse a single markdown item line into an Item, or return null if it doesn't match.
 */
export function parseItemLine(line: string): Item | null {
  const match = line.match(ITEM_LINE_RE);
  if (!match) return null;

  const [, checkbox, id, title, pointsStr, rest] = match;
  const status = STATUS_MAP[`[${checkbox}]`];
  if (!status) return null;

  const points = parseInt(pointsStr, 10);

  // Parse tags: [tagname] patterns
  const tags: string[] = [];
  let remaining = rest.trimStart();
  const tagRe = /^\[([^\]]+)\]/;
  let tagMatch: RegExpMatchArray | null;
  while ((tagMatch = remaining.match(tagRe))) {
    tags.push(tagMatch[1]);
    remaining = remaining.slice(tagMatch[0].length).trimStart();
  }

  // Parse description: everything after " — " or "— "
  let description = "";
  const dashIndex = remaining.indexOf("—");
  if (dashIndex !== -1) {
    description = remaining.slice(dashIndex + 1).trimStart();
  }

  return { id, title, points, tags, description, status };
}

/**
 * Serialize an Item back to its markdown line format.
 */
export function serializeItem(item: Item): string {
  const checkbox = STATUS_CHECKBOX[item.status];
  const tagsStr = item.tags.map((t) => `[${t}]`).join(" ");
  const descStr = item.description ? ` — ${item.description}` : "";
  const tagsPart = tagsStr ? ` ${tagsStr}` : "";

  return `- ${checkbox} \`${item.id}\` **${item.title}** (${item.points} pts)${tagsPart}${descStr}`;
}

/**
 * Parse all item lines from a markdown string. Non-item lines are ignored.
 */
export function parseItems(content: string): Item[] {
  return content
    .split("\n")
    .map(parseItemLine)
    .filter((item): item is Item => item !== null);
}

/**
 * Serialize an array of items to markdown lines.
 */
export function serializeItems(items: Item[]): string {
  return items.map(serializeItem).join("\n");
}
