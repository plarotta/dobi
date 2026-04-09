import { readFileSync, writeFileSync, existsSync, renameSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { complete } from "@mariozechner/pi-ai";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { Message, UserMessage, TextContent } from "@mariozechner/pi-ai";
import { getConfiguredModel } from "../config.js";

const MAX_ARCHIVED = 10;
const MAX_MESSAGES_BEFORE_PRUNE = 30;
const KEEP_RECENT = 10;

function sessionsDir(dataDir: string): string {
  return join(dataDir, "sessions");
}

function archiveDir(dataDir: string): string {
  return join(dataDir, "sessions", "archive");
}

function currentPath(dataDir: string): string {
  return join(sessionsDir(dataDir), "current.json");
}

/**
 * Load the current session's messages, if any.
 */
export function loadSession(dataDir: string): AgentMessage[] | null {
  const path = currentPath(dataDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Save messages to the current session. Archives the previous session first.
 */
export function saveSession(dataDir: string, messages: AgentMessage[]): void {
  const path = currentPath(dataDir);

  // Archive existing session if present
  if (existsSync(path)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const archivePath = join(archiveDir(dataDir), `${timestamp}.json`);
    renameSync(path, archivePath);
    pruneArchive(dataDir);
  }

  writeFileSync(path, JSON.stringify(messages, null, 2), "utf-8");
}

/**
 * Keep only the most recent archived sessions.
 */
function pruneArchive(dataDir: string): void {
  const dir = archiveDir(dataDir);
  if (!existsSync(dir)) return;

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  for (const file of files.slice(MAX_ARCHIVED)) {
    unlinkSync(join(dir, file));
  }
}

/**
 * Extract text from agent messages for summarization.
 */
function messagesToText(messages: AgentMessage[]): string {
  return messages
    .filter((m): m is Message =>
      typeof m === "object" &&
      m !== null &&
      "role" in m &&
      ["user", "assistant"].includes((m as Message).role)
    )
    .map((m) => {
      const content = m.content;
      let text = "";
      if (typeof content === "string") {
        text = content;
      } else if (Array.isArray(content)) {
        text = content
          .filter((c): c is TextContent => c.type === "text")
          .map((c) => c.text)
          .join("");
      }
      return `${m.role}: ${text}`;
    })
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * Prune a loaded session by summarizing older messages with an LLM.
 * Keeps the last KEEP_RECENT messages in full, replaces older ones with a summary.
 * Returns the original messages if pruning is not needed or fails.
 */
export async function pruneSession(messages: AgentMessage[]): Promise<AgentMessage[]> {
  if (messages.length <= MAX_MESSAGES_BEFORE_PRUNE) {
    return messages;
  }

  const oldMessages = messages.slice(0, messages.length - KEEP_RECENT);
  const recentMessages = messages.slice(messages.length - KEEP_RECENT);

  const transcript = messagesToText(oldMessages);
  if (!transcript.trim()) {
    return recentMessages;
  }

  try {
    const model = getConfiguredModel();
    const result = await complete(model, {
      systemPrompt: "You are a concise summarizer. Summarize the following conversation between a user and their scrum master assistant. Focus on decisions made, actions taken (items added/edited, sprints planned/closed, standups logged), and any important context. Keep it under 200 words.",
      messages: [{ role: "user" as const, content: transcript, timestamp: Date.now() }],
    });

    const summaryText = result.content
      .filter((c): c is TextContent => c.type === "text")
      .map((c) => c.text)
      .join("");

    if (!summaryText) {
      return recentMessages;
    }

    const summaryMessage: UserMessage = {
      role: "user",
      content: `[Summary of earlier conversation]\n\n${summaryText}\n\n[End of summary — the recent conversation follows.]`,
      timestamp: Date.now(),
    };

    return [summaryMessage, ...recentMessages];
  } catch {
    // If summarization fails, just keep recent messages
    return recentMessages;
  }
}
