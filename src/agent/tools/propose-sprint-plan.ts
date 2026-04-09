import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ApprovalManager } from "../approval.js";
import { readBacklog, writeBacklog } from "../../data/backlog.js";
import { createSprint } from "../../data/sprints.js";
import { serializeItem } from "../../data/markdown.js";
import type { Item } from "../../data/items.js";

export function createProposeSprintPlanTool(
  dataDir: string,
  approvalManager: ApprovalManager
): AgentTool {
  return {
    name: "propose_sprint_plan",
    description:
      "Proposes a new sprint plan: selects items from the backlog, sets a goal and duration. Shows the full plan for user approval.",
    label: "Proposing sprint plan",
    parameters: Type.Object({
      goal: Type.String({ description: "Sprint goal / theme" }),
      duration_weeks: Type.Number({ description: "Sprint duration in weeks" }),
      item_ids: Type.Array(Type.String(), { description: "IDs of backlog items to include" }),
    }),
    execute: async (toolCallId, params) => {
      const { goal, duration_weeks, item_ids } = params as {
        goal: string; duration_weeks: number; item_ids: string[];
      };
      const backlog = readBacklog(dataDir);
      const selected: Item[] = [];
      const missing: string[] = [];

      for (const id of item_ids) {
        const item = backlog.find((i) => i.id === id);
        if (item) selected.push(item);
        else missing.push(id);
      }

      if (missing.length > 0) {
        return {
          content: [{ type: "text", text: `Items not found in backlog: ${missing.join(", ")}` }],
          details: { error: "items_not_found", missing },
        };
      }

      const totalPoints = selected.reduce((sum, i) => sum + i.points, 0);
      const startDate = new Date().toISOString().split("T")[0];
      const itemLines = selected.map((i) => `  ${serializeItem(i)}`).join("\n");

      const preview = [
        `Sprint — "${goal}"`,
        `Duration: ${duration_weeks} week${duration_weeks > 1 ? "s" : ""}`,
        `Start: ${startDate}`,
        `Planned: ${totalPoints} pts`,
        "",
        "Items:",
        itemLines,
      ].join("\n");

      const proposalData = {
        goal,
        duration_weeks,
        start_date: startDate,
        items: selected,
      };

      const result = await approvalManager.requestApproval(toolCallId, {
        type: "sprint_plan",
        title: "Sprint Plan",
        preview,
        data: proposalData,
      });

      if (result.action === "reject") {
        return {
          content: [{ type: "text", text: "User rejected the sprint plan." }],
          details: { action: "rejected" },
        };
      }

      const final =
        result.action === "edit"
          ? (result.data as typeof proposalData)
          : proposalData;

      const sprint = createSprint(
        dataDir,
        final.goal,
        final.duration_weeks,
        final.start_date,
        final.items
      );

      // Remove planned items from backlog
      const plannedIds = new Set(final.items.map((i) => i.id));
      const remaining = backlog.filter((i) => !plannedIds.has(i.id));
      writeBacklog(dataDir, remaining);

      return {
        content: [
          {
            type: "text",
            text: `Created Sprint ${sprint.number} "${sprint.goal}" with ${sprint.plannedPoints} pts (${sprint.items.length} items).`,
          },
        ],
        details: { action: result.action, sprint },
      };
    },
  };
}
