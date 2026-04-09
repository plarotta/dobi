import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ApprovalManager } from "../approval.js";
import { getCurrentSprint, updateSprintItem } from "../../data/sprints.js";
import type { ItemStatus } from "../../data/items.js";
import { isValidTransition } from "../../data/items.js";

export function createProposeSprintUpdateTool(
  dataDir: string,
  approvalManager: ApprovalManager
): AgentTool {
  return {
    name: "propose_sprint_update",
    description:
      "Proposes status changes for items in the current sprint (e.g. todo→wip, wip→done). Shows changes for user approval.",
    label: "Proposing sprint update",
    parameters: Type.Object({
      updates: Type.Array(
        Type.Object({
          item_id: Type.String({ description: "ID of the sprint item" }),
          new_status: Type.Union(
            [Type.Literal("todo"), Type.Literal("wip"), Type.Literal("done")],
            { description: "New status" }
          ),
        }),
        { description: "Status changes to apply" }
      ),
    }),
    execute: async (toolCallId, params) => {
      const { updates } = params as {
        updates: Array<{ item_id: string; new_status: ItemStatus }>;
      };
      const sprint = getCurrentSprint(dataDir);
      if (!sprint) {
        return {
          content: [{ type: "text", text: "No active sprint." }],
          details: { error: "no_active_sprint" },
        };
      }

      // Validate all updates
      const previewLines: string[] = [];
      for (const update of updates) {
        const item = sprint.items.find((i) => i.id === update.item_id);
        if (!item) {
          return {
            content: [{ type: "text", text: `Item ${update.item_id} not found in current sprint.` }],
            details: { error: "item_not_found", item_id: update.item_id },
          };
        }
        if (!isValidTransition(item.status, update.new_status)) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid transition for ${update.item_id}: ${item.status} → ${update.new_status}`,
              },
            ],
            details: { error: "invalid_transition" },
          };
        }
        previewLines.push(
          `  ${item.id} "${item.title}": ${item.status} → ${update.new_status}`
        );
      }

      const preview = `Sprint ${sprint.number} status changes:\n${previewLines.join("\n")}`;

      const result = await approvalManager.requestApproval(toolCallId, {
        type: "sprint_update",
        title: "Sprint Status Update",
        preview,
        data: updates,
      });

      if (result.action === "reject") {
        return {
          content: [{ type: "text", text: "User rejected the status update." }],
          details: { action: "rejected" },
        };
      }

      const finalUpdates =
        result.action === "edit"
          ? (result.data as typeof updates)
          : updates;

      for (const update of finalUpdates) {
        updateSprintItem(dataDir, sprint.number, update.item_id, update.new_status);
      }

      return {
        content: [
          { type: "text", text: `Updated ${finalUpdates.length} item(s) in Sprint ${sprint.number}.` },
        ],
        details: { action: result.action, updates: finalUpdates },
      };
    },
  };
}
