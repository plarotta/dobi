import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ApprovalManager } from "../approval.js";
import { writeStandup } from "../../data/standups.js";
import type { Standup } from "../../data/standups.js";

export function createProposeStandupTool(
  dataDir: string,
  approvalManager: ApprovalManager
): AgentTool {
  return {
    name: "propose_standup",
    description:
      "Drafts a standup based on conversation context. Shows for user editing/approval before saving.",
    label: "Proposing standup",
    parameters: Type.Object({
      yesterday: Type.Array(Type.String(), { description: "What was done since last standup" }),
      today: Type.Array(Type.String(), { description: "What's planned for today" }),
      blockers: Type.Array(Type.String(), { description: "Current blockers (empty array if none)" }),
    }),
    execute: async (toolCallId, params) => {
      const { yesterday, today, blockers } = params as {
        yesterday: string[]; today: string[]; blockers: string[];
      };
      const date = new Date().toISOString().split("T")[0];

      const preview = [
        `Standup — ${date}`,
        "",
        "Yesterday:",
        ...(yesterday.length > 0
          ? yesterday.map((s) => `  - ${s}`)
          : ["  - None"]),
        "",
        "Today:",
        ...(today.length > 0
          ? today.map((s) => `  - ${s}`)
          : ["  - None"]),
        "",
        "Blockers:",
        ...(blockers.length > 0
          ? blockers.map((s) => `  - ${s}`)
          : ["  - None"]),
      ].join("\n");

      const standupData: Standup = { date, yesterday, today, blockers };

      const result = await approvalManager.requestApproval(toolCallId, {
        type: "standup",
        title: "Daily Standup",
        preview,
        data: standupData,
      });

      if (result.action === "reject") {
        return {
          content: [{ type: "text", text: "User rejected the standup." }],
          details: { action: "rejected" },
        };
      }

      const final = result.action === "edit" ? (result.data as Standup) : standupData;
      try {
        writeStandup(dataDir, final);
      } catch (err) {
        return {
          content: [{ type: "text", text: `Failed to write standup: ${err instanceof Error ? err.message : err}` }],
          details: { error: "write_failed" },
        };
      }

      return {
        content: [{ type: "text", text: `Standup for ${final.date} saved.` }],
        details: { action: result.action, standup: final },
      };
    },
  };
}
