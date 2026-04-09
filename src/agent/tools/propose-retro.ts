import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ApprovalManager } from "../approval.js";
import { getCurrentSprint, listSprints } from "../../data/sprints.js";
import { writeRetro } from "../../data/retros.js";
import type { Retro } from "../../data/retros.js";

export function createProposeRetroTool(
  dataDir: string,
  approvalManager: ApprovalManager
): AgentTool {
  return {
    name: "propose_retro",
    description:
      "Drafts a retrospective for the most recently closed sprint. Shows for user editing/approval before saving.",
    label: "Proposing retrospective",
    parameters: Type.Object({
      went_well: Type.Array(Type.String(), { description: "Things that went well" }),
      didnt_go_well: Type.Array(Type.String(), { description: "Things that didn't go well" }),
      action_items: Type.Array(Type.String(), { description: "Action items for improvement" }),
    }),
    execute: async (toolCallId, params) => {
      const { went_well, didnt_go_well, action_items } = params as {
        went_well: string[]; didnt_go_well: string[]; action_items: string[];
      };
      // Find the most recently closed sprint (or current if none closed)
      const summaries = listSprints(dataDir);
      const closedSprint = summaries.find((s) => s.status === "closed");
      const activeSprint = getCurrentSprint(dataDir);
      const sprintNumber = closedSprint?.number ?? activeSprint?.number;

      if (!sprintNumber) {
        return {
          content: [{ type: "text", text: "No sprints found to write a retro for." }],
          details: { error: "no_sprints" },
        };
      }

      const preview = [
        `Retrospective — Sprint ${sprintNumber}`,
        "",
        "What went well:",
        ...went_well.map((s) => `  - ${s}`),
        "",
        "What didn't go well:",
        ...didnt_go_well.map((s) => `  - ${s}`),
        "",
        "Action items:",
        ...action_items.map((s) => `  - [ ] ${s}`),
      ].join("\n");

      const retroData: Retro = {
        sprintNumber,
        wentWell: went_well,
        didntGoWell: didnt_go_well,
        actionItems: action_items,
      };

      const result = await approvalManager.requestApproval(toolCallId, {
        type: "retro",
        title: "Sprint Retrospective",
        preview,
        data: retroData,
      });

      if (result.action === "reject") {
        return {
          content: [{ type: "text", text: "User rejected the retrospective." }],
          details: { action: "rejected" },
        };
      }

      const final = result.action === "edit" ? (result.data as Retro) : retroData;
      writeRetro(dataDir, final);

      return {
        content: [{ type: "text", text: `Retrospective for Sprint ${final.sprintNumber} saved.` }],
        details: { action: result.action, retro: final },
      };
    },
  };
}
