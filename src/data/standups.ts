import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface Standup {
  date: string; // YYYY-MM-DD
  yesterday: string[];
  today: string[];
  blockers: string[];
}

function standupsDir(dataDir: string): string {
  return join(dataDir, "standups");
}

function standupPath(dataDir: string, date: string): string {
  return join(standupsDir(dataDir), `${date}.md`);
}

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Parse a standup markdown file.
 */
function parseStandup(content: string, date: string): Standup {
  const yesterday: string[] = [];
  const today: string[] = [];
  const blockers: string[] = [];

  let section: "none" | "yesterday" | "today" | "blockers" = "none";

  for (const line of content.split("\n")) {
    if (line.startsWith("## Yesterday")) {
      section = "yesterday";
    } else if (line.startsWith("## Today")) {
      section = "today";
    } else if (line.startsWith("## Blockers")) {
      section = "blockers";
    } else if (line.startsWith("- ")) {
      const text = line.slice(2).trim();
      if (text === "None") continue;
      if (section === "yesterday") yesterday.push(text);
      else if (section === "today") today.push(text);
      else if (section === "blockers") blockers.push(text);
    }
  }

  return { date, yesterday, today, blockers };
}

/**
 * Serialize a standup to markdown.
 */
function serializeStandup(standup: Standup): string {
  const heading = formatDateHeading(standup.date);
  const yesterdayList =
    standup.yesterday.length > 0
      ? standup.yesterday.map((s) => `- ${s}`).join("\n")
      : "- None";
  const todayList =
    standup.today.length > 0
      ? standup.today.map((s) => `- ${s}`).join("\n")
      : "- None";
  const blockersList =
    standup.blockers.length > 0
      ? standup.blockers.map((s) => `- ${s}`).join("\n")
      : "- None";

  return [
    `# Standup — ${heading}`,
    "",
    "## Yesterday",
    yesterdayList,
    "",
    "## Today",
    todayList,
    "",
    "## Blockers",
    blockersList,
    "",
  ].join("\n");
}

/**
 * Read the last N standups, sorted newest first.
 */
export function readStandups(dataDir: string, count = 5): Standup[] {
  const dir = standupsDir(dataDir);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort()
    .reverse()
    .slice(0, count);

  return files.map((f) => {
    const date = f.replace(".md", "");
    const content = readFileSync(join(dir, f), "utf-8");
    return parseStandup(content, date);
  });
}

/**
 * Write a standup to disk.
 */
export function writeStandup(dataDir: string, standup: Standup): void {
  const path = standupPath(dataDir, standup.date);
  writeFileSync(path, serializeStandup(standup), "utf-8");
}
