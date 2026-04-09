import { Markdown, type Component } from "@mariozechner/pi-tui";
import { markdownTheme, colors } from "../theme.js";

export type MessageRole = "user" | "assistant";

export class MessageComponent implements Component {
  private md: Markdown;
  private role: MessageRole;

  constructor(role: MessageRole, text: string) {
    this.role = role;
    const prefix = role === "user" ? "> you:" : "dobi:";
    const defaultStyle =
      role === "user"
        ? { color: colors.userMsg }
        : { color: colors.assistantMsg };
    this.md = new Markdown(
      `${prefix} ${text}`,
      1,
      0,
      markdownTheme,
      defaultStyle
    );
  }

  setText(text: string): void {
    const prefix = this.role === "user" ? "> you:" : "dobi:";
    this.md.setText(`${prefix} ${text}`);
  }

  invalidate(): void {
    this.md.invalidate();
  }

  render(width: number): string[] {
    return this.md.render(width);
  }
}
