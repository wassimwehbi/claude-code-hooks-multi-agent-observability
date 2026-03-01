---
description: Install dependencies and start the observability server + client
---

# Install & Run

Set up and run the Multi-Agent Observability system locally, including user-level hook configuration.

## Steps

1. **Check prerequisites** — Verify `bun` and `uv` are installed. If either is missing, tell the user what to install and stop.

2. **Configure user-level hooks** — Read `~/.claude/settings.json`.
   - Search the file for any hook command containing `send_event.py`
   - If found with a **different path** than this repo, update the paths to point to this repo's absolute path
   - If found with the **correct path**, tell the user hooks are already configured and skip
   - If **no `send_event.py` hooks exist**, add them by appending to each event type's hook array (preserving any existing hooks the user already has)
   - `--source-app` is intentionally omitted — `send_event.py` auto-detects it from `$CLAUDE_PROJECT_DIR`
   - Resolve `REPO_ROOT` to the absolute path of this repo's root directory
   - The JSON structure for each hook entry:

   ```json
   {
     "type": "command",
     "command": "uv run REPO_ROOT/.claude/hooks/send_event.py --event-type EVENT_TYPE FLAGS"
   }
   ```

   - For event types that use a matcher (PreToolUse, PostToolUse, PermissionRequest, PostToolUseFailure, SubagentStart), wrap in: `{ "matcher": "", "hooks": [...] }`
   - For all other event types, wrap in: `{ "hooks": [...] }`
   - The 12 event types and their flags:

   | Event Type         | Flags        |
   |--------------------|--------------|
   | PreToolUse         | --summarize  |
   | PostToolUse        | --summarize  |
   | Notification       | --summarize  |
   | Stop               | --add-chat   |
   | SubagentStop       |              |
   | SubagentStart      |              |
   | PreCompact         |              |
   | UserPromptSubmit   | --summarize  |
   | SessionStart       |              |
   | SessionEnd         |              |
   | PermissionRequest  | --summarize  |
   | PostToolUseFailure | --summarize  |

3. **Install dependencies** — Run these in parallel:
   - `cd apps/server && bun install`
   - `cd apps/client && bun install`

4. **Start the system** — Run `./scripts/start-system.sh` in the background.

5. **Verify health** — Wait a few seconds, then check:
   - Server: `curl -sf http://localhost:4000/health`
   - Client: `curl -sf http://localhost:5173`

6. **Report** — Tell the user:
   - Whether user-level hooks were added, updated, or already present
   - Client dashboard: http://localhost:5173
   - Server API: http://localhost:4000
   - To stop: `./scripts/reset-system.sh`
