# Embedded sub-documents get their own write API

**Rule:** When a document embeds an independently-editable sub-object (a slide inside a deck, the deck's `settings.{point,answer,audience}` sub-documents), give that sub-object its **own dedicated endpoint** and persist it with a **targeted update** — never mutate it through the parent aggregate's general update.

## Why

The parent is one MongoDB document under one `@Version`. A whole-aggregate `repository.save(parent)` to change a leaf sub-object rewrites the entire document and bumps that single version, so two unrelated edits (a slide tweak and a deck rename, or two pacing toggles) read the same version and the second fails with `OptimisticLockingFailureException` (`500`). It also lets unrelated edits clobber each other.

## How

Load the parent for the **authorization check** and to build the response, mutate the sub-object **in memory** (so the response reflects it), then persist with a positional / sub-path `MongoTemplate.updateFirst` (`$set` the whole sub-document, or `$unset` to clear) that leaves the parent `@Version` untouched. Keep these in a `*RepositoryCustom` fragment. Worked examples: `DeckRepositoryImpl.updateSlideSettings` (positional `slides.$[s].settings`) and `updateDeck{Point,Answer,Audience}Settings` (`settings.<sub>`), driven by `DeckService.applySlideSettings` / `setDeck*Settings` and the `PUT .../point-settings|answer-settings|audience-settings` endpoints.

## Consequences

- **Drop the sub-object from the parent's general update DTO** so it has exactly one writer (`UpdateDeckRequest` carries no `settings`).
- **A targeted update is last-writer-wins** on the touched sub-document — not version-guarded against a concurrent whole-aggregate save. Acceptable for settings; a sub-object needing real concurrency control gets its own version field, not the parent's.
- **The rule holds without `@Version` too.** On a non-versioned document, a whole-document `save()` silently drops a concurrent edit instead of throwing — quieter, still data loss. Persist each element of an independently-editable embedded collection with a targeted `$push` / positional `$set`. Worked example: `CommentThreadRepositoryImpl` (`comments.$[c]`).
- **A wholesale-replaced value object is fine to `save()`** (`User.preferences`, `Theme.spec`): single writer, no siblings to clobber.
