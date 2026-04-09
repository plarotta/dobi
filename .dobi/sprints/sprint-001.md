# Sprint 1 — "Complete Dobi MVP implementation with all core phases working"

- **Goal:** Complete Dobi MVP implementation with all core phases working
- **Duration:** 1 weeks (2026-04-08 – 2026-04-15)
- **Planned:** 73 pts
- **Completed:** 60 pts
- **Status:** active

## Items

- [x] `vx0n` **Phase 1: Complete scaffold and data layer** (13 pts) [core] [data] — Project setup, all markdown CRUD operations, and comprehensive tests. Includes paths.ts, items.ts, markdown.ts, backlog.ts, sprints.ts, standups.ts, retros.ts, velocity.ts with full test coverage.
- [x] `l436` **Phase 2: Build agent and tools system** (21 pts) [agent] [tools] — Complete agent system with all 13 tools (5 read + 8 propose), approval flow with ApprovalManager, session persistence, and system prompt with dynamic context injection.
- [x] `UIno` **Phase 3: Implement TUI chat mode** (18 pts) [tui] [chat] — Full interactive chat experience with message components, approval cards, tool status, input handling, session restoration, and agent event wiring using pi-tui components.
- [x] `1OPl` **Phase 4: Build dashboard mode** (8 pts) [tui] [dashboard] — Read-only views with board (kanban), backlog list, velocity chart, log views. Tab navigation and Ctrl+D toggle between chat and dashboard modes.
- [ ] `J2OM` **Phase 5: Polish and CLI mode** (5 pts) [polish] [cli] — CLI mode for single-turn commands, session pruning, first-run experience, error handling, and network failure recovery.
- [ ] `74no` **Manual testing and integration verification** (8 pts) [testing] [integration] — End-to-end testing of complete workflow: create backlog → plan sprint → do standup → close sprint → run retro. Verify all approval flows and edge cases.
