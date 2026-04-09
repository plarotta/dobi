import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ApprovalManager } from "../approval.js";
import { readBacklog, removeItem } from "../../data/backlog.js";
import { serializeItem } from "../../data/markdown.js";

export function createProposeBacklogRemoveTool(
  dataDir: string,
  approvalManager: ApprovalManager
): AgentTool {
  return {
    name: "propose_backlog_remove",
    description:
      "Proposes removing a backlog item. Shows which item will be removed for user approval.",
    label: "Proposing backlog removal",
    parameters: Type.Object({
      item_id: Type.String({ description: "ID of the item to remove" }),
    }),
    execute: async (toolCallId, params) => {
      const { item_id } = params as { item_id: string };
      const items = readBacklog(dataDir);
      const item = items.find((i) => i.id === item_id);
      if (!item) {
        return {
          content: [{ type: "text", text: `Item ${item_id} not found in backlog.` }],
          details: { error: "not_found" },
        };
      }

      const result = await approvalManager.requestApproval(toolCallId, {
        type: "backlog_remove",
        title: `Remove "${item.title}"`,
        preview: `Will remove:\n  ${serializeItem(item)}`,
        data: { item_id },
      });

      if (result.action === "reject") {
        return {
          content: [{ type: "text", text: "User rejected the removal." }],
          details: { action: "rejected" },
        };
      }

      removeItem(dataDir, item_id);
      return {
        content: [{ type: "text", text: `Removed item ${item_id} ("${item.title}") from backlog.` }],
        details: { action: "accepted", item },
      };
    },
  };
}
