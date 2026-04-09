import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { readBacklog } from "../../data/backlog.js";

export function createReadBacklogTool(dataDir: string): AgentTool {
  return {
    name: "read_backlog",
    description:
      "Returns all items currently in the backlog with their IDs, titles, points, tags, and descriptions.",
    label: "Reading backlog",
    parameters: Type.Object({}),
    execute: async () => {
      const items = readBacklog(dataDir);
      const text =
        items.length === 0
          ? "Backlog is empty."
          : JSON.stringify(items, null, 2);
      return {
        content: [{ type: "text", text }],
        details: items,
      };
    },
  };
}
