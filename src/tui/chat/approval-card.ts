import { Text, type Component, type Focusable, type TUI, Editor } from "@mariozechner/pi-tui";
import type { ApprovalManager, Proposal } from "../../agent/approval.js";
import { colors, editorTheme } from "../theme.js";

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

    this.header = new Text(
      colors.proposalBorder(`┌─ PROPOSAL: ${proposal.title} ${"─".repeat(40)}`)
    );
    this.body = new Text(proposal.preview, 2);
    this.footer = new Text(
      colors.proposalBorder("└─ ") +
        colors.accepted("[y] Accept") +
        "    " +
        colors.header("[e] Edit") +
        "    " +
        colors.rejected("[n] Reject") +
        colors.proposalBorder(" ─┘")
    );
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
    editor.setText(JSON.stringify(this.proposal.data, null, 2));
    editor.onSubmit = (text: string) => {
      this.resolved = true;
      try {
        const data = JSON.parse(text);
        this.footer = new Text(colors.accepted("  ✓ Accepted (edited)"));
        this.approvalManager.respond(this.toolCallId, {
          action: "edit",
          data,
        });
      } catch {
        this.footer = new Text(colors.error("  ✗ Invalid JSON — rejected"));
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
