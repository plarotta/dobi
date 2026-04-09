# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this

Dobi is an AI-powered personal scrum master CLI. The user chats naturally in the terminal; an LLM (via pi-agent-core) proposes changes to scrum state; the user approves/edits/rejects via approval cards; all state persists as markdown in a project-local `.dobi/` directory.

See `docs/prd.md` for full product spec and `docs/plan.md` for implementation plan.

## Build & Test

```bash
npm run build          # tsc
npm run dev            # tsc --watch
npm run test           # vitest run (all tests)
npm run test:watch     # vitest in watch mode
npm start              # interactive TUI mode (requires build first)
npm start -- --cmd "add auth to backlog, 3pts"  # single-turn CLI mode
npx vitest run tests/data/backlog.test.ts   # single test file
```

Requires `ANTHROPIC_API_KEY` env var to run the agent (not needed for tests).

## Tech Stack

- **TypeScript** — strict, ESM (`"type": "module"`), target ES2022, `Node16` module resolution
- **pi-ai** (`@mariozechner/pi-ai`) — multi-provider LLM routing; also re-exports `Type` from `@sinclair/typebox`
- **pi-agent-core** (`@mariozechner/pi-agent-core`) — `Agent` class, `AgentTool` interface, event system
- **pi-tui** (`@mariozechner/pi-tui`) — TUI framework (chat view, dashboard, approval cards)
- **vitest** — testing

## Architecture

### Data layer (`src/data/`)

All scrum state is markdown files in `.dobi/`. The data layer is pure — every function takes `dataDir: string` as its first argument, making it testable with temp directories. No singletons or global state.

Key files: `paths.ts` (directory resolution), `items.ts` (Item interface, ID gen), `markdown.ts` (parse/serialize item lines), `backlog.ts` (CRUD), `sprints.ts` (lifecycle), `standups.ts`/`retros.ts` (read/write), `velocity.ts` (computation).

Item line format is round-trip safe: `- [x] \`id\` **Title** (N pts) [tag] — desc`. Status encoding: `[ ]`=todo, `[~]`=wip, `[x]`=done. Sprint files are `sprint-NNN.md`.

### Agent layer (`src/agent/`)

- **`agent.ts`** — `createAgent(dataDir, approvalManager)` wires model, system prompt, and all 13 tools into a pi-agent-core `Agent`
- **`system-prompt.ts`** — `buildSystemPrompt(dataDir)` combines static scrum master persona with live context (current sprint progress, last standup, velocity trend)
- **`approval.ts`** — `ApprovalManager` (EventEmitter) with promise-based blocking. `requestApproval(toolCallId, proposal)` emits `"proposal"` and returns a Promise; `respond(toolCallId, result)` resolves it
- **`session.ts`** — `loadSession(dataDir)` / `saveSession(dataDir, messages)` with automatic archiving (keeps last 10). `pruneSession(messages)` summarizes older messages via LLM when session exceeds 30 messages, keeping the last 10 in full.
- **`tools/read-*.ts`** (5 tools) — read-only tools returning JSON to LLM + raw data in `details`
- **`tools/propose-*.ts`** (8 tools) — each computes a preview, blocks on `approvalManager.requestApproval()`, then applies or rejects based on user response

**Tool typing pattern:** Tools accept untyped `params` and cast on the first line of `execute`: `const { field } = params as { field: Type }`.

### TUI layer (`src/tui/`)

- **`app.ts`** — `launchApp({ dataDir, agent, approvalManager, openingPrompt? })` creates the root TUI, wires status bar, chat view, input, error display, Ctrl+C shutdown, Ctrl+D dashboard toggle. Subscribes to `agent_start`/`agent_end` to gate input and refresh status.
- **`theme.ts`** — Centralized Chalk color palette (`colors`), `markdownTheme`, `editorTheme`. All components import from here.
- **`chat/`** — Message rendering, tool loaders, approval cards (y/e/n keys, JSON editor overlay), input with slash command autocomplete. `ChatView` subscribes to agent events for streaming.
- **`dashboard/`** — 5 read-only panels (Board, Backlog, Velocity, Log, Retros) toggled via Ctrl+D. Each panel reads `.dobi/` data in its constructor. Hotkeys: B/L/V/K/R switch panels.

### Entry point (`src/`)

- **`index.ts`** — Two modes: TUI mode (default) and CLI mode (`--cmd "..."`). Handles API key check, `ensureStructure()`, session restore with pruning, first-run detection (new projects get a setup prompt instead of status briefing). CLI mode auto-approves all proposals and prints output.
- **`config.ts`** — `getConfiguredModel()` wraps `pi-ai`'s `getModel()` with Anthropic provider and model selection.

## Key Conventions

- **All imports use `.js` extensions** (ESM requirement): `import { foo } from "./bar.js"`
- **Tests use temp directories**: `mkdtempSync` in `beforeEach`, `rmSync` in `afterEach`, pass temp path to `ensureStructure()` to get a `dataDir`
- **Tests live in `tests/` mirroring `src/`**: e.g., `tests/data/backlog.test.ts` tests `src/data/backlog.ts`

## pi-agent-core API reference

```typescript
const agent = new Agent({
  initialState: { systemPrompt, model, tools, messages },
  convertToLlm: (msgs: AgentMessage[]) => Message[],
});
agent.prompt("user message");
agent.subscribe((event: AgentEvent, signal: AbortSignal) => { ... });
agent.state.messages;       // current transcript
agent.state.isStreaming;    // true while processing
agent.abort();              // cancel current run
agent.waitForIdle();        // resolves after agent_end listeners settle
```

**Agent events** (for TUI integration):

- `agent_start`, `agent_end` — run lifecycle
- `turn_start`, `turn_end` — per-LLM-call boundaries
- `message_start`, `message_update`, `message_end` — streaming text chunks
- `tool_execution_start`, `tool_execution_update`, `tool_execution_end` — tool lifecycle

## pi-tui API reference

Key exports from `@mariozechner/pi-tui`:

- `TUI`, `Container`, `Component`, `Focusable`, `isFocusable` — layout/component system
- `Editor`, `EditorOptions`, `EditorTheme` — text input with autocomplete, submit callback, history
- `Markdown`, `MarkdownTheme`, `Text`, `Box`, `Spacer` — display components
- `Loader`, `CancellableLoader` — spinners (`new Loader(tui, spinnerColorFn, messageColorFn, message?)`, call `.start()`/`.stop()`)
- `CombinedAutocompleteProvider`, `SlashCommand` — slash command support (pass `{name, description}[]` to constructor)
- `ProcessTerminal` — terminal abstraction, auto-detects Kitty protocol
- `OverlayHandle`, `OverlayOptions` — `tui.showOverlay(component, opts)` / `handle.hide()`
- `Key`, `matchesKey`, `parseKey` — keyboard input (`matchesKey(data, Key.ctrl("c"))`)

**Component pattern:** `render(width): string[]`, optional `handleInput(data: string)`. `Focusable` adds `focused: boolean`. TUI calls `setFocus(component)` to direct input.

**Input listener:** `tui.addInputListener((data) => { consume?: boolean })` for global keybindings (runs before focused component).

## Implementation Status

- **Phase 1 (Data Layer):** Complete. 40 tests passing.
- **Phase 2 (Agent + Tools):** Complete. All 13 tools, ApprovalManager, system prompt, session persistence.
- **Phase 3 (TUI):** Complete. Chat mode with streaming, approval cards, slash commands, session restore.
- **Phase 4 (Dashboard):** Complete. Ctrl+D toggles dashboard with 5 panels (Board, Log, Velocity, Backlog, Retros).
- **Phase 5 (Polish):** Complete. CLI mode, first-run experience, error handling, session pruning.
