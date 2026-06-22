---
name: implement-feature
description: |
  Use this skill when the user asks to implement a feature, fix, or enhancement
  for the hexashift puzzle game, or when working through items in tasks.md.
  Orchestrates: optional exploration → hexashift-feature-developer subagent
  → optional cavecrew-reviewer on the diff.
---

## When to explore first

- **Skip exploration** if the feature clearly touches a known layer (pure UI, pure
  logic) or the user named specific files — pass them directly in the prompt.
- **Spawn one `cavecrew-investigator`** if scope is uncertain or the feature
  crosses multiple layers. Ask it to locate relevant symbols and return file:line
  references. Use that output to enrich the feature-developer prompt.

## Build the feature-developer prompt

Include all of:

- Feature description — exact user wording plus any clarifications
- Files likely affected (from your knowledge or investigator output)
- Expected observable behavior: what Playwright should see / interact with
- The exact tasks.md bullet to remove, if this came from the task list
- Any non-obvious constraints the agent wouldn't derive from CLAUDE.md

## Spawn `feature-developer` agent

Run foreground (not background) so the receipt comes back before proceeding.

## Optional post-step: review

Spawn `cavecrew-reviewer` on `git diff HEAD~1` if:

- The user asked for a review, OR
- The receipt shows changes to game logic files

## Report to user

One short block: relay the receipt and any reviewer findings.
If reviewer found 🔴 bugs, note them and ask user whether to fix before moving on.
