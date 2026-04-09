import type { Component } from "@mariozechner/pi-tui";
import { getCurrentSprint } from "../../data/sprints.js";
import type { Item, ItemStatus } from "../../data/items.js";
import { colors } from "../theme.js";

export class BoardPanel implements Component {
  private todoItems: Item[] = [];
  private wipItems: Item[] = [];
  private doneItems: Item[] = [];
  private noSprint = false;

  constructor(dataDir: string) {
    const sprint = getCurrentSprint(dataDir);
    if (!sprint) {
      this.noSprint = true;
      return;
    }
    this.todoItems = sprint.items.filter((i) => i.status === "todo");
    this.wipItems = sprint.items.filter((i) => i.status === "wip");
    this.doneItems = sprint.items.filter((i) => i.status === "done");
  }

  invalidate(): void {}

  render(width: number): string[] {
    if (this.noSprint) {
      return ["", colors.muted("  No active sprint")];
    }

    const colWidth = Math.floor((width - 4) / 3); // 4 for padding/separators
    const lines: string[] = [""];

    // Column headers
    lines.push(
      "  " +
        colors.header(pad("TODO", colWidth)) +
        colors.header(pad("WIP", colWidth)) +
        colors.header(pad("DONE", colWidth))
    );
    lines.push(
      "  " +
        colors.border(pad("─".repeat(colWidth - 1), colWidth)) +
        colors.border(pad("─".repeat(colWidth - 1), colWidth)) +
        colors.border(pad("─".repeat(colWidth - 1), colWidth))
    );

    // Item rows
    const maxRows = Math.max(
      this.todoItems.length,
      this.wipItems.length,
      this.doneItems.length
    );

    for (let i = 0; i < maxRows; i++) {
      const todoCard = this.formatCard(this.todoItems[i], colWidth);
      const wipCard = this.formatCard(this.wipItems[i], colWidth);
      const doneCard = this.formatCard(this.doneItems[i], colWidth);
      lines.push("  " + todoCard + wipCard + doneCard);
    }

    if (maxRows === 0) {
      lines.push(colors.muted("  No items in sprint"));
    }

    return lines;
  }

  private formatCard(item: Item | undefined, colWidth: number): string {
    if (!item) return pad("", colWidth);
    const tags = item.tags.length > 0 ? ` [${item.tags.join("][")}]` : "";
    const text = `${item.id} ${item.title} (${item.points}pts)${tags}`;
    return pad(truncate(text, colWidth - 1), colWidth);
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

function pad(str: string, width: number): string {
  if (str.length >= width) return str;
  return str + " ".repeat(width - str.length);
}
