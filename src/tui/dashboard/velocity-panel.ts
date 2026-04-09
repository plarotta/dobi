import type { Component } from "@mariozechner/pi-tui";
import { listSprints } from "../../data/sprints.js";
import { computeVelocity } from "../../data/velocity.js";
import { colors } from "../theme.js";

export class VelocityPanel implements Component {
  private velocityData;

  constructor(dataDir: string) {
    const summaries = listSprints(dataDir);
    this.velocityData = computeVelocity(summaries);
  }

  invalidate(): void {}

  render(width: number): string[] {
    const { averageVelocity, sprints, trend } = this.velocityData;
    const lines: string[] = [""];

    if (sprints.length === 0) {
      lines.push(colors.muted("  No closed sprints yet"));
      return lines;
    }

    const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
    lines.push(
      colors.header("  Velocity") +
        colors.muted(` (avg: ${averageVelocity} pts/sprint, trend: ${trendArrow})`)
    );
    lines.push("");

    const maxPlanned = Math.max(...sprints.map((s) => s.planned), 1);
    const labelWidth = 12; // "  Sprint NN  "
    const suffixWidth = 14; // "  NN/NN pts"
    const barMaxWidth = Math.max(width - labelWidth - suffixWidth, 10);

    for (const sprint of sprints) {
      const label = `  Sprint ${String(sprint.number).padStart(2)}  `;
      const completedLen = Math.round(
        (sprint.completed / maxPlanned) * barMaxWidth
      );
      const plannedLen = Math.round(
        (sprint.planned / maxPlanned) * barMaxWidth
      );
      const remainLen = Math.max(plannedLen - completedLen, 0);

      const bar =
        colors.accepted("█".repeat(completedLen)) +
        colors.muted("░".repeat(remainLen));
      const suffix = `  ${sprint.completed}/${sprint.planned} pts`;

      lines.push(label + bar + suffix);
    }

    return lines;
  }
}
