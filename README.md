# dobi

An AI-powered personal scrum master that runs in your terminal. You chat naturally; the LLM proposes changes to your backlog, sprints, standups, and retros; you approve, edit, or reject via interactive cards. All state persists as markdown files in a local `.dobi/` directory.

Built on the [pi stack](https://github.com/nicepkg/pi) (`pi-ai`, `pi-agent-core`, `pi-tui`).

## Quick start

```bash
# Install dependencies
npm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Build and run
npm run build
npm start

# to use in other projects, run this once and then you should be able to use dobi commands outside of this repo
npm link 
```

On first launch, dobi creates a `.dobi/` directory in your project root and walks you through setting up your first backlog items.

## Usage

### Interactive mode (default)

```bash
dobi
```

Opens a TUI with a chat interface. Talk to your scrum master in natural language:

- *"Add implement caching to the backlog, 5 points, backend"*
- *"Let's plan the next sprint"*
- *"I finished the auth flow"*
- *"Let's do standup"*
- *"Close the sprint"*

The LLM reads your scrum data, proposes changes via approval cards, and you accept (`y`), edit (`e`), or reject (`n`).

### CLI mode

```bash
dobi --cmd "add caching layer to backlog, 5pts"
```

Runs a single-turn interaction, auto-approves all proposals, prints the result, and exits. Useful for scripting or quick updates.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Ctrl+D` | Toggle dashboard (kanban board, velocity, logs) |
| `Ctrl+C` | Save session and quit |
| `B/L/V/K/R` | Switch dashboard panels (Board, Log, Velocity, Backlog, Retros) |

### Slash commands

Type these in the chat input for quick actions:

| Command | Action |
| --- | --- |
| `/plan` | Start sprint planning |
| `/standup` | Draft today's standup |
| `/retro` | Run a retrospective |
| `/close` | Close the current sprint |
| `/status` | Get a status briefing |
| `/backlog` | Show the backlog |
| `/velocity` | Show velocity trend |
| `/help` | Show available commands |

## How it works

Every interaction follows the **propose-review-commit** pattern:

```text
You say what you did or what you're thinking about
                    |
    LLM interprets, reads scrum state, proposes changes
                    |
       You approve, edit, or reject the proposal
                    |
              State persists to markdown
```

The LLM never writes to disk without your approval. All mutations go through approval cards that show exactly what will change.

### Data storage

All scrum state lives in `.dobi/` as human-readable markdown:

```text
.dobi/
  backlog.md              # Product backlog
  sprints/
    sprint-001.md         # Sprint files with items and metadata
  standups/
    2026-04-08.md         # Daily standups
  retros/
    sprint-001-retro.md   # Sprint retrospectives
  sessions/
    current.json          # Conversation history
    archive/              # Archived sessions
```

Files are plain markdown you can read, edit, or version with git.

### Item format

```markdown
- [ ] `a3f1` **Build auth flow** (3 pts) [backend] -- OAuth2 login
- [~] `c4d5` **Vector store** (5 pts) [backend] -- In progress
- [x] `b7c2` **Setup CI** (2 pts) [infra] -- Done
```

Status: `[ ]` = todo, `[~]` = in progress, `[x]` = done.

## Development

```bash
npm run build              # Compile TypeScript
npm run dev                # Watch mode
npm run test               # Run all tests
npm run test:watch         # Watch mode for tests
npx vitest run tests/data/backlog.test.ts   # Single test file
```

### Architecture

```text
src/
  index.ts                 # Entry point: CLI/TUI mode, arg parsing
  config.ts                # LLM model configuration

  data/                    # Pure data layer -- all functions take dataDir, no globals
    paths.ts               # .dobi/ directory resolution
    items.ts               # Item type, ID generation, status transitions
    markdown.ts            # Round-trip safe markdown parsing/serialization
    backlog.ts             # Backlog CRUD
    sprints.ts             # Sprint lifecycle (create, update, close)
    standups.ts            # Standup read/write
    retros.ts              # Retro read/write
    velocity.ts            # Velocity computation from sprint history

  agent/                   # LLM agent with 13 tools
    agent.ts               # Agent creation, tool wiring
    system-prompt.ts       # Scrum master persona + live context
    approval.ts            # Promise-based approval flow
    session.ts             # Session persistence and LLM-based pruning
    tools/                 # 5 read tools + 8 propose tools

  tui/                     # Terminal UI
    app.ts                 # Root layout, mode switching, keybindings
    theme.ts               # Colors and styling
    chat/                  # Chat view, messages, approval cards, input
    dashboard/             # Board, backlog, velocity, log, retros panels
```

### Tech stack

- **TypeScript** (strict, ESM, ES2022)
- **pi-ai** -- multi-provider LLM routing
- **pi-agent-core** -- agent loop, tool calling, event streaming
- **pi-tui** -- terminal UI framework
- **vitest** -- testing

## Todo

- [ ] **Fix timezone bug in sprint date calculation** (`src/data/sprints.ts:182-185`) -- `new Date("2026-04-07")` parses as UTC midnight, but `setDate()` operates in local time, producing off-by-one end dates depending on timezone. Use explicit UTC methods or parse date components directly.
- [ ] **Remove non-null assertion in sprint listing** (`src/data/sprints.ts:136`) -- `f.match(...)![1]` is guarded by a prior filter but fragile if the regexes ever diverge. Use optional chaining with a fallback.
- [ ] **Re-validate transitions after approval edit** (`src/agent/tools/propose-sprint-update.ts:83-89`) -- When a user edits the approval JSON, the edited updates are applied without re-checking `isValidTransition()`. Invalid manual edits could corrupt sprint state.
- [ ] **Collect all validation errors in sprint update** (`src/agent/tools/propose-sprint-update.ts:43-61`) -- The validation loop returns on the first bad update. Batch all errors so the user sees which updates are valid and which aren't.
- [ ] **Add try/catch around file I/O in propose tools** (`src/agent/tools/propose-*.ts`) -- File writes after approval have no error handling. A disk-full or permission error would crash the agent instead of showing an error message.

## Docs

- [`docs/prd.md`](docs/prd.md) -- Product requirements
- [`docs/plan.md`](docs/plan.md) -- Implementation plan
- [`CLAUDE.md`](CLAUDE.md) -- Claude Code context (architecture details, API references)

## License

MIT
