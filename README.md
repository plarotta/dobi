# dobi

An AI-powered personal scrum master that runs in your terminal. You chat naturally; the LLM proposes changes to your backlog, sprints, standups, and retros; you approve, edit, or reject via interactive cards. All state persists as markdown files in a local `.dobi/` directory.

## Quick start

```bash
npm install -g @plarotta/dobi
```

Then `cd` into any project and run:

```bash
dobi
```

On first launch, dobi will walk you through selecting an LLM provider (Anthropic, OpenAI, Google Gemini, xAI, Groq, or OpenRouter) and entering your API key. Config is saved to `~/.dobi/config.json`.

After setup, dobi creates a `.dobi/` directory in your project and helps you set up your first backlog items.

### Supported providers

| Provider | Default model | Env var |
| --- | --- | --- |
| Anthropic | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| OpenAI | `gpt-4o` | `OPENAI_API_KEY` |
| Google Gemini | `gemini-2.0-flash` | `GOOGLE_API_KEY` |
| xAI | `grok-3-mini` | `XAI_API_KEY` |
| Groq | `llama-3.3-70b-versatile` | `GROQ_API_KEY` |
| OpenRouter | `anthropic/claude-sonnet-4` | `OPENROUTER_API_KEY` |

You can also skip the setup wizard by setting env vars directly:

```bash
export DOBI_PROVIDER=anthropic
export DOBI_API_KEY=sk-ant-...
# Optional: override the default model
export DOBI_MODEL=claude-sonnet-4-20250514
```

Or, for backwards compatibility, just set `ANTHROPIC_API_KEY`.

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
git clone https://github.com/plarotta/dobi.git
cd dobi
npm install
npm run build
npm start
```

```bash
npm run build              # Compile TypeScript
npm run dev                # Watch mode
npm run test               # Run all tests
npm run test:watch         # Watch mode for tests
npx vitest run tests/data/backlog.test.ts   # Single test file
```

### Tech stack

- **TypeScript** (strict, ESM, ES2022)
- **[pi-ai](https://github.com/nicepkg/pi)** -- multi-provider LLM routing
- **pi-agent-core** -- agent loop, tool calling, event streaming
- **pi-tui** -- terminal UI framework
- **vitest** -- testing

## License

MIT
