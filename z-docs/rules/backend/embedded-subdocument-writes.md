# Embedded sub-documents get their own write API

**Rule:** When a document embeds an independently-editable sub-object (a slide inside a deck, the deck's `settings.{point,answer,audience}` sub-documents), give that sub-object its **own dedicated endpoint** and persist it with a **targeted update** — never mutate it through the parent aggregate's general update.

## Why

The parent is one MongoDB document under one `@Version`. A whole-aggregate `repository.save(parent)` to change a leaf sub-object rewrites the entire document and bumps that single version, so two unrelated edits (a slide tweak and a deck rename, or two pacing toggles) read the same version and the second fails with `OptimisticLockingFailureException` (`500`). It also lets unrelated edits clobber each other.

## How

Load the parent for the **authorization check** and to build the response, mutate the sub-object **in memory** (so the response reflects it), then persist with a positional / sub-path `MongoTemplate.updateFirst` (`$set` the whole sub-document, or `$unset` to clear) that leaves the parent `@Version` untouched. Keep these in a `*RepositoryCustom` fragment. Worked examples: `DeckRepositoryImpl.updateSlideSettings` (positional `slides.$[s].settings`) and `updateDeck{Point,Answer,Audience}Settings` (`settings.<sub>`), driven by `DeckService.applySlideSettings` / `setDeck*Settings` and the `PUT .../point-settings|answer-settings|audience-settings` endpoints.

## Trade-off

A targeted update is not version-guarded against a concurrent whole-aggregate save, so it is last-writer-wins on the touched sub-document (no `500`, but no merge). Acceptable for settings; if a sub-object ever needs real concurrency control, give it its own version field rather than reusing the parent's.

## Consequence

Drop the sub-object from the parent's general update DTO so it has exactly one writer (e.g. `UpdateDeckRequest` carries no `settings`) — the same single-owner split already applied to deck tags and cover/background images.

## Also applies without `@Version`

`Deck` is the only document that carries a `@Version`, so it's the only one that can throw the `500`. But the rule still holds for an independently-editable embedded **collection** on a non-versioned document (one that extends `BaseDocument` with no version): a whole-document `save()` there is *last-writer-wins* and silently drops a concurrent edit — quieter than a `500`, but still data loss. Persist each element with a targeted `$push` / positional `$set` instead. Worked example: `CommentThreadRepositoryImpl` (`comments.$[c]`), driven by `CommentThreadService.addComment` / `editComment` / `deleteComment`.

(A small value object that is wholesale-replaced — `User.preferences`, `Theme.spec` — is fine to `save()`: it has a single writer and no siblings to clobber.)
