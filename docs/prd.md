# PRD: Agentic Terminal Scrum Master

## Overview

An AI-powered personal scrum master that runs in your terminal. The LLM is the scrum master — it analyzes your backlog, drafts sprint plans, interprets standups, runs retrospectives, and flags risks. You collaborate: it proposes, you approve or edit. Everything is backed by markdown files and powered by the pi stack (`pi-ai`, `pi-agent-core`, `pi-tui`).

**Command name:** `scrum`

**Core premise:** Traditional project management tools make *you* do all the scrum ceremony work. This tool flips that — the LLM does the ceremony work, and you just code and make decisions.

---

## How It Works — The Loop

```
You tell it what you did / what you're thinking about
                    ↓
    LLM interprets, updates state, proposes next steps
                    ↓
       You approve, edit, or override the proposal
                    ↓
              State persists to markdown
                    ↓
          LLM uses full history for future context
```

Every interaction follows the **propose → review → commit** pattern. The LLM never writes to disk without your approval (shown as a diff or preview you can accept/edit/reject).

---

## Interaction Model

### Two Modes

**1. Chat Mode (default)**

Running `scrum` opens a TUI with a chat interface (pi-tui `Editor` at the bottom, conversation history above). You talk to your scrum master in natural language. It has tools to read/write your scrum data and responds with proposals.

```
┌──────────────────────────────────────────────────────────────────┐
│  SCRUM MASTER  Sprint 3 · Day 6/14 · 6/11 pts (55%)            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🤖 Good morning. Here's where we stand on Sprint 3:            │
│                                                                  │
│  ✅ CI pipeline and schema migration are done (4 pts).           │
│  🔄 Vector store integration is still in progress (5 pts).      │
│  📋 Auth flow and tests haven't started (4 pts).                │
│                                                                  │
│  You've been on the vector store for 3 days. Is it blocked,     │
│  or just larger than estimated? If it's scope creep, we could   │
│  split it — ship the basic CRUD this sprint and defer advanced  │
│  query patterns to the backlog.                                  │
│                                                                  │
│  Also, you haven't logged a standup since Tuesday. Want to      │
│  do a quick catch-up?                                            │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  ▸ yeah vector store is bigger than expected, let's split it     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

The LLM responds conversationally but can also produce **structured proposals** — sprint plans, standup drafts, backlog items — that render as editable cards/overlays.

**2. Dashboard Mode (hotkey: `Ctrl+D`)**

Toggles to the read-only dashboard view: kanban board, velocity charts, standup history. No chat — just a visual overview. Press `Ctrl+D` again to return to chat.

```
┌──────────────────────────────────────────────────────────────────┐
│  SCRUM MASTER  Sprint 3 · Day 6/14 · 55% done     [Chat: ^D]   │
├──────────────────────────────────────────────────────────────────┤
│  [B]oard  [L]og  [V]elocity  [K]Backlog                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ TODO (4 pts) ──┐  ┌─ WIP (5 pts) ──┐  ┌─ DONE (4 pts) ──┐ │
│  │   a3f1 Auth   3 │  │   c4d5 Vector 5 │  │   b7c2 CI     2 │ │
│  │   e8f9 Tests  1 │  │                 │  │   d6e7 Schema 2 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Agent Capabilities

The LLM has access to a set of **tools** (pi-agent-core `AgentTool` definitions) that let it read and propose changes to your scrum data. Tools are the bridge between natural language conversation and structured markdown state.

### Tool Set

| Tool | Description | Side Effects |
|---|---|---|
| `read_backlog` | Returns all backlog items with IDs, titles, points, tags, descriptions | None (read-only) |
| `read_sprint` | Returns current sprint: goal, dates, all items with statuses, point totals | None |
| `read_sprint_history` | Returns summaries of past N sprints: planned pts, completed pts, velocity | None |
| `read_standups` | Returns last N standups (default 5) | None |
| `read_retros` | Returns last N retrospectives | None |
| `propose_backlog_add` | Proposes adding one or more items to backlog. Returns a preview for user approval. | Pending approval |
| `propose_backlog_edit` | Proposes editing an existing backlog item. Shows diff. | Pending approval |
| `propose_backlog_remove` | Proposes removing a backlog item. | Pending approval |
| `propose_sprint_plan` | Proposes a sprint plan: selects items from backlog, sets goal, sets duration. Shows full plan for approval. | Pending approval |
| `propose_sprint_update` | Proposes status changes (todo→wip, wip→done, split item, re-estimate). Shows diff. | Pending approval |
| `propose_sprint_close` | Proposes closing the sprint with a summary. Handles incomplete items (move to backlog or carry over). | Pending approval |
| `propose_standup` | Drafts a standup based on conversation + recent sprint changes. Shows for editing. | Pending approval |
| `propose_retro` | Drafts a retrospective based on sprint data, standups, and conversation. | Pending approval |

**All `propose_*` tools return structured data that renders as an approval card in the TUI.** The user sees exactly what will be written to disk and can: accept (`y`), edit (opens in pi-tui `Editor`), or reject (`n`).

### Agent System Prompt (condensed)

```
You are a personal scrum master for a solo developer. Your job is to:

1. PLAN — Help the developer select and scope work for sprints based on 
   backlog priorities, historical velocity, and current capacity.
2. TRACK — Maintain awareness of sprint progress. Notice stale items, 
   scope creep, and blockers. Proactively surface risks.
3. FACILITATE — Run standups and retros. Don't make them ceremonial —
   extract genuine insights. Ask pointed questions.
4. ADVISE — Suggest when to split items, re-estimate, cut scope, or 
   carry items to the next sprint. Be honest about pace.

Style guidelines:
- Be direct and concise. No corporate scrum-speak.
- Use the tools to ground every recommendation in actual data.
- When proposing changes, always use the propose_* tools so the 
  developer can review before committing.
- Never assume — ask if something is ambiguous.
- Track patterns across sprints. If velocity is declining, say so.
  If estimates are consistently off, flag the pattern.
```

### Agent Behaviors (Scenario Examples)

**Opening a session:**
LLM reads current sprint + recent standups → generates a status briefing with any flags (stale items, missed standups, approaching deadline).

**"Let's plan the next sprint":**
LLM reads backlog + sprint history → computes average velocity → proposes a sprint plan that fits within velocity, prioritizing by whatever signal is available (recency of addition, point size, tags). Shows the full plan as an approval card.

**"I finished the auth flow":**
LLM calls `propose_sprint_update` to move `a3f1` from WIP→Done → updates point totals → comments on progress ("Nice, that's 7/11 points done with 8 days left — you're ahead of pace.").

**"This is taking forever":**
LLM asks clarifying questions about what's blocking → may propose splitting the item into smaller pieces → may suggest re-estimating → may suggest deferring to next sprint.

**"Let's do standup":**
LLM reviews what changed since last standup (sprint item status changes, time elapsed) → drafts a standup with its best guess at yesterday/today/blockers → shows for editing. You fix anything wrong and approve.

**"Let's close the sprint":**
LLM reads sprint state → identifies incomplete items → proposes disposition for each (carry over vs. move to backlog) → generates sprint summary → triggers retro flow → drafts retro based on sprint data + standup patterns.

**"Add 'implement caching layer' to the backlog, probably 5 points, backend":**
LLM calls `propose_backlog_add` with parsed fields → shows preview → user approves.

---

## Approval Cards

When the LLM calls any `propose_*` tool, the result renders as an **approval card** — a bordered, highlighted block in the chat stream that the user must act on.

```
┌─ PROPOSAL: Sprint Plan ──────────────────────────────────────────┐
│                                                                   │
│  Sprint 4 — "Caching & Performance"                              │
│  Duration: 2 weeks (Apr 21 – May 5)                              │
│  Planned: 14 pts (avg velocity: 12.3 pts)                        │
│                                                                   │
│  Items:                                                           │
│    a3f1  Implement caching layer      5 pts  [backend]            │
│    b7c2  Load test harness            3 pts  [infra]              │
│    c4d5  Query optimization           3 pts  [backend]            │
│    d6e7  Cache invalidation strategy  3 pts  [backend]            │
│                                                                   │
│  ⚠ This is slightly above your 3-sprint average (12.3 pts).      │
│    Consider dropping one item if the caching layer is uncertain.  │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  [y] Accept    [e] Edit    [n] Reject                            │
└───────────────────────────────────────────────────────────────────┘
```

Pressing `e` opens the proposal in a structured editor overlay where each field is editable. Pressing `y` writes to disk immediately. Pressing `n` dismisses and the LLM can ask what you'd like changed.

---

## Data Model

All state lives in `~/.scrum/` as human-readable markdown files:

```
~/.scrum/
├── backlog.md
├── sprints/
│   ├── sprint-001.md
│   └── ...
├── standups/
│   ├── 2026-04-07.md
│   └── ...
├── retros/
│   ├── sprint-001-retro.md
│   └── ...
├── sessions/
│   ├── current.json         # Active conversation history
│   └── archive/
│       ├── 2026-04-07.json
│       └── ...
└── config.yaml              # LLM provider config, model, theme
```

### config.yaml

```yaml
provider: anthropic          # or openai, ollama, google, etc. (pi-ai routing)
model: claude-sonnet-4-20250514
ollama_base_url: http://localhost:11434  # optional, for local models
temperature: 0.3             # low temp for structured work
theme: dark                  # dark | light
```

pi-ai's `ModelRegistry` + `AuthStorage` handle provider auth. API keys come from environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.) following pi-ai conventions.

### Item Schema (unchanged)

```markdown
- [ ] `a3f1` **Build auth flow** (3 pts) [backend] — OAuth2 login with GitHub
- [x] `b7c2` **Setup CI pipeline** (2 pts) [infra] — GitHub Actions, lint + test
```

Status encoding: `- [ ]` = todo, `- [~]` = wip, `- [x]` = done.

---

## Technical Spec

### Stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Runtime | Node.js ≥ 22 or Bun |
| LLM communication | `@mariozechner/pi-ai` (multi-provider, streaming) |
| Agent loop + tools | `@mariozechner/pi-agent-core` (tool calling, event streaming) |
| TUI rendering | `@mariozechner/pi-tui` (differential rendering, components, overlays, editor, markdown) |
| Config | `yaml` (parsed with `js-yaml`) |
| Testing | `vitest` |
| Distribution | `npm` package with `bin` field, or `bun build --compile` |

### pi Stack Integration

**pi-ai** — Handles LLM provider routing and streaming. `getModel()` resolves the configured provider/model. `streamSimple()` streams completions. Supports Anthropic, OpenAI, Google, Ollama, and others out of the box.

**pi-agent-core** — Provides the agent loop. We define `AgentTool` instances for each scrum tool. The agent core handles tool calling, result injection, and multi-turn conversation management. Event streaming lets the TUI show tool calls live (e.g., "Reading sprint data..." spinner).

**pi-tui** — Renders the chat interface, approval cards, dashboard views, and overlays. The chat is a scrollable `Container` of `Markdown` and custom `ApprovalCard` components. The input is an `Editor` with autocomplete for slash commands.

### Architecture

```
src/
├── index.ts                 # Entry point: parse args, load config, launch
├── config.ts                # Load ~/.scrum/config.yaml, resolve provider
│
├── agent/
│   ├── session.ts           # Create pi-agent-core session with tools + system prompt
│   ├── system-prompt.ts     # System prompt construction (includes live context)
│   ├── tools/
│   │   ├── read-backlog.ts
│   │   ├── read-sprint.ts
│   │   ├── read-sprint-history.ts
│   │   ├── read-standups.ts
│   │   ├── read-retros.ts
│   │   ├── propose-backlog-add.ts
│   │   ├── propose-backlog-edit.ts
│   │   ├── propose-backlog-remove.ts
│   │   ├── propose-sprint-plan.ts
│   │   ├── propose-sprint-update.ts
│   │   ├── propose-sprint-close.ts
│   │   ├── propose-standup.ts
│   │   └── propose-retro.ts
│   └── context.ts           # Builds dynamic context: sprint state, velocity, etc.
│
├── data/
│   ├── markdown.ts          # Read/write/parse item lines, round-trip safe
│   ├── items.ts             # Item type, ID generation, status transitions
│   ├── sprints.ts           # Sprint lifecycle: create, read, close, archive
│   ├── standups.ts          # Standup CRUD
│   ├── retros.ts            # Retro CRUD
│   └── velocity.ts          # Velocity computation across sprint history
│
├── tui/
│   ├── app.ts               # Root TUI: layout, mode switching (chat ↔ dashboard)
│   ├── chat/
│   │   ├── chat-view.ts     # Scrollable conversation container
│   │   ├── message.ts       # Single message component (user or assistant)
│   │   ├── approval-card.ts # Rendered proposal with [y]/[e]/[n] keybindings
│   │   ├── tool-status.ts   # Inline spinner during tool calls
│   │   └── input.ts         # Editor wrapper with slash command autocomplete
│   ├── dashboard/
│   │   ├── board.ts         # Kanban board view
│   │   ├── backlog.ts       # Backlog list view
│   │   ├── standup-log.ts   # Standup history view
│   │   ├── retro-log.ts     # Retro history view
│   │   └── metrics.ts       # Burndown + velocity charts
│   └── components/
│       ├── card.ts          # Kanban item card
│       ├── column.ts        # Kanban column
│       ├── chart.ts         # ASCII chart renderer
│       └── status-bar.ts    # Header with sprint info
│
└── cli.ts                   # Non-interactive: `scrum --cmd "..."` → single turn → exit
```

### Tool Implementation Pattern

Each tool is a pi-agent-core `AgentTool`. Read tools return JSON for the LLM. Propose tools emit a `proposal` event that the TUI intercepts.

```typescript
// Simplified example
const proposeSprintUpdate: AgentTool = {
  name: "propose_sprint_update",
  description: "Propose status changes for sprint items.",
  parameters: Type.Object({
    updates: Type.Array(Type.Object({
      item_id: Type.String(),
      new_status: Type.Union([
        Type.Literal("todo"),
        Type.Literal("wip"),
        Type.Literal("done"),
      ]),
    })),
  }),
  execute: async (params, context) => {
    const sprint = readCurrentSprint();
    const preview = buildUpdatePreview(sprint, params.updates);
    context.emit("proposal", {
      type: "sprint_update",
      preview,
      apply: () => applySprintUpdate(sprint, params.updates),
    });
    return "Proposal shown to user. Waiting for approval.";
  },
};
```

### Approval Flow

```
Agent calls propose_* tool
        ↓
Tool emits "proposal" event with preview + apply callback
        ↓
TUI renders ApprovalCard component
        ↓
[y] → apply() writes to disk → agent receives "Approved."
[e] → editor overlay → user modifies → apply(modified) → agent receives "Approved with edits."
[n] → agent receives "Rejected." → agent can ask why or propose alternative
```

### Session Persistence

Conversation history stored as JSON in `~/.scrum/sessions/`. On launch, the agent reloads the last session. Sessions are pruned: keep last N messages in full, summarize older messages into a context block prepended to the system prompt. The LLM generates its own summaries.

---

## Slash Commands

Available via pi-tui `CombinedAutocompleteProvider`:

| Command | Effect |
|---|---|
| `/board` | Switch to dashboard board view |
| `/backlog` | Switch to dashboard backlog view |
| `/velocity` | Switch to dashboard metrics view |
| `/log` | Switch to dashboard standup log view |
| `/retros` | Switch to dashboard retro log view |
| `/chat` | Return to chat mode |
| `/plan` | Ask LLM to start sprint planning |
| `/standup` | Ask LLM to draft today's standup |
| `/retro` | Ask LLM to run a retrospective |
| `/close` | Ask LLM to close the current sprint |
| `/status` | Ask LLM for a status briefing |
| `/config` | Open config editor overlay |
| `/clear` | Clear chat history (keeps scrum data) |
| `/help` | Show help |

Slash commands are sugar — they send structured messages to the LLM, which uses tools to execute. This keeps the LLM in the loop for all actions.

---

## Key Design Decisions

1. **LLM-first, not form-first.** The primary interface is conversation. You say "add caching layer to the backlog, 5 points" instead of navigating to a form. Forms only appear in approval card edit mode.

2. **Propose-approve-commit.** The LLM never writes to disk autonomously. All mutations go through approval cards. You're in control; the LLM does the drafting.

3. **Tools over raw function calls.** pi-agent-core's tool system gives typed parameters, execution context, event emission, and clean separation between intent and side effects.

4. **Markdown stays source of truth.** The LLM reads the same files a human would. Edit files directly in vim; the LLM picks up changes. Git versioning works for free.

5. **Session persistence with summarization.** Long conversations get LLM-generated summaries to keep context windows manageable while preserving history.

6. **Dashboard is read-only.** All mutations flow through the chat. One interaction paradigm, no conflicts.

7. **Provider-agnostic via pi-ai.** Swap between Claude, GPT, Gemini, or local Ollama by changing config.yaml. Default to Claude Sonnet for tool use; fall back to local for offline.

---

## Non-Goals

- No multi-user support. Personal tool.
- No web UI. Terminal only.
- No cloud sync. Git handles that.
- No codebase awareness in v1. LLM sees only scrum data.
- No sub-agents or plan mode. Single-agent, single-turn tool use.

---

## Future Considerations (v2)

- **Codebase awareness** — Read access to `git log`, file tree, diff stats. Correlate sprint items with commits.
- **GitHub/Linear sync** — Bidirectional issue tracker integration.
- **Proactive notifications** — Background process checks sprint state, sends terminal/OS notifications for risks.
- **Pomodoro integration** — `/focus a3f1` starts a timer, logs time to sprint file.
- **Voice standup** — Whisper transcription → LLM drafts standup from audio.
- **Multi-model routing** — Cheap model for reads, expensive model for planning.