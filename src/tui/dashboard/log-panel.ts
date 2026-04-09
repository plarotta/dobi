import type { Component } from "@mariozechner/pi-tui";
import { readStandups } from "../../data/standups.js";
import type { Standup } from "../../data/standups.js";
import { colors } from "../theme.js";

export class LogPanel implements Component {
  private standups: Standup[];

  constructor(dataDir: string) {
    this.standups = readStandups(dataDir, 5);
  }

  invalidate(): void {}

  render(width: number): string[] {
    const lines: string[] = [""];

    if (this.standups.length === 0) {
      lines.push(colors.muted("  No standups recorded yet"));
      return lines;
    }

    lines.push(colors.header("  Standup Log"));
    lines.push("");

    for (const standup of this.standups) {
      lines.push(colors.header(`  ${standup.date}`));

      if (standup.yesterday.length > 0) {
        lines.push(colors.muted("  Yesterday:"));
        for (const item of standup.yesterday) {
          lines.push(`    - ${item}`);
        }
      }

      if (standup.today.length > 0) {
        lines.push(colors.muted("  Today:"));
        for (const item of standup.today) {
          lines.push(`    - ${item}`);
        }
      }

      if (standup.blockers.length > 0) {
        lines.push(colors.rejected("  Blockers:"));
        for (const item of standup.blockers) {
          lines.push(`    - ${item}`);
        }
      }

      lines.push("");
    }

    return lines;
  }
}
