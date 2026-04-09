import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface Retro {
  sprintNumber: number;
  wentWell: string[];
  didntGoWell: string[];
  actionItems: string[];
}

function retrosDir(dataDir: string): string {
  return join(dataDir, "retros");
}

function retroPath(dataDir: string, sprintNumber: number): string {
  return join(
    retrosDir(dataDir),
    `sprint-${String(sprintNumber).padStart(3, "0")}-retro.md`
  );
}

/**
 * Parse a retro markdown file.
 */
function parseRetro(content: string, sprintNumber: number): Retro {
  const wentWell: string[] = [];
  const didntGoWell: string[] = [];
  const actionItems: string[] = [];

  let section: "none" | "well" | "bad" | "actions" = "none";

  for (const line of content.split("\n")) {
    if (line.startsWith("## What went well")) {
      section = "well";
    } else if (line.startsWith("## What didn't")) {
      section = "bad";
    } else if (line.startsWith("## Action items")) {
      section = "actions";
    } else if (line.startsWith("- ")) {
      const text = line.replace(/^- \[[ x]\] /, "").replace(/^- /, "").trim();
      if (section === "well") wentWell.push(text);
      else if (section === "bad") didntGoWell.push(text);
      else if (section === "actions") actionItems.push(text);
    }
  }

  return { sprintNumber, wentWell, didntGoWell, actionItems };
}

/**
 * Serialize a retro to markdown.
 */
function serializeRetro(retro: Retro): string {
  const wellList =
    retro.wentWell.length > 0
      ? retro.wentWell.map((s) => `- ${s}`).join("\n")
      : "";
  const badList =
    retro.didntGoWell.length > 0
      ? retro.didntGoWell.map((s) => `- ${s}`).join("\n")
      : "";
  const actionList =
    retro.actionItems.length > 0
      ? retro.actionItems.map((s) => `- [ ] ${s}`).join("\n")
      : "";

  return [
    `# Retrospective — Sprint ${retro.sprintNumber}`,
    "",
    "## What went well",
    wellList,
    "",
    "## What didn't go well",
    badList,
    "",
    "## Action items",
    actionList,
    "",
  ].join("\n");
}

/**
 * Read the last N retros, sorted newest first.
 */
export function readRetros(dataDir: string, count = 5): Retro[] {
  const dir = retrosDir(dataDir);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter((f) => /^sprint-\d+-retro\.md$/.test(f))
    .sort()
    .reverse()
    .slice(0, count);

  return files.map((f) => {
    const numMatch = f.match(/sprint-(\d+)-retro\.md/);
    const sprintNumber = numMatch ? parseInt(numMatch[1], 10) : 0;
    const content = readFileSync(join(dir, f), "utf-8");
    return parseRetro(content, sprintNumber);
  });
}

/**
 * Write a retro to disk.
 */
export function writeRetro(dataDir: string, retro: Retro): void {
  const path = retroPath(dataDir, retro.sprintNumber);
  writeFileSync(path, serializeRetro(retro), "utf-8");
}
