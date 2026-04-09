import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { listSprints } from "../../data/sprints.js";
import { computeVelocity } from "../../data/velocity.js";

export function createReadSprintHistoryTool(dataDir: string): AgentTool {
  return {
    name: "read_sprint_history",
    description:
      "Returns summaries of past sprints (planned pts, completed pts, status) and velocity data.",
    label: "Reading sprint history",
    parameters: Type.Object({
      count: Type.Optional(
        Type.Number({ description: "Number of sprints to return. Defaults to all." })
      ),
    }),
    execute: async (_toolCallId, params) => {
      const { count } = params as { count?: number };
      let summaries = listSprints(dataDir);
      if (count) {
        summaries = summaries.slice(0, count);
      }
      const velocity = computeVelocity(summaries);

      const result = { sprints: summaries, velocity };
      const text =
        summaries.length === 0
          ? "No sprint history yet."
          : JSON.stringify(result, null, 2);

      return {
        content: [{ type: "text", text }],
        details: result,
      };
    },
  };
}
