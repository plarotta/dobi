import { TUI, ProcessTerminal, Text, matchesKey, Key } from "@mariozechner/pi-tui";
import type { Agent } from "@mariozechner/pi-agent-core";
import type { ApprovalManager } from "../agent/approval.js";
import { saveSession } from "../agent/session.js";
import { getCurrentSprint } from "../data/sprints.js";
import { ChatView } from "./chat/chat-view.js";
import { ChatInput } from "./chat/input.js";
import { DashboardView } from "./dashboard/dashboard-view.js";
import { colors } from "./theme.js";

function buildStatusText(dataDir: string): string {
  const sprint = getCurrentSprint(dataDir);
  if (!sprint) return colors.header("  DOBI") + colors.muted("  No active sprint");

  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const now = new Date();
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const elapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const donePoints = sprint.items
    .filter((i) => i.status === "done")
    .reduce((sum, i) => sum + i.points, 0);
  const pct = sprint.plannedPoints > 0 ? Math.round((donePoints / sprint.plannedPoints) * 100) : 0;

  return (
    colors.header("  DOBI") +
    colors.muted(`  Sprint ${sprint.number} · Day ${elapsed}/${totalDays} · ${pct}% done`)
  );
}

export interface AppOptions {
  dataDir: string;
  agent: Agent;
  approvalManager: ApprovalManager;
  openingPrompt?: string;
}

export function launchApp({ dataDir, agent, approvalManager, openingPrompt }: AppOptions): void {
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal, true);

  const statusBar = new Text(buildStatusText(dataDir));
  const chatView = new ChatView(tui, agent, approvalManager);
  const input = new ChatInput(tui, agent);
  let dashboardView: DashboardView | null = null;
  let mode: "chat" | "dashboard" = "chat";

  function showError(err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    chatView.addMessage("assistant", `**Error:** ${msg}`);
    input.disableSubmit = false;
    tui.setFocus(input);
    tui.requestRender();
  }

  input.onError = showError;

  tui.addChild(statusBar);
  tui.addChild(chatView);
  tui.addChild(input);
  tui.setFocus(input);

  // Update status bar when agent finishes a run
  agent.subscribe((event) => {
    if (event.type === "agent_start") {
      input.disableSubmit = true;
    } else if (event.type === "agent_end") {
      input.disableSubmit = false;
      statusBar.setText(buildStatusText(dataDir));
      if (mode === "chat") {
        tui.setFocus(input);
      }
      tui.requestRender();
    }
  });

  // Global keybindings
  tui.addInputListener((data: string) => {
    if (matchesKey(data, Key.ctrl("c"))) {
      shutdown();
      return { consume: true };
    }
    if (matchesKey(data, Key.ctrl("d"))) {
      toggleDashboard();
      return { consume: true };
    }
    return undefined;
  });

  function toggleDashboard(): void {
    if (mode === "chat") {
      // Switch to dashboard
      tui.removeChild(chatView);
      tui.removeChild(input);
      dashboardView = new DashboardView(dataDir);
      tui.addChild(dashboardView);
      tui.setFocus(dashboardView);
      mode = "dashboard";
    } else {
      // Switch back to chat
      if (dashboardView) {
        tui.removeChild(dashboardView);
        dashboardView = null;
      }
      tui.addChild(chatView);
      tui.addChild(input);
      tui.setFocus(input);
      mode = "chat";
    }
    statusBar.setText(buildStatusText(dataDir));
    tui.requestRender();
  }

  function shutdown(): void {
    if (agent.state.isStreaming) {
      agent.abort();
    }
    saveSession(dataDir, agent.state.messages);
    chatView.dispose();
    tui.stop();
    process.exit(0);
  }

  tui.start();

  // Opening briefing
  agent.prompt(openingPrompt ?? "Give me a status briefing.").catch(showError);
}
