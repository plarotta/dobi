import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ApprovalManager } from "../approval.js";
import { getCurrentSprint, closeSprint } from "../../data/sprints.js";
import { addItems } from "../../data/backlog.js";
import { serializeItem } from "../../data/markdown.js";

export function createProposeSprintCloseTool(
  dataDir: string,
  approvalManager: ApprovalManager
): AgentTool {
  return {
    name: "propose_sprint_close",
    description:
      "Proposes closing the current sprint. Shows a summary and handles incomplete items (move to backlog or leave in closed sprint).",
    label: "Proposing sprint close",
    parameters: Type.Object({
      incomplete_action: Type.Union(
        [Type.Literal("backlog"), Type.Literal("carry")],
        {
          description:
            '"backlog" moves incomplete items back to backlog. "carry" leaves them for the next sprint plan to pick up.',
        }
      ),
    }),
    execute: async (toolCallId, params) => {
      const { incomplete_action } = params as { incomplete_action: "backlog" | "carry" };
      const sprint = getCurrentSprint(dataDir);
      if (!sprint) {
        return {
          content: [{ type: "text", text: "No active sprint to close." }],
          details: { error: "no_active_sprint" },
        };
      }

      const doneItems = sprint.items.filter((i) => i.status === "done");
      const incompleteItems = sprint.items.filter((i) => i.status !== "done");
      const completedPts = doneItems.reduce((sum, i) => sum + i.points, 0);

      const lines = [
        `Sprint ${sprint.number} — "${sprint.goal}"`,
        `Completed: ${completedPts}/${sprint.plannedPoints} pts (${doneItems.length}/${sprint.items.length} items)`,
      ];

      if (incompleteItems.length > 0) {
        const action =
          incomplete_action === "backlog"
            ? "moved back to backlog"
            : "left for next sprint to pick up";
        lines.push("", `Incomplete items (will be ${action}):`);
        for (const item of incompleteItems) {
          lines.push(`  ${serializeItem(item)}`);
        }
      }

      const result = await approvalManager.requestApproval(toolCallId, {
        type: "sprint_close",
        title: "Close Sprint",
        preview: lines.join("\n"),
        data: { incomplete_action },
      });

      if (result.action === "reject") {
        return {
          content: [{ type: "text", text: "User rejected closing the sprint." }],
          details: { action: "rejected" },
        };
      }

      const finalAction =
        result.action === "edit"
          ? (result.data as { incomplete_action: "backlog" | "carry" }).incomplete_action
          : incomplete_action;

      const closeResult = closeSprint(dataDir, sprint.number);
      if (!closeResult) {
        return {
          content: [{ type: "text", text: "Failed to close sprint." }],
          details: { error: "close_failed" },
        };
      }

      if (finalAction === "backlog" && closeResult.incompleteItems.length > 0) {
        // Reset incomplete items to todo before adding to backlog
        const resetItems = closeResult.incompleteItems.map((i) => ({
          ...i,
          status: "todo" as const,
        }));
        addItems(dataDir, resetItems);
      }

      return {
        content: [
          {
            type: "text",
            text: `Closed Sprint ${sprint.number}. ${completedPts}/${sprint.plannedPoints} pts completed.${
              closeResult.incompleteItems.length > 0
                ? ` ${closeResult.incompleteItems.length} incomplete item(s) ${finalAction === "backlog" ? "moved to backlog" : "left for next sprint"}.`
                : ""
            }`,
          },
        ],
        details: { action: result.action, sprint: closeResult.sprint },
      };
    },
  };
}
