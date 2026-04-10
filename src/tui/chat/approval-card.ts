import { Text, type Component, type Focusable, type TUI, Editor } from "@mariozechner/pi-tui";
import type { ApprovalManager, Proposal } from "../../agent/approval.js";
import { colors, editorTheme } from "../theme.js";
import { formatProposal, parseProposal } from "./proposal-format.js";

export class ApprovalCard implements Component, Focusable {
  focused = false;
  private toolCallId: string;
  private proposal: Proposal;
  private approvalManager: ApprovalManager;
  private tui: TUI;
  private resolved = false;

  private header: Text;
  private body: Text;
  private footer: Text;

  constructor(
    tui: TUI,
    toolCallId: string,
    proposal: Proposal,
    approvalManager: ApprovalManager
  ) {
    this.tui = tui;
    this.toolCallId = toolCallId;
    this.proposal = proposal;
    this.approvalManager = approvalManager;

    this.header = new Text(this.buildHeader());
    this.body = new Text(this.buildBody(proposal.preview));
    this.footer = new Text(this.buildFooter());
  }

  private buildHeader(): string {
    const title = ` ${this.proposal.title} `;
    const line = "─".repeat(Math.max(0, 50 - title.length));
    return colors.proposalBorder("  ┌") + colors.proposalTitle(title) + colors.proposalBorder(line + "┐");
  }

  private buildBody(preview: string): string {
    return preview
      .split("\n")
      .map((line) => colors.proposalBorder("  │ ") + colors.proposalBody(line))
      .join("\n");
  }

  private buildFooter(): string {
    const actions =
      colors.accepted(" ● y ") + colors.muted("accept") +
      "   " +
      colors.header(" ● e ") + colors.muted("edit") +
      "   " +
      colors.rejected(" ● n ") + colors.muted("reject");
    return colors.proposalBorder("  └─ ") + actions + colors.proposalBorder(" ─┘");
  }

  handleInput(data: string): void {
    if (this.resolved) return;

    if (data === "y" || data === "Y") {
      this.resolved = true;
      this.footer = new Text(colors.accepted("  ✓ Accepted"));
      this.approvalManager.respond(this.toolCallId, { action: "accept" });
    } else if (data === "n" || data === "N") {
      this.resolved = true;
      this.footer = new Text(colors.rejected("  ✗ Rejected"));
      this.approvalManager.respond(this.toolCallId, { action: "reject" });
    } else if (data === "e" || data === "E") {
      this.openEditor();
    }
  }

  private openEditor(): void {
    const editor = new Editor(this.tui, editorTheme);
    const formatted = formatProposal(this.proposal.type, this.proposal.data);
    editor.setText(formatted);
    editor.onSubmit = (text: string) => {
      this.resolved = true;
      try {
        const data = parseProposal(this.proposal.type, text);
        this.footer = new Text(colors.accepted("  ✓ Accepted (edited)"));
        this.approvalManager.respond(this.toolCallId, {
          action: "edit",
          data,
        });
      } catch {
        this.footer = new Text(colors.error("  ✗ Could not parse edits — rejected"));
        this.approvalManager.respond(this.toolCallId, { action: "reject" });
      }
      this.tui.hideOverlay();
    };
    this.tui.showOverlay(editor, { width: "80%", maxHeight: "60%", anchor: "center" });
  }

  invalidate(): void {
    this.header.invalidate();
    this.body.invalidate();
    this.footer.invalidate();
  }

  render(width: number): string[] {
    return [
      ...this.header.render(width),
      ...this.body.render(width),
      ...this.footer.render(width),
    ];
  }
}
