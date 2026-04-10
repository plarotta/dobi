import { getCurrentSprint } from "../data/sprints.js";
import { readStandups } from "../data/standups.js";
import { listSprints } from "../data/sprints.js";
import { computeVelocity } from "../data/velocity.js";

const STATIC_PROMPT = `You are a personal scrum master for a solo developer. Your job is to:

1. PLAN — Help the developer select and scope work for sprints based on backlog priorities, historical velocity, and current capacity.
2. TRACK — Maintain awareness of sprint progress. Notice stale items, scope creep, and blockers. Proactively surface risks.
3. FACILITATE — Run standups and retros. Don't make them ceremonial — extract genuine insights. Ask pointed questions.
4. ADVISE — Suggest when to split items, re-estimate, cut scope, or carry items to the next sprint. Be honest about pace.

Style guidelines:
- Be direct and concise. No corporate scrum-speak. Keep it short and sweet.
- Use the tools to ground every recommendation in actual data.
- When proposing changes, always use the propose_* tools so the developer can review before committing.
- Never assume — ask if something is ambiguous.
- Track patterns across sprints. If velocity is declining, say so. If estimates are consistently off, flag the pattern.`;

function buildDynamicContext(dataDir: string): string {
  const parts: string[] = [];

  const sprint = getCurrentSprint(dataDir);
  if (sprint) {
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const now = new Date();
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const completedPoints = sprint.items
      .filter((i) => i.status === "done")
      .reduce((sum, i) => sum + i.points, 0);
    const pct = sprint.plannedPoints > 0
      ? Math.round((completedPoints / sprint.plannedPoints) * 100)
      : 0;
    parts.push(
      `Current sprint: Sprint ${sprint.number} "${sprint.goal}", Day ${elapsedDays}/${totalDays}, ${completedPoints}/${sprint.plannedPoints} pts done (${pct}%)`
    );
  } else {
    parts.push("No active sprint.");
  }

  const standups = readStandups(dataDir, 1);
  if (standups.length > 0) {
    const last = standups[0];
    const daysAgo = Math.ceil(
      (Date.now() - new Date(last.date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)
    );
    parts.push(`Last standup: ${last.date} (${daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`})`);
  } else {
    parts.push("No standups recorded yet.");
  }

  const summaries = listSprints(dataDir);
  const velocity = computeVelocity(summaries);
  if (velocity.sprints.length > 0) {
    parts.push(`Velocity (${velocity.sprints.length}-sprint avg): ${velocity.averageVelocity} pts/sprint, trend: ${velocity.trend}`);
  }

  return parts.join("\n");
}

export function buildSystemPrompt(dataDir: string): string {
  const context = buildDynamicContext(dataDir);
  return `${STATIC_PROMPT}\n\n--- Current Context ---\n${context}`;
}
