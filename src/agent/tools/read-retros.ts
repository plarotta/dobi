import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { readRetros } from "../../data/retros.js";

export function createReadRetrosTool(dataDir: string): AgentTool {
  return {
    name: "read_retros",
    description: "Returns the last N retrospectives (default 5), newest first.",
    label: "Reading retros",
    parameters: Type.Object({
      count: Type.Optional(
        Type.Number({ description: "Number of retros to return. Defaults to 5." })
      ),
    }),
    execute: async (_toolCallId, params) => {
      const { count } = params as { count?: number };
      const retros = readRetros(dataDir, count ?? 5);
      const text =
        retros.length === 0
          ? "No retrospectives recorded yet."
          : JSON.stringify(retros, null, 2);
      return {
        content: [{ type: "text", text }],
        details: retros,
      };
    },
  };
}
