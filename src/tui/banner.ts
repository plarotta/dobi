import type { Component } from "@mariozechner/pi-tui";
import { colors } from "./theme.js";

export class Banner implements Component {
  invalidate(): void {}

  render(width: number): string[] {
    const text = " ◆  d o b i ";
    const sub = "your scrum master";
    const innerWidth = Math.max(text.length, sub.length) + 4;
    const pad = (s: string) => {
      const total = innerWidth - s.length;
      const left = Math.floor(total / 2);
      const right = total - left;
      return " ".repeat(left) + s + " ".repeat(right);
    };

    const top = "┌" + "─".repeat(innerWidth) + "┐";
    const mid1 = "│" + pad(text) + "│";
    const mid2 = "│" + pad(sub) + "│";
    const bot = "└" + "─".repeat(innerWidth) + "┘";

    const center = (line: string, raw: string) => {
      const offset = Math.max(0, Math.floor((width - raw.length) / 2));
      return " ".repeat(offset) + line;
    };

    const b = colors.border;
    const lines = [
      "",
      center(b(top), top),
      center(b("│") + colors.logo(pad(text)) + b("│"), mid1),
      center(b("│") + colors.dim(pad(sub)) + b("│"), mid2),
      center(b(bot), bot),
      "",
    ];

    return lines;
  }
}
