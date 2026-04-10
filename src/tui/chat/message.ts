import { Markdown, type Component } from "@mariozechner/pi-tui";
import { markdownTheme, colors } from "../theme.js";

export type MessageRole = "user" | "assistant";

export class MessageComponent implements Component {
  private md: Markdown;
  private role: MessageRole;

  constructor(role: MessageRole, text: string) {
    this.role = role;
    const defaultStyle =
      role === "user"
        ? { color: colors.userMsg }
        : { color: colors.assistantMsg };
    this.md = new Markdown(
      this.format(text),
      1,
      0,
      markdownTheme,
      defaultStyle
    );
  }

  private format(text: string): string {
    // "you " and "dobi" are both 4 chars — keeps message text aligned
    const label = this.role === "user"
      ? colors.userLabel("  you ")
      : colors.assistantLabel("  dobi");
    return `${label} ${text}`;
  }

  setText(text: string): void {
    this.md.setText(this.format(text));
  }

  invalidate(): void {
    this.md.invalidate();
  }

  render(width: number): string[] {
    return this.md.render(width);
  }
}
