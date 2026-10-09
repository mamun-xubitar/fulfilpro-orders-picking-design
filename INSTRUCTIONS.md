# INSTRUCTIONS.md

Behavioral guidelines to reduce common LLM coding mistakes. They bias toward caution over speed;
for trivial tasks, use judgment.

## 1. Think before coding

*Don't assume. Don't hide confusion. Surface tradeoffs.*

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them; don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity first

*Minimum code that solves the problem. Nothing speculative.*

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical changes

*Touch only what you must. Clean up only your own mess.*

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it; don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4. Goal-driven execution

*Define success criteria. Loop until verified.*

Turn tasks into verifiable goals. This repo has no test framework, so a "test" here means any
repeatable check: `npx tsc --noEmit`, `npm run lint`, a reproducible request or script, or a
manual smoke step you can describe and re-run.
- "Add validation" → "Write checks for invalid inputs, then make them pass"
- "Fix the bug" → "Write a check that reproduces it, then make it pass"
- "Refactor X" → "Ensure the checks pass before and after"

For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant
clarification. Always finish with `npx tsc --noEmit` and `npm run lint` passing with no new errors.

*These guidelines are working if:* diffs contain fewer unnecessary changes, there are fewer rewrites
due to overcomplication, and clarifying questions come before implementation rather than after
mistakes.
