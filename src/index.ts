#!/usr/bin/env node

import { existsSync } from "node:fs";
import { join } from "node:path";
import { ensureStructure } from "./data/paths.js";
import { ApprovalManager } from "./agent/approval.js";
import { createAgent } from "./agent/agent.js";
import { loadSession, saveSession, pruneSession } from "./agent/session.js";
import { launchApp } from "./tui/app.js";

function parseArgs(): { cmd?: string } {
  const args = process.argv.slice(2);
  const cmdIdx = args.indexOf("--cmd");
  if (cmdIdx !== -1 && cmdIdx + 1 < args.length) {
    return { cmd: args[cmdIdx + 1] };
  }
  return {};
}

function checkApiKey(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "Missing ANTHROPIC_API_KEY environment variable.\n\n" +
        "Set it in your shell:\n" +
        "  export ANTHROPIC_API_KEY=sk-ant-...\n\n" +
        "Get a key at https://console.anthropic.com/settings/keys"
    );
    process.exit(1);
  }
}

function isFirstRun(dataDir: string): boolean {
  return !existsSync(join(dataDir, "backlog.md"));
}

async function runCli(cmd: string, dataDir: string): Promise<void> {
  const approvalManager = new ApprovalManager();
  const agent = createAgent(dataDir, approvalManager);

  // Auto-approve all proposals in CLI mode
  approvalManager.on("proposal", (toolCallId: string) => {
    approvalManager.respond(toolCallId, { action: "accept" });
  });

  // Collect assistant text from events
  let output = "";
  agent.subscribe((event) => {
    if (event.type === "message_update") {
      const ame = (event as { assistantMessageEvent?: { type: string; delta?: string } }).assistantMessageEvent;
      if (ame?.type === "text_delta" && ame.delta) {
        output += ame.delta;
      }
    }
  });

  await agent.prompt(cmd);
  await agent.waitForIdle();

  if (output) {
    console.log(output);
  }
  saveSession(dataDir, agent.state.messages);
}

async function runTui(dataDir: string): Promise<void> {
  const approvalManager = new ApprovalManager();
  const agent = createAgent(dataDir, approvalManager);

  // Restore and prune previous session
  const previousMessages = loadSession(dataDir);
  if (previousMessages) {
    agent.state.messages = await pruneSession(previousMessages);
  }

  const openingPrompt = isFirstRun(dataDir)
    ? "This is a new project. Help me set up my first backlog items."
    : "Give me a status briefing.";

  launchApp({ dataDir, agent, approvalManager, openingPrompt });
}

async function main(): Promise<void> {
  checkApiKey();
  const dataDir = ensureStructure();
  const { cmd } = parseArgs();

  if (cmd) {
    await runCli(cmd, dataDir);
  } else {
    runTui(dataDir);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
