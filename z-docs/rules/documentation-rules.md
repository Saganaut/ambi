# Documentation & Comments Rules

How we document code in-place. The goal is orientation with minimal noise: **the code explains itself; comments explain what code cannot.**

## Guiding principle — names first, comments last

1. **Self-explanatory code beats comments.** Favour descriptive names for files, classes, functions, and variables so the code reads without narration. A comment that restates the code is noise — delete it and improve the name instead. See [naming-rules.md](naming-rules.md).
2. **Comment only when necessary.** A comment earns its place only when it says something the code *cannot*: the non-obvious *why*, a constraint, an invariant, a gotcha, or a deliberate trade-off. Never comment *what* the code plainly does.
3. **Be brief.** When a comment is warranted, keep it to the fewest words that carry the meaning. Prefer one sharp line over a paragraph.

## File headers

Every non-exempt source file starts with a doc comment in the language's native syntax — Javadoc `/** … */` on backend, TSDoc `/** … */` on frontend — so IDE tooling picks it up.

1. **Line 1 — responsibility (mandatory).** One sentence naming the file's single responsibility. It **must add information the file/class name does not already convey.** If the sentence just restates the name, it is failing — sharpen it or the name.

   ```java
   // ✗ noise — restates the name
   /** UserService — service for users. */

   // ✓ earns its place
   /** Resolves the current member from the Spring Session principal and enforces org-scoped access. */
   ```

2. **Lines 2+ — the non-obvious (only when there is something to say).** Present *only* when the file carries something a reader would otherwise get wrong: a *why*, an invariant, a gotcha, or a genuinely non-obvious structural pattern. Omit entirely when there is nothing non-obvious — a header that varies in length signals "this one has something to tell you."

   ```typescript
   /**
    * Renders a slide for a live-session participant (host-only controls stripped).
    *
    * Kept separate from SlideView because participant vs. host visibility diverges;
    * optionIds is a Set today, becomes ordered on the multi-select change.
    */
   ```

   Only label a **pattern** here when it is non-obvious from the code (e.g. `Optimistic locking via @Version`). Do not label ordinary code with pattern names, and never write filler like "Patterns: none."

## Exemptions

A file header is **not** required for:

- Barrel / re-export files (`index.ts` that only re-exports).
- Generated artifacts (`*.gen.ts`, `*ValidationConstants.ts`, `*Enums.gen.ts`) — never hand-edited; see [frontend/generated-artifacts.md](frontend/generated-artifacts.md).
- Pure config files.
- Test files — the top-level `describe` / test-class name is the header.

## Enforcement

- **Presence** of a header on non-exempt source files is a mechanical check (and a code-review dimension).
- **Quality** of the content — does it add information, is it brief, is it warranted — is judged in review by the `code-reviewer` agent.
