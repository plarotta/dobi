import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { readSprint, getCurrentSprint } from "../../data/sprints.js";

export function createReadSprintTool(dataDir: string): AgentTool {
  return {
    name: "read_sprint",
    description:
      "Returns a sprint's goal, dates, all items with statuses, and point totals. If no sprint number is given, returns the current active sprint.",
    label: "Reading sprint",
    parameters: Type.Object({
      sprint_number: Type.Optional(
        Type.Number({ description: "Sprint number. Omit for current sprint." })
      ),
    }),
    execute: async (_toolCallId, params) => {
      const { sprint_number } = params as { sprint_number?: number };
      const sprint = sprint_number
        ? readSprint(dataDir, sprint_number)
        : getCurrentSprint(dataDir);

      if (!sprint) {
        const text = sprint_number
          ? `Sprint ${sprint_number} not found.`
          : "No active sprint.";
        return {
          content: [{ type: "text", text }],
          details: null,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(sprint, null, 2) }],
        details: sprint,
      };
    },
  };
}
