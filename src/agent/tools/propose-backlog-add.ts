import { Type } from "@mariozechner/pi-ai";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ApprovalManager } from "../approval.js";
import { addItems } from "../../data/backlog.js";
import { generateId } from "../../data/items.js";
import type { Item } from "../../data/items.js";
import { serializeItem } from "../../data/markdown.js";

interface NewItemInput {
  title: string;
  points: number;
  tags: string[];
  description: string;
}

export function createProposeBacklogAddTool(
  dataDir: string,
  approvalManager: ApprovalManager
): AgentTool {
  return {
    name: "propose_backlog_add",
    description:
      "Proposes adding one or more items to the backlog. Shows a preview for user approval before writing.",
    label: "Proposing backlog additions",
    parameters: Type.Object({
      items: Type.Array(
        Type.Object({
          title: Type.String({ description: "Item title" }),
          points: Type.Number({ description: "Story points estimate" }),
          tags: Type.Array(Type.String(), { description: "Tags (e.g. backend, frontend, infra)" }),
          description: Type.String({ description: "Brief description" }),
        }),
        { description: "Items to add to the backlog" }
      ),
    }),
    execute: async (toolCallId, params) => {
      const { items: inputItems } = params as { items: NewItemInput[] };
      const items: Item[] = inputItems.map((input) => ({
        id: generateId(),
        title: input.title,
        points: input.points,
        tags: input.tags,
        description: input.description,
        status: "todo" as const,
      }));

      const preview = items.map((i) => serializeItem(i)).join("\n");
      const totalPoints = items.reduce((sum, i) => sum + i.points, 0);

      const result = await approvalManager.requestApproval(toolCallId, {
        type: "backlog_add",
        title: `Add ${items.length} item${items.length > 1 ? "s" : ""} to Backlog`,
        preview: `${preview}\n\nTotal: ${totalPoints} pts`,
        data: items,
      });

      if (result.action === "reject") {
        return {
          content: [{ type: "text", text: "User rejected the proposal." }],
          details: { action: "rejected" },
        };
      }

      const finalItems = result.action === "edit" ? (result.data as Item[]) : items;
      try {
        addItems(dataDir, finalItems);
      } catch (err) {
        return {
          content: [{ type: "text", text: `Failed to write backlog: ${err instanceof Error ? err.message : err}` }],
          details: { error: "write_failed" },
        };
      }

      return {
        content: [{ type: "text", text: `Added ${finalItems.length} item(s) to backlog.` }],
        details: { action: result.action, items: finalItems },
      };
    },
  };
}
