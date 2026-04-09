import type { Component } from "@mariozechner/pi-tui";
import { readRetros } from "../../data/retros.js";
import type { Retro } from "../../data/retros.js";
import { colors } from "../theme.js";

export class RetrosPanel implements Component {
  private retros: Retro[];

  constructor(dataDir: string) {
    this.retros = readRetros(dataDir, 5);
  }

  invalidate(): void {}

  render(width: number): string[] {
    const lines: string[] = [""];

    if (this.retros.length === 0) {
      lines.push(colors.muted("  No retrospectives recorded yet"));
      return lines;
    }

    lines.push(colors.header("  Retrospectives"));
    lines.push("");

    for (const retro of this.retros) {
      lines.push(colors.header(`  Sprint ${retro.sprintNumber}`));

      if (retro.wentWell.length > 0) {
        lines.push(colors.accepted("  What went well:"));
        for (const item of retro.wentWell) {
          lines.push(`    - ${item}`);
        }
      }

      if (retro.didntGoWell.length > 0) {
        lines.push(colors.rejected("  What didn't go well:"));
        for (const item of retro.didntGoWell) {
          lines.push(`    - ${item}`);
        }
      }

      if (retro.actionItems.length > 0) {
        lines.push(colors.muted("  Action items:"));
        for (const item of retro.actionItems) {
          lines.push(`    - ${item}`);
        }
      }

      lines.push("");
    }

    return lines;
  }
}
