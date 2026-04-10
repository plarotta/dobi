import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ApprovalManager } from "../approval.js";
import { readBacklog, editItem } from "../../data/backlog.js";
import { serializeItem } from "../../data/markdown.js";

export function createProposeBacklogEditTool(
  dataDir: string,
  approvalManager: ApprovalManager
): AgentTool {
  return {
    name: "propose_backlog_edit",
    description:
      "Proposes editing an existing backlog item. Shows a diff for user approval.",
    label: "Proposing backlog edit",
    parameters: Type.Object({
      item_id: Type.String({ description: "ID of the item to edit" }),
      updates: Type.Object({
        title: Type.Optional(Type.String()),
        points: Type.Optional(Type.Number()),
        tags: Type.Optional(Type.Array(Type.String())),
        description: Type.Optional(Type.String()),
      }),
    }),
    execute: async (toolCallId, params) => {
      const { item_id, updates } = params as {
        item_id: string;
        updates: { title?: string; points?: number; tags?: string[]; description?: string };
      };
      const items = readBacklog(dataDir);
      const current = items.find((i) => i.id === item_id);
      if (!current) {
        return {
          content: [{ type: "text", text: `Item ${item_id} not found in backlog.` }],
          details: { error: "not_found" },
        };
      }

      const updated = { ...current, ...updates };
      const preview = `Before:\n  ${serializeItem(current)}\nAfter:\n  ${serializeItem(updated)}`;

      const result = await approvalManager.requestApproval(toolCallId, {
        type: "backlog_edit",
        title: `Edit "${current.title}"`,
        preview,
        data: { item_id, updates },
      });

      if (result.action === "reject") {
        return {
          content: [{ type: "text", text: "User rejected the edit." }],
          details: { action: "rejected" },
        };
      }

      const finalUpdates =
        result.action === "edit"
          ? (result.data as { item_id: string; updates: Record<string, unknown> }).updates
          : updates;
      try {
        editItem(dataDir, item_id, finalUpdates);
      } catch (err) {
        return {
          content: [{ type: "text", text: `Failed to write backlog: ${err instanceof Error ? err.message : err}` }],
          details: { error: "write_failed" },
        };
      }

      return {
        content: [{ type: "text", text: `Updated item ${item_id}.` }],
        details: { action: result.action, item_id },
      };
    },
  };
}
