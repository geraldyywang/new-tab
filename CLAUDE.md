@AGENTS.md

## Claude Code

- The roles in `AGENTS.md` are subagents in `.claude/agents/`: `implementer`,
  `reviewer`, `tester`, `style-checker` and `simplifier`. The main session is
  the coordinator.
- Run implementers in their own worktree (`isolation: worktree`). Agents
  working in parallel must keep to their feature folders.
- After an agent reports, verify its claims before telling the maintainer a
  PR is ready:
  - recount the commit line counts
  - rerun the checks
  - open the screenshots
