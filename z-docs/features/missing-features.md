# Missing Features

Running backlog of cross-cutting gaps — things that span features and have no
home in a single feature doc. Anything actionable should become a Trello card;
this list is the holding pen, not the tracker. Feature-specific deferrals live
with their feature (e.g.
[follow-up slides → Deferred](follow-up-slides/README.md#deferred)).

## Open

- **Deck `label` has no editor UI.** `Deck.label` exists on the backend and round-trips, but nothing in the editor reads or writes it.
- **MCQ image mode.** An MCQ should be able to put its images centre-stage rather than treating them as secondary decoration — at present the frontend hardcodes `optionType: "TEXT"` when building option content (`slideContent.ts`), so the image-first layout has no way to be authored.
- **Inline content-image upload.** A slide's content image should be settable from the slide surface itself — a hover affordance on desktop, a placeholder/menu on mobile — instead of only through the inspector.
- **Three unreconciled anonymity flags.** `Settings` carries anonymize-answers, allow-anonymous-responses, and anonymous-mode. Their interaction has never been specified; decide what each means and collapse or document the overlap.
- **Modal sizing.** `Modal` has variants, but they are colour tints, not sizes — there is no `size` prop and no responsive breakpoints. The sm/md/lg + responsive treatment is still to do.
- **"Apply to all" is under-used.** The promote-to-deck pattern exists for point settings, answer settings, background image and background colour ([deck editor](deck-editor/README.md#apply-to-deck)); other per-slide settings could use it.
- **Terminology: player → participant.** The domain model migrated; the remaining identifier debt is `PlayerInfo/`, `SessionPlayerList/`, and `playerCount`, plus scattered copy.

## Future (not to be worked on now)

- Response segmentation
- Response moderation
- Reactions (reconcile with the emoji support that already exists)
