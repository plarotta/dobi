import { Agent, type AgentMessage } from "@mariozechner/pi-agent-core";
import type { Message } from "@mariozechner/pi-ai";
import { getConfiguredModel } from "../config.js";
import { buildSystemPrompt } from "./system-prompt.js";
import type { ApprovalManager } from "./approval.js";
import type { DobiConfig } from "../setup.js";

// Read tools
import { createReadBacklogTool } from "./tools/read-backlog.js";
import { createReadSprintTool } from "./tools/read-sprint.js";
import { createReadSprintHistoryTool } from "./tools/read-sprint-history.js";
import { createReadStandupsTool } from "./tools/read-standups.js";
import { createReadRetrosTool } from "./tools/read-retros.js";

// Propose tools
import { createProposeBacklogAddTool } from "./tools/propose-backlog-add.js";
import { createProposeBacklogEditTool } from "./tools/propose-backlog-edit.js";
import { createProposeBacklogRemoveTool } from "./tools/propose-backlog-remove.js";
import { createProposeSprintPlanTool } from "./tools/propose-sprint-plan.js";
import { createProposeSprintUpdateTool } from "./tools/propose-sprint-update.js";
import { createProposeSprintCloseTool } from "./tools/propose-sprint-close.js";
import { createProposeStandupTool } from "./tools/propose-standup.js";
import { createProposeRetroTool } from "./tools/propose-retro.js";

export function createAgent(dataDir: string, approvalManager: ApprovalManager, config: DobiConfig): Agent {
  const model = getConfiguredModel(config);
  const systemPrompt = buildSystemPrompt(dataDir);

  const tools = [
    // Read tools
    createReadBacklogTool(dataDir),
    createReadSprintTool(dataDir),
    createReadSprintHistoryTool(dataDir),
    createReadStandupsTool(dataDir),
    createReadRetrosTool(dataDir),
    // Propose tools
    createProposeBacklogAddTool(dataDir, approvalManager),
    createProposeBacklogEditTool(dataDir, approvalManager),
    createProposeBacklogRemoveTool(dataDir, approvalManager),
    createProposeSprintPlanTool(dataDir, approvalManager),
    createProposeSprintUpdateTool(dataDir, approvalManager),
    createProposeSprintCloseTool(dataDir, approvalManager),
    createProposeStandupTool(dataDir, approvalManager),
    createProposeRetroTool(dataDir, approvalManager),
  ];

  return new Agent({
    initialState: { systemPrompt, model, tools },
    convertToLlm: (msgs: AgentMessage[]): Message[] =>
      msgs.filter(
        (m): m is Message =>
          typeof m === "object" &&
          m !== null &&
          "role" in m &&
          typeof (m as Message).role === "string" &&
          ["user", "assistant", "toolResult"].includes((m as Message).role)
      ),
  });
}
