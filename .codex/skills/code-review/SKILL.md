---
name: code-review
description: Review repository code changes for correctness, maintainability, and merge risk. Use when Codex is asked to review a diff, pull request, staged changes, local changes, or recent implementation before merge, with emphasis on bugs, logic errors, inefficiencies, edge cases, security issues, simplification opportunities, and missing error handling.
---

# Code Review

## Review Workflow

1. Read `AGENTS.md` first and apply all project-specific constraints before judging the diff.
2. Identify the exact review target:
   - Use PR context when the user provides it.
   - Otherwise inspect `git status`, staged changes, unstaged changes, and branch/base diffs as relevant.
   - If the target is ambiguous, state the assumption used.
3. Review behavior, not just text. Trace changed data flow, async flow, state updates, rendering paths, build configuration, and tests affected by the change.
4. Prioritize findings by concrete risk. Lead with issues that could break production behavior, corrupt data, expose secrets, weaken security, or block critical user paths.

## What To Look For

Focus on these categories:

- Bugs and logic errors: incorrect conditions, stale state, invalid assumptions, broken control flow, bad type narrowing, off-by-one errors, regressions in existing behavior.
- Inefficiencies: avoidable O(n^2) work, repeated expensive computations, redundant network or database calls, unnecessary React re-renders, excessive DOM markers or listeners, unbounded work on large inputs.
- Edge cases: null or undefined values, empty arrays, duplicate records, missing assets, large inputs, race conditions, cleanup on unmount, failed requests, slow networks, unexpected user actions.
- Security issues: injection vectors, exposed secrets, unsafe URL handling, missing auth or authorization checks, untrusted input reaching HTML, SQL, shell, storage, or external APIs.
- Simplification: over-engineered code, needless abstractions, duplicated logic, complicated branches that can be safely reduced without losing clarity.
- Missing error handling: uncaught exceptions, unhandled promises, ignored API failures, missing fallbacks, user-visible dead ends, cleanup failures.

## Review Standards

- Do not edit code during review unless the user explicitly asks for fixes.
- Avoid style-only comments unless style hides a correctness, maintainability, or future-change risk.
- Do not ask for tests automatically. If tests are missing, explain the specific risk or scenario that needs coverage.
- Respect local architecture boundaries. For this repository, keep data normalization outside UI components and preserve the map's cluster/photo-marker optimization model.
- Prefer precise, actionable findings over broad advice. Each finding should explain what breaks, where, and under what condition.

## Output Format

- Present findings first, ordered by severity.
- Include file and line references for every actionable finding.
- In Codex Desktop review contexts, emit one `::code-comment{...}` directive per actionable finding with a tight line range.
- If no issues are found, say that clearly and mention any residual risk or test gap.
- Keep summaries brief and secondary to findings.
