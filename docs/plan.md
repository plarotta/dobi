# Implementation Plan: Dobi — Agentic Terminal Scrum Master

## Context

Building a greenfield CLI app from `prd.md`. The tool is a personal scrum master powered by an LLM that runs in the terminal. The user converses naturally; the LLM proposes changes to scrum state (backlog, sprints, standups, retros) via approval cards; state is persisted as markdown files. Built on the pi-stack (`pi-ai`, `pi-agent-core`, `pi-tui`).

---

## PRD Improvements

### 1. Project-local data (`.dobi/` instead of `~/.scrum/`)
Each project gets its own scrum data in `.dobi/` at the project root. This makes git versioning natural and avoids cross-project collision. The `~/.scrum/` global path doesn't make sense for a personal dev tool.

### 2. Skip `config.yaml` for v1
pi-ai resolves API keys from env vars (`ANTHROPIC_API_KEY`, etc.) out of the box. For v1, use `getModel("anthropic", "claude-sonnet-4-20250514")` with defaults. Add config.yaml support in v1.1 when multi-provider switching is actually needed.

### 3. Approval flow redesign
The PRD describes `context.emit("proposal", ...)` but pi-agent-core doesn't have that API. Tools return `AgentToolResult`. The approval flow uses a shared `ApprovalManager` — tools block on a promise; the TUI renders the card and resolves the promise when the user acts.

```
LLM calls propose_* tool
  -> tool.execute() reads state, computes preview
  -> tool calls approvalManager.requestApproval(preview) -- BLOCKS on Promise
  -> ApprovalManager emits "proposal" event
  -> TUI hears event, renders ApprovalCard as overlay
  -> User presses y/e/n
  -> TUI calls approvalManager.respond(result)
  -> Promise resolves in tool.execute()
  -> Tool writes to disk (if approved) and returns result to LLM
```

### 4. Command name: `dobi`
Matches the repo name. The PRD says `scrum` but that's generic.

### 5. Phased build
Chat mode first, dashboard second. The chat + approval flow is the core product; the dashboard is a read-only view that can follow.

---

## Architecture

```
src/
├── index.ts                 # Entry, parse args, init data dir, launch TUI or CLI mode
├── config.ts                # Resolve model + provider (env vars for v1)
│
├── data/
│   ├── paths.ts             # Resolve .dobi/ directory, ensure structure exists
│   ├── items.ts             # Item type, ID gen (nanoid 4-char), status enum
│   ├── markdown.ts          # Parse/write markdown item lines, round-trip safe
│   ├── backlog.ts           # Backlog CRUD (read/add/edit/remove items)
│   ├── sprints.ts           # Sprint lifecycle (create/read/close, current sprint)
│   ├── standups.ts          # Standup CRUD
│   ├── retros.ts            # Retro CRUD
│   └── velocity.ts          # Velocity computation from sprint history
│
├── agent/
│   ├── agent.ts             # Create pi-agent-core Agent, wire tools + system prompt
│   ├── system-prompt.ts     # Build system prompt with live context injection
│   ├── approval.ts          # ApprovalManager: promise-based approval queue
│   ├── session.ts           # Session persistence (save/load messages as JSON)
│   └── tools/
│       ├── read-backlog.ts
│       ├── read-sprint.ts
│       ├── read-sprint-history.ts
│       ├── read-standups.ts
│       ├── read-retros.ts
│       ├── propose-backlog-add.ts
│       ├── propose-backlog-edit.ts
│       ├── propose-backlog-remove.ts
│       ├── propose-sprint-plan.ts
│       ├── propose-sprint-update.ts
│       ├── propose-sprint-close.ts
│       ├── propose-standup.ts
│       └── propose-retro.ts
│
├── tui/
│   ├── app.ts               # Root TUI: layout, mode switching, event wiring
│   ├── theme.ts             # Color/style definitions
│   ├── chat/
│   │   ├── chat-view.ts     # Scrollable conversation container
│   │   ├── message.ts       # Single message component (Markdown wrapper)
│   │   ├── approval-card.ts # Bordered proposal card with y/e/n keybindings
│   │   ├── tool-status.ts   # Inline spinner during tool calls
│   │   └── input.ts         # Editor wrapper + slash command autocomplete
│   └── dashboard/
│       ├── board.ts         # Kanban columns (TODO / WIP / DONE)
│       ├── backlog.ts       # Backlog list view
│       ├── velocity.ts      # ASCII velocity chart
│       └── log.ts           # Standup/retro log views
│
└── cli.ts                   # Non-interactive: `dobi --cmd "..."` single turn
```

---

## Implementation Phases

### Phase 1: Scaffold + Data Layer ✅ COMPLETE

**Goal:** Project setup and all markdown CRUD with tests.

#### 1.1 Project init
- `package.json` with `bin: { dobi: "./dist/index.js" }`, type: "module"
- Dependencies: `@mariozechner/pi-ai`, `@mariozechner/pi-agent-core`, `@mariozechner/pi-tui`, `@sinclair/typebox`, `nanoid`, `chalk`
- Dev deps: `typescript`, `vitest`, `@types/node`
- `tsconfig.json` — strict, ESM, target ES2022, outDir: dist
- `vitest.config.ts`
- `.gitignore`

#### 1.2 `src/data/paths.ts`
- `getDataDir()` — finds or creates `.dobi/` in cwd
- `ensureStructure()` — creates subdirs: `sprints/`, `standups/`, `retros/`, `sessions/`, `sessions/archive/`

#### 1.3 `src/data/items.ts`
```typescript
interface Item {
  id: string;        // 4-char nanoid
  title: string;
  points: number;
  tags: string[];
  description: string;
  status: "todo" | "wip" | "done";
}
```
- `generateId()` — 4-char alphanumeric via nanoid
- `transitionStatus(from, to)` — validates legal transitions

#### 1.4 `src/data/markdown.ts`
Parse/serialize the item line format:
```
- [ ] `a3f1` **Build auth flow** (3 pts) [backend] — Description here
- [~] `c4d5` **Vector store** (5 pts) [backend] — In progress
- [x] `b7c2` **Setup CI** (2 pts) [infra] — Done
```
- `parseItemLine(line: string): Item | null`
- `serializeItem(item: Item): string`
- Must be round-trip safe: `serializeItem(parseItemLine(line)) === line`
- Status encoding: `[ ]` = todo, `[~]` = wip, `[x]` = done

#### 1.5 `src/data/backlog.ts`
- `readBacklog(): Item[]` — parse `backlog.md`
- `writeBacklog(items: Item[]): void` — serialize and write
- `addItems(items: Item[]): void` — append to backlog
- `editItem(id: string, updates: Partial<Item>): void`
- `removeItem(id: string): void`

#### 1.6 `src/data/sprints.ts`
Sprint file format (`sprint-001.md`):
```markdown
# Sprint 1 — "Auth & CI"

- **Goal:** Ship authentication and CI pipeline
- **Duration:** 2 weeks (Apr 7 – Apr 21)
- **Planned:** 11 pts
- **Completed:** 0 pts
- **Status:** active

## Items

- [ ] `a3f1` **Build auth flow** (3 pts) [backend] — OAuth2 login
- [~] `c4d5` **Vector store** (5 pts) [backend] — Integration
- [x] `b7c2` **Setup CI** (2 pts) [infra] — GitHub Actions
```

Functions:
- `getCurrentSprint(): Sprint | null` — find the sprint with status "active"
- `readSprint(number: number): Sprint`
- `createSprint(goal, duration, items): Sprint` — auto-increments number
- `updateSprintItem(sprintNum, itemId, updates): void`
- `closeSprint(sprintNum, incomplete: "backlog" | "carry"): SprintSummary`
- `listSprints(): SprintSummary[]`

#### 1.7 `src/data/standups.ts`
File format (`2026-04-08.md`):
```markdown
# Standup — April 8, 2026

## Yesterday
- Finished CI pipeline setup

## Today
- Starting on auth flow
- Review vector store PR

## Blockers
- None
```

Functions:
- `readStandups(n?: number): Standup[]` — last N standups sorted by date
- `writeStandup(standup: Standup): void`

#### 1.8 `src/data/retros.ts`
File format (`sprint-001-retro.md`):
```markdown
# Retrospective — Sprint 1

## What went well
- CI pipeline shipped early
- Clean estimates on small tasks

## What didn't go well
- Vector store was underestimated by 2x
- No standups logged for 3 days

## Action items
- [ ] Break large items into sub-tasks before sprint start
- [ ] Set daily standup reminder
```

Functions:
- `readRetros(n?: number): Retro[]`
- `writeRetro(retro: Retro): void`

#### 1.9 `src/data/velocity.ts`
- `computeVelocity(sprints: SprintSummary[]): VelocityData`
- Returns: average velocity (last 3 sprints), per-sprint breakdown (planned vs completed), trend direction

#### 1.10 Tests
- `tests/data/markdown.test.ts` — round-trip parsing, edge cases (no tags, no description, special chars)
- `tests/data/backlog.test.ts` — CRUD operations on temp directory
- `tests/data/sprints.test.ts` — lifecycle (create, update items, close)
- `tests/data/velocity.test.ts` — velocity computation with varying sprint data

---

### Phase 2: Agent + Tools ✅ COMPLETE

**Goal:** Working agent with all 13 tools, approval flow, session persistence.

#### 2.1 `src/config.ts`
```typescript
export function getConfiguredModel() {
  return getModel("anthropic", "claude-sonnet-4-20250514");
}
```
- Check for `ANTHROPIC_API_KEY` in env
- Throw helpful error with setup instructions if missing

#### 2.2 `src/agent/system-prompt.ts`
Static prompt (from PRD's agent system prompt section) + dynamic context block:
```
Current sprint: Sprint 3, Day 6/14, 6/11 pts done (55%)
Last standup: April 5, 2026 (3 days ago)
Velocity (3-sprint avg): 12.3 pts/sprint
```
- `buildSystemPrompt(dataDir: string): string`

#### 2.3 `src/agent/approval.ts`
```typescript
type ApprovalResult =
  | { action: "accept" }
  | { action: "reject" }
  | { action: "edit"; data: unknown };

interface Proposal {
  type: string;           // "sprint_plan", "backlog_add", etc.
  title: string;          // "Sprint Plan" for card header
  preview: string;        // Rendered preview text
  data: unknown;          // Structured data for editing
}

class ApprovalManager extends EventEmitter {
  requestApproval(toolCallId: string, proposal: Proposal): Promise<ApprovalResult>;
  respond(toolCallId: string, result: ApprovalResult): void;
}
```

#### 2.4 Read tools (5 tools)
Each tool:
- Defines `parameters` with `@sinclair/typebox` (Type.Object)
- `execute()` calls data layer, returns `{ content: [{ type: "text", text: JSON.stringify(data) }], details: data }`

| Tool | Parameters | Returns |
|------|-----------|---------|
| `read_backlog` | none | All backlog items |
| `read_sprint` | `{ sprint_number?: number }` | Current or specified sprint |
| `read_sprint_history` | `{ count?: number }` | Last N sprint summaries |
| `read_standups` | `{ count?: number }` | Last N standups (default 5) |
| `read_retros` | `{ count?: number }` | Last N retros |

#### 2.5 Propose tools (8 tools)
Each tool:
- Computes preview from current state + proposed changes
- Calls `approvalManager.requestApproval()` (blocks)
- On accept: applies changes via data layer
- On reject: returns rejection message to LLM
- On edit: applies edited version

| Tool | Parameters | Effect on Accept |
|------|-----------|-----------------|
| `propose_backlog_add` | `{ items: Array<{ title, points, tags, description }> }` | Adds items to backlog.md |
| `propose_backlog_edit` | `{ item_id, updates: { title?, points?, tags?, description? } }` | Edits item in backlog.md |
| `propose_backlog_remove` | `{ item_id }` | Removes item from backlog.md |
| `propose_sprint_plan` | `{ goal, duration_weeks, item_ids }` | Creates new sprint file, moves items from backlog |
| `propose_sprint_update` | `{ updates: Array<{ item_id, new_status }> }` | Updates item statuses in current sprint |
| `propose_sprint_close` | `{ incomplete_action: "backlog" \| "carry" }` | Closes sprint, handles incomplete items |
| `propose_standup` | `{ yesterday, today, blockers }` | Creates standup file |
| `propose_retro` | `{ went_well, didnt_go_well, action_items }` | Creates retro file |

#### 2.6 `src/agent/agent.ts`
```typescript
export function createAgent(dataDir: string, approvalManager: ApprovalManager) {
  const model = getConfiguredModel();
  const tools = [...readTools(dataDir), ...proposeTools(dataDir, approvalManager)];
  const systemPrompt = buildSystemPrompt(dataDir);

  return new Agent({
    initialState: { systemPrompt, model, tools },
    convertToLlm: (msgs) => msgs.filter(m => "role" in m && ["user", "assistant", "toolResult"].includes(m.role)),
  });
}
```

#### 2.7 `src/agent/session.ts`
- `saveSession(dataDir, messages): void` — write to `.dobi/sessions/current.json`
- `loadSession(dataDir): AgentMessage[] | null` — reload last session
- On save: archive previous session with date stamp
- Prune: keep only last 10 archived sessions

#### Phase 2 Implementation Notes

- **Tool param typing:** `AgentTool` with default generics types `params` as `unknown`. All tools accept untyped params and cast on the first line: `const { field } = params as { ... }`.
- **`convertToLlm`** filters `AgentMessage[]` to standard `Message[]` (user/assistant/toolResult roles) using a type guard.
- **Propose tools** all follow the same pattern: read state → build preview string → `approvalManager.requestApproval()` (blocks) → apply or reject. On "edit", `result.data` is cast to the original proposal data type.
- **`propose_sprint_plan`** removes planned items from the backlog after creating the sprint.
- **`propose_sprint_close`** with `incomplete_action: "backlog"` resets incomplete items to "todo" status before adding them back to the backlog.
- **System prompt** dynamically computes sprint day/progress, standup recency, and velocity trend on each call to `buildSystemPrompt()`.

---

### Phase 3: TUI (Chat Mode) ✅ COMPLETE

**Goal:** Full interactive chat experience.

#### 3.1 `src/tui/theme.ts`
Chalk-based color definitions:
- `userMsg` — dim white
- `assistantMsg` — white
- `border` — gray
- `header` — bold cyan
- `proposalBorder` — yellow
- `accepted` — green
- `rejected` — red
- `error` — red bold
- `spinner` — cyan

#### 3.2 `src/tui/chat/message.ts`
- Wraps pi-tui `Markdown` component
- Different left-border color for user (blue) vs assistant (none)
- Prefix: `> you:` or `dobi:`

#### 3.3 `src/tui/chat/tool-status.ts`
- `Loader` component showing tool name during execution
- Maps tool names to friendly labels: `read_backlog` -> "Reading backlog..."

#### 3.4 `src/tui/chat/approval-card.ts`
Custom `Component` implementing the approval card UI from the PRD:
```
┌─ PROPOSAL: Sprint Plan ─────────────────────────┐
│                                                   │
│  Sprint 4 — "Caching & Performance"              │
│  Duration: 2 weeks (Apr 21 – May 5)              │
│  ...                                              │
│                                                   │
├───────────────────────────────────────────────────┤
│  [y] Accept    [e] Edit    [n] Reject            │
└───────────────────────────────────────────────────┘
```
- `handleInput` captures y/e/n keys
- `e` opens editor overlay via `tui.showOverlay(editor, { ... })`
- Calls `approvalManager.respond()` with result

#### 3.5 `src/tui/chat/input.ts`
- Wraps pi-tui `Editor`
- `onSubmit` -> sends text to `agent.prompt()`
- `CombinedAutocompleteProvider` with slash commands:
  - `/plan`, `/standup`, `/retro`, `/close`, `/status`, `/board`, `/backlog`, `/velocity`, `/log`, `/retros`, `/clear`, `/help`
- Disables submit while `agent.state.isStreaming` is true

#### 3.6 `src/tui/chat/chat-view.ts`
- `Container` holding message components
- Subscribes to `agent.subscribe()`:
  - `message_start` -> add Markdown component (empty)
  - `message_update` -> call `markdown.setText()` with accumulated text
  - `message_end` -> finalize
  - `tool_execution_start` -> add Loader
  - `tool_execution_end` -> remove Loader
- Subscribes to `approvalManager` "proposal" event -> add ApprovalCard
- Auto-scrolls: ensure bottom content is visible

#### 3.7 `src/tui/app.ts`
Layout:
```
┌──────────────────────────────────────────────┐
│  DOBI  Sprint 3 · Day 6/14 · 55% done       │  <- Text component (status bar)
├──────────────────────────────────────────────┤
│                                              │
│  ... chat messages ...                       │  <- ChatView (Container, scrollable)
│                                              │
├──────────────────────────────────────────────┤
│  > type here...                              │  <- Input (Editor)
└──────────────────────────────────────────────┘
```
- `ProcessTerminal` from pi-tui
- `TUI` with children: [statusBar, chatView, input]
- `setFocus(input)` — editor has focus by default
- Ctrl+D -> toggle dashboard (phase 4, no-op for now)
- Ctrl+C -> graceful shutdown (save session, stop TUI)

#### 3.8 `src/index.ts`
```typescript
1. Parse args (--cmd flag)
2. ensureStructure() — init .dobi/
3. Check for API key, show setup instructions if missing
4. Load previous session
5. Create ApprovalManager
6. Create Agent
7. Launch TUI (app.ts)
8. Send opening prompt: agent.prompt("Give me a status briefing.")
9. On quit: save session, cleanup
```

#### Phase 3 Pre-Implementation Notes

Key integration points between Phase 2 (agent) and Phase 3 (TUI):

- **Agent event wiring:** `agent.subscribe()` receives `AgentEvent` objects. The chat view needs to handle `message_start`/`message_update`/`message_end` for streaming text, and `tool_execution_start`/`tool_execution_end` for showing loaders. The `message_update` event includes `assistantMessageEvent` with `type: "text_delta"` containing the delta text.
- **Approval card integration:** The `ApprovalManager` emits `"proposal"` events with `(toolCallId, proposal)`. The TUI renders an `ApprovalCard`, and when the user acts, calls `approvalManager.respond(toolCallId, { action: "accept" | "reject" | "edit", data? })`. The tool's `execute()` is blocked on this Promise, so the response unblocks the agent loop.
- **Session restore:** `loadSession()` returns `AgentMessage[]`. Set `agent.state.messages = loaded` before the first prompt to restore conversation history.
- **Input gating:** Check `agent.state.isStreaming` to disable submit while the agent is processing.
- **pi-tui components available:** `TUI` (root), `Container` (layout), `Editor` (input), `Markdown` (rich text), `Text` (plain), `Box` (borders), `Loader`/`CancellableLoader` (spinners), `Spacer`, `ProcessTerminal`, `CombinedAutocompleteProvider` + `SlashCommand` for autocomplete, overlay system via `TUI.showOverlay()`.
- **Keyboard handling:** pi-tui exports `Key`, `matchesKey()`, `parseKey()`. Components implement `handleInput(key: Key)` for custom keybindings.

#### Phase 3 Implementation Notes

- **Theme centralization:** All colors and pi-tui theme objects (`MarkdownTheme`, `EditorTheme`) live in `src/tui/theme.ts`. Components import from there rather than constructing their own chalk styles.
- **Component wrappers vs. raw pi-tui:** `MessageComponent`, `ChatInput`, and `ApprovalCard` are thin wrappers implementing `Component` (and `Focusable` where needed) that delegate rendering to pi-tui primitives (`Markdown`, `Editor`, `Text`). This keeps the pi-tui dependency shallow.
- **Agent event handling in `ChatView`:** Events arrive as `AgentEvent` with a `type` discriminant. The `message` field on `message_start`/`message_update`/`message_end` is typed as `AgentMessage` (union type) — runtime checks on `role` determine if it's user vs. assistant. `assistantMessageEvent` on `message_update` is accessed via cast since the discriminant is on `event.type`, not the sub-event.
- **Focus flow during approvals:** When an `ApprovalCard` renders, `tui.setFocus(card)` steals focus from the input so y/e/n keys route to the card. On `agent_end`, focus returns to the input.
- **Approval edit flow:** Pressing `e` on an approval card opens an `Editor` in an overlay (`tui.showOverlay`). The editor is pre-filled with `JSON.stringify(proposal.data)`. On submit, the text is parsed back to JSON and sent as `{ action: "edit", data }`. Invalid JSON falls back to reject.
- **Input gating:** Two mechanisms: (1) `ChatInput.onSubmit` checks `agent.state.isStreaming` before calling `prompt()`, (2) `app.ts` sets `input.disableSubmit = true` on `agent_start` and `false` on `agent_end`.
- **Ctrl+D mode switching:** `app.ts` has a Ctrl+D handler in `tui.addInputListener()` that swaps TUI children between chat mode (`chatView` + `input`) and dashboard mode (`dashboardView`). A new `DashboardView` is constructed on each entry to refresh data from disk.
- **No scrollback management yet:** `ChatView` uses a plain `Container` that grows unbounded. Phase 5 should consider pruning old messages or implementing virtual scrolling for long sessions.

---

### Phase 4: Dashboard Mode ✅ COMPLETE

**Goal:** Read-only views toggled via Ctrl+D.

#### 4.1 Board view
Three-column kanban using plain `Text` rendering. Items grouped by status from `getCurrentSprint()`. Each card shows `id title (Npts) [tags]`, truncated to column width.

#### 4.2 Backlog view
List of all backlog items with points, tags, and summary header showing item count and total points.

#### 4.3 Velocity view
ASCII bar chart — `█` for completed, `░` for remaining. Bars scaled relative to max planned points. Shows average velocity and trend arrow (↑/↓/→).

#### 4.4 Log views
Standup and retro history as separate panels, rendered with chalk-styled text (not Markdown components — simpler and sufficient for read-only display).

#### 4.5 Navigation
Tab bar: `[B]oard [L]og [V]elocity [K]Backlog [R]etros`
Hotkeys switch the active dashboard panel. Ctrl+D returns to chat. Active tab is highlighted with `colors.header`, inactive tabs use `colors.muted`.

#### Phase 4 Implementation Notes

- **Dashboard file structure:** `src/tui/dashboard/` contains `dashboard-view.ts` (shell + tab bar + hotkeys) and 5 panel files: `board.ts`, `backlog-panel.ts`, `velocity-panel.ts`, `log-panel.ts`, `retros-panel.ts`.
- **Component pattern:** Each panel implements `Component` with `render(width): string[]` and a no-op `invalidate()`. Only `DashboardView` implements `Focusable` to receive B/L/V/K/R hotkey input. Panels are stateless after construction — data is read from `.dobi/` in the constructor.
- **Mode switching in `app.ts`:** `toggleDashboard()` removes/adds TUI children. A new `DashboardView` is constructed on each entry (fresh data reads). The `mode` variable gates focus management in the `agent_end` handler so focus returns to `input` only in chat mode.
- **No scrolling in dashboard panels yet:** Panels render all content. For long backlogs or many standups, scrolling support would need to be added (Phase 5 candidate).

---

### Phase 5: Polish ✅ COMPLETE

1. **CLI mode** (`dobi --cmd "add caching to backlog, 5pts"`) — Single-turn agent, auto-approve proposals, print result, exit
2. **Session pruning** — Keep last N messages in full, summarize older via LLM (`pruneSession()` in `session.ts`)
3. **First-run experience** — If `backlog.md` doesn't exist, opening prompt guides user through first backlog items
4. **Error handling** — `agent.prompt()` errors caught and displayed in chat via `showError()`, input re-enabled on failure

---

## Dependencies

```json
{
  "dependencies": {
    "@mariozechner/pi-ai": "^0.65.2",
    "@mariozechner/pi-agent-core": "^0.65.2",
    "@mariozechner/pi-tui": "^0.65.2",
    "@sinclair/typebox": "^0.34.41",
    "nanoid": "^5.0.0",
    "chalk": "^5.6.2"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@types/node": "^22.0.0"
  }
}
```

---

## Verification

1. **Data layer**: `vitest` unit tests — parse/serialize round-trips, CRUD operations on temp dirs
2. **Agent tools**: Integration tests with pi-ai `faux` provider — verify tool calls produce correct file changes
3. **TUI**: Manual testing — launch `dobi`, verify chat flow, approval cards, slash commands
4. **End-to-end**: Create a backlog -> plan a sprint -> do a standup -> close the sprint -> run a retro, all through natural conversation
