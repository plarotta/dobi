import type { Component } from "@mariozechner/pi-tui";
import { readBacklog } from "../../data/backlog.js";
import type { Item } from "../../data/items.js";
import { colors } from "../theme.js";

export class BacklogPanel implements Component {
  private items: Item[];

  constructor(dataDir: string) {
    this.items = readBacklog(dataDir);
  }

  invalidate(): void {}

  render(width: number): string[] {
    const lines: string[] = [""];

    if (this.items.length === 0) {
      lines.push(colors.muted("  Backlog is empty"));
      return lines;
    }

    const totalPts = this.items.reduce((sum, i) => sum + i.points, 0);
    lines.push(
      colors.header(`  Backlog`) +
        colors.muted(` (${this.items.length} items, ${totalPts} pts)`)
    );
    lines.push("");

    for (const item of this.items) {
      const tags =
        item.tags.length > 0
          ? " " + item.tags.map((t) => colors.muted(`[${t}]`)).join("")
          : "";
      lines.push(
        `  ${colors.header(item.id)}  ${item.title}  ${colors.muted(`${item.points} pts`)}${tags}`
      );
    }

    return lines;
  }
}
