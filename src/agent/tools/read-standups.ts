import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { readStandups } from "../../data/standups.js";

export function createReadStandupsTool(dataDir: string): AgentTool {
  return {
    name: "read_standups",
    description: "Returns the last N standups (default 5), newest first.",
    label: "Reading standups",
    parameters: Type.Object({
      count: Type.Optional(
        Type.Number({ description: "Number of standups to return. Defaults to 5." })
      ),
    }),
    execute: async (_toolCallId, params) => {
      const { count } = params as { count?: number };
      const standups = readStandups(dataDir, count ?? 5);
      const text =
        standups.length === 0
          ? "No standups recorded yet."
          : JSON.stringify(standups, null, 2);
      return {
        content: [{ type: "text", text }],
        details: standups,
      };
    },
  };
}
