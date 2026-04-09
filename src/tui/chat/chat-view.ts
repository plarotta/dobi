import { Container, Spacer, type Component, type TUI } from "@mariozechner/pi-tui";
import type { Agent, AgentEvent } from "@mariozechner/pi-agent-core";
import type { ApprovalManager, Proposal } from "../../agent/approval.js";
import { MessageComponent } from "./message.js";
import { createToolLoader } from "./tool-status.js";
import { ApprovalCard } from "./approval-card.js";
import type { Loader } from "@mariozechner/pi-tui";

export class ChatView implements Component {
  private container = new Container();
  private tui: TUI;
  private agent: Agent;
  private approvalManager: ApprovalManager;
  private unsubscribeAgent: (() => void) | null = null;

  private currentAssistantMsg: MessageComponent | null = null;
  private accumulatedText = "";
  private activeLoaders = new Map<string, Loader>();

  constructor(tui: TUI, agent: Agent, approvalManager: ApprovalManager) {
    this.tui = tui;
    this.agent = agent;
    this.approvalManager = approvalManager;
    this.wireEvents();
  }

  private wireEvents(): void {
    this.unsubscribeAgent = this.agent.subscribe((event: AgentEvent) => {
      this.handleAgentEvent(event);
    });

    this.approvalManager.on("proposal", (toolCallId: string, proposal: Proposal) => {
      const card = new ApprovalCard(this.tui, toolCallId, proposal, this.approvalManager);
      this.container.addChild(card);
      this.tui.setFocus(card);
      this.tui.requestRender();
    });
  }

  private handleAgentEvent(event: AgentEvent): void {
    switch (event.type) {
      case "message_start": {
        if (event.message && typeof event.message === "object" && "role" in event.message) {
          const msg = event.message as { role: string };
          if (msg.role === "user") {
            // Find user text from message content
            const content = (event.message as { content?: string | unknown[] }).content;
            const text = typeof content === "string"
              ? content
              : Array.isArray(content)
                ? content
                    .filter((c): c is { type: string; text: string } =>
                      typeof c === "object" && c !== null && "type" in c && (c as { type: string }).type === "text"
                    )
                    .map((c) => c.text)
                    .join("")
                : "";
            if (text) {
              this.container.addChild(new Spacer(1));
              this.container.addChild(new MessageComponent("user", text));
            }
          } else if (msg.role === "assistant") {
            this.accumulatedText = "";
            this.currentAssistantMsg = new MessageComponent("assistant", "");
            this.container.addChild(new Spacer(1));
            this.container.addChild(this.currentAssistantMsg);
          }
        }
        this.tui.requestRender();
        break;
      }

      case "message_update": {
        const ame = (event as { assistantMessageEvent?: { type: string; delta?: string } }).assistantMessageEvent;
        if (ame?.type === "text_delta" && ame.delta && this.currentAssistantMsg) {
          this.accumulatedText += ame.delta;
          this.currentAssistantMsg.setText(this.accumulatedText);
          this.tui.requestRender();
        }
        break;
      }

      case "message_end": {
        this.currentAssistantMsg = null;
        this.accumulatedText = "";
        this.tui.requestRender();
        break;
      }

      case "tool_execution_start": {
        const e = event as { toolCallId: string; toolName: string };
        const loader = createToolLoader(this.tui, e.toolName);
        this.activeLoaders.set(e.toolCallId, loader);
        this.container.addChild(loader);
        this.tui.requestRender();
        break;
      }

      case "tool_execution_end": {
        const e = event as { toolCallId: string };
        const loader = this.activeLoaders.get(e.toolCallId);
        if (loader) {
          loader.stop();
          this.container.removeChild(loader);
          this.activeLoaders.delete(e.toolCallId);
          this.tui.requestRender();
        }
        break;
      }
    }
  }

  addMessage(role: "user" | "assistant", text: string): void {
    this.container.addChild(new Spacer(1));
    this.container.addChild(new MessageComponent(role, text));
    this.tui.requestRender();
  }

  dispose(): void {
    if (this.unsubscribeAgent) {
      this.unsubscribeAgent();
      this.unsubscribeAgent = null;
    }
  }

  invalidate(): void {
    this.container.invalidate();
  }

  render(width: number): string[] {
    return this.container.render(width);
  }
}
