import { EventEmitter } from "node:events";

export type ApprovalAction =
  | { action: "accept" }
  | { action: "reject" }
  | { action: "edit"; data: unknown };

export interface Proposal {
  type: string;
  title: string;
  preview: string;
  data: unknown;
}

interface PendingApproval {
  proposal: Proposal;
  resolve: (result: ApprovalAction) => void;
}

export class ApprovalManager extends EventEmitter {
  private pending = new Map<string, PendingApproval>();

  /**
   * Request user approval for a proposal. Blocks until respond() is called.
   * Emits a "proposal" event for the TUI to render.
   */
  requestApproval(toolCallId: string, proposal: Proposal): Promise<ApprovalAction> {
    return new Promise<ApprovalAction>((resolve) => {
      this.pending.set(toolCallId, { proposal, resolve });
      this.emit("proposal", toolCallId, proposal);
    });
  }

  /**
   * Respond to a pending proposal. Resolves the blocking promise in the tool.
   */
  respond(toolCallId: string, result: ApprovalAction): void {
    const entry = this.pending.get(toolCallId);
    if (!entry) return;
    this.pending.delete(toolCallId);
    entry.resolve(result);
  }

  /**
   * Get the pending proposal for a tool call, if any.
   */
  getPending(toolCallId: string): Proposal | undefined {
    return this.pending.get(toolCallId)?.proposal;
  }

  /**
   * Check if there are any pending proposals.
   */
  hasPending(): boolean {
    return this.pending.size > 0;
  }
}
