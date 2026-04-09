import {
  Editor,
  CombinedAutocompleteProvider,
  type TUI,
  type Component,
  type Focusable,
} from "@mariozechner/pi-tui";
import type { Agent } from "@mariozechner/pi-agent-core";
import { editorTheme } from "../theme.js";

const SLASH_COMMANDS = [
  { name: "plan", description: "Plan a new sprint" },
  { name: "standup", description: "Run a standup" },
  { name: "retro", description: "Run a retrospective" },
  { name: "close", description: "Close the current sprint" },
  { name: "status", description: "Get a status briefing" },
  { name: "backlog", description: "Show the backlog" },
  { name: "velocity", description: "Show velocity trend" },
  { name: "help", description: "Show available commands" },
];

export class ChatInput implements Component, Focusable {
  focused = false;
  onError?: (error: unknown) => void;
  private editor: Editor;
  private agent: Agent;

  constructor(tui: TUI, agent: Agent) {
    this.agent = agent;
    this.editor = new Editor(tui, editorTheme, { paddingX: 1 });

    const provider = new CombinedAutocompleteProvider(SLASH_COMMANDS);
    this.editor.setAutocompleteProvider(provider);

    this.editor.onSubmit = (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || this.agent.state.isStreaming) return;
      this.editor.setText("");
      this.editor.addToHistory(trimmed);
      this.agent.prompt(trimmed).catch((err) => {
        this.onError?.(err);
      });
    };
  }

  get disableSubmit(): boolean {
    return this.editor.disableSubmit;
  }

  set disableSubmit(value: boolean) {
    this.editor.disableSubmit = value;
  }

  handleInput(data: string): void {
    this.editor.handleInput(data);
  }

  invalidate(): void {
    this.editor.invalidate();
  }

  render(width: number): string[] {
    return this.editor.render(width);
  }
}
