import { Text, type Component, type Focusable } from "@mariozechner/pi-tui";
import { colors } from "../theme.js";
import { BoardPanel } from "./board.js";
import { BacklogPanel } from "./backlog-panel.js";
import { VelocityPanel } from "./velocity-panel.js";
import { LogPanel } from "./log-panel.js";
import { RetrosPanel } from "./retros-panel.js";

type PanelKey = "board" | "log" | "velocity" | "backlog" | "retros";

const TABS: Array<{ key: PanelKey; hotkey: string; label: string }> = [
  { key: "board", hotkey: "B", label: "Board" },
  { key: "log", hotkey: "L", label: "Log" },
  { key: "velocity", hotkey: "V", label: "Velocity" },
  { key: "backlog", hotkey: "K", label: "Backlog" },
  { key: "retros", hotkey: "R", label: "Retros" },
];

export class DashboardView implements Component, Focusable {
  focused = false;
  private dataDir: string;
  private activePanel: PanelKey = "board";
  private panels: Record<PanelKey, Component>;
  private tabBar: Text;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.panels = {
      board: new BoardPanel(dataDir),
      backlog: new BacklogPanel(dataDir),
      velocity: new VelocityPanel(dataDir),
      log: new LogPanel(dataDir),
      retros: new RetrosPanel(dataDir),
    };
    this.tabBar = new Text(this.buildTabBarText());
  }

  refresh(): void {
    this.panels = {
      board: new BoardPanel(this.dataDir),
      backlog: new BacklogPanel(this.dataDir),
      velocity: new VelocityPanel(this.dataDir),
      log: new LogPanel(this.dataDir),
      retros: new RetrosPanel(this.dataDir),
    };
  }

  private buildTabBarText(): string {
    return (
      "  " +
      TABS.map((tab) => {
        const text = `[${tab.hotkey}]${tab.label.slice(1)}`;
        return tab.key === this.activePanel
          ? colors.header(text)
          : colors.muted(text);
      }).join("  ")
    );
  }

  handleInput(data: string): void {
    const key = data.toLowerCase();
    const match = TABS.find((t) => t.hotkey.toLowerCase() === key);
    if (match && match.key !== this.activePanel) {
      this.activePanel = match.key;
      this.tabBar = new Text(this.buildTabBarText());
    }
  }

  invalidate(): void {
    this.tabBar.invalidate();
    for (const panel of Object.values(this.panels)) {
      panel.invalidate();
    }
  }

  render(width: number): string[] {
    const tabLines = this.tabBar.render(width);
    const separator = [colors.border("─".repeat(width))];
    const panelLines = this.panels[this.activePanel].render(width);
    return [...tabLines, ...separator, ...panelLines];
  }
}
