import { Loader, type TUI } from "@mariozechner/pi-tui";
import { colors } from "../theme.js";

const TOOL_LABELS: Record<string, string> = {
  read_backlog: "Reading backlog...",
  read_sprint: "Reading sprint...",
  read_sprint_history: "Reading sprint history...",
  read_standups: "Reading standups...",
  read_retros: "Reading retros...",
  propose_backlog_add: "Proposing backlog additions...",
  propose_backlog_edit: "Proposing backlog edit...",
  propose_backlog_remove: "Proposing backlog removal...",
  propose_sprint_plan: "Proposing sprint plan...",
  propose_sprint_update: "Proposing sprint update...",
  propose_sprint_close: "Proposing sprint close...",
  propose_standup: "Proposing standup...",
  propose_retro: "Proposing retrospective...",
};

export function createToolLoader(tui: TUI, toolName: string): Loader {
  const message = TOOL_LABELS[toolName] ?? `Running ${toolName}...`;
  const loader = new Loader(tui, colors.spinner, colors.muted, message);
  loader.start();
  return loader;
}
