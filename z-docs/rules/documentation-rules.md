# Documentation & Comments Rules

Two subjects, one goal — orientation with minimal noise: **the code explains itself; comments explain what code cannot.**

## In-code comments

**Names first, comments last.** Favour descriptive names for files, classes, functions, and variables so the code reads without narration (see [naming-rules.md](naming-rules.md)). A comment earns its place only when it says something the code *cannot* — a non-obvious *why*, a constraint, an invariant, a gotcha, or a deliberate trade-off — and then in the fewest words that carry it. A comment restating the code is noise: delete it and sharpen the name.

## File headers

Every non-exempt source file starts with a doc comment in the language's native syntax — Javadoc `/** … */` on backend, TSDoc `/** … */` on frontend — so IDE tooling picks it up.

1. **Line 1 — responsibility (mandatory).** One sentence naming the file's single responsibility. It **must add information the file/class name does not already convey**.

   ```java
   // ✗ noise — restates the name
   /** UserService — service for users. */

   // ✓ earns its place
   /** Resolves the current member from the Spring Session principal and enforces org-scoped access. */
   ```

2. **Lines 2+ — the non-obvious (only when there is something to say).** A *why*, an invariant, a gotcha, or a genuinely non-obvious structural pattern. Omit entirely when there is nothing non-obvious, so a header that varies in length signals "this one has something to tell you." Only name a **pattern** when it isn't obvious from the code (e.g. `Optimistic locking via @Version`); never write filler like "Patterns: none."

## Exemptions

A file header is **not** required for:

- Barrel / re-export files (`index.ts` that only re-exports).
- Generated artifacts (`*.gen.ts`, `*ValidationConstants.ts`, `*Enums.gen.ts`) — see [frontend/generated-artifacts.md](frontend/generated-artifacts.md).
- Pure config files.
- Test files — the top-level `describe` / test-class name is the header.

**Enforcement:** there is no mechanical header check. Both presence and quality — does it add information, is it brief, is it warranted — are judged in review by the `code-reviewer` agent.

## Writing docs in `z-docs/`

The same discipline applied to prose. Copy the shape of [backend/jackson-full-object-puts.md](backend/jackson-full-object-puts.md) (109 words) and [AGENTS.md](../../AGENTS.md) (492 words).

- **State the decision; link for the detail.** A category file gives each rule one clause plus a link — never a précis of the file it links to.
- **One fact, one home.** Everything else links to it. A fact stated in three places is a fact that will be wrong in two.
- **A rule plus at most one clause of justification.** If the reasoning needs a paragraph, it belongs in the code's own doc comment, not here.
- **Delete superseded rationale.** Rewrite the doc to say what is true now; never layer a "✅ RESOLVED" or "update:" note over a stale passage.
- **Never hand-maintain an inventory of code** in a rules or feature doc. Class lists, field lists, file lists, and per-instance audits rot on the first commit that touches them — point at the package or directory instead. `diagrams/` and `security/` are the exceptions: an ERD, an event catalog, and a findings register *are* inventories, and that is what they are for. They pay for it by being re-verified against the code whenever they are touched.
- **New docs live in `z-docs/<category>/`** and must be linked from that folder's `README.md`. Run [`scripts/check-docs.sh`](../../scripts/check-docs.sh) after any change.
