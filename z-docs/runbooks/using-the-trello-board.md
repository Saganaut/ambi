# Using the Trello board

Work on Ambi is tracked on the **Ambi Dev** Trello board:
<https://trello.com/b/nH50o6jt/ambi-dev>

Agents interact with the board through the **Trello REST API over `curl`** (no MCP server). This
runbook covers the one-time credential setup, the board's structure, and the common operations.

> **Secrets never enter the repo.** Credentials live only in a local file outside the repo
> (`~/.config/ambi/trello.env`). Never paste the key or token into a commit, a doc, or a chat reply.

---

## 1. Credentials (one-time setup)

Credentials are read from `~/.config/ambi/trello.env` (outside the git repo — it cannot be committed):

```bash
# ~/.config/ambi/trello.env
export TRELLO_KEY="<32-char API key>"
export TRELLO_TOKEN="<ATTA… token>"
```

To obtain them:

1. **API key** — <https://trello.com/power-ups/admin> → your Power-Up → **API Key** tab → copy the
   value under **API Key** (not **Secret**).
2. **Token** — visit the authorize URL below with your key substituted, click **Allow**, and copy the
   `ATTA…` token it returns:

   ```text
   https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=<KEY>&name=Ambi
   ```

Lock the file down: `chmod 600 ~/.config/ambi/trello.env`.

**Gotchas learned the hard way:**

- The **Secret** is *not* a token — it is only used in OAuth signing flows. Using it as the token
  yields `invalid key`/`invalid token`.
- `invalid key` means the `key` value itself is unrecognized — re-copy the **API Key**, don't touch
  origins.
- The board's **Allowed Origins** (CORS) setting is irrelevant here: it only governs browser/JS calls
  that send an `Origin` header. Server-side `curl` bypasses it entirely.

Verify the setup:

```bash
source ~/.config/ambi/trello.env
curl -s "https://api.trello.com/1/members/me?key=$TRELLO_KEY&token=$TRELLO_TOKEN&fields=username" | jq
```

---

## 2. Board structure

**Lists (status columns):** Backlog → To Do → In Progress → Done.

**Labels (priority):** 🔴 P0 Blocking · 🟠 P1 Migration · 🟡 P2 Security · 🔵 P3 Housekeeping.

**Workflow:** new work lands in **Backlog** with a priority label; pull a card into **To Do** when it's
queued, **In Progress** when you start, **Done** when it's committed *and* reviewed (per the
[feature workflow](../../AGENTS.md#feature-workflow)).

Fetch the current IDs rather than hardcoding them (they're stable but cheap to re-fetch):

```bash
source ~/.config/ambi/trello.env
BOARD=6a5e0f0e4a25faa1d4ef1e3d   # short link: nH50o6jt
curl -s "https://api.trello.com/1/boards/$BOARD/lists?fields=id,name&key=$TRELLO_KEY&token=$TRELLO_TOKEN" | jq
curl -s "https://api.trello.com/1/boards/$BOARD/labels?fields=id,name,color&key=$TRELLO_KEY&token=$TRELLO_TOKEN" | jq
```

---

## 3. Common operations

All commands assume `source ~/.config/ambi/trello.env` has been run. `jq` is available for parsing.
Use `--data-urlencode` for any `name`/`desc` text so special characters survive.

**List cards in a list:**

```bash
curl -s "https://api.trello.com/1/lists/<LIST_ID>/cards?fields=name,idLabels&key=$TRELLO_KEY&token=$TRELLO_TOKEN" | jq
```

**Create a card** (in a list, with a priority label):

```bash
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "idList=<LIST_ID>" -d "idLabels=<LABEL_ID>" -d "pos=bottom" \
  --data-urlencode "name=<title>" --data-urlencode "desc=<body with file refs>" \
  -d "key=$TRELLO_KEY" -d "token=$TRELLO_TOKEN" | jq -r .url
```

**Move a card** to another list (e.g. Backlog → In Progress):

```bash
curl -s -X PUT "https://api.trello.com/1/cards/<CARD_ID>?idList=<LIST_ID>&key=$TRELLO_KEY&token=$TRELLO_TOKEN" | jq -r .name
```

**Add a comment** to a card:

```bash
curl -s -X POST "https://api.trello.com/1/cards/<CARD_ID>/actions/comments" \
  --data-urlencode "text=<comment>" -d "key=$TRELLO_KEY" -d "token=$TRELLO_TOKEN"
```

**Archive (close) a card:**

```bash
curl -s -X PUT "https://api.trello.com/1/cards/<CARD_ID>?closed=true&key=$TRELLO_KEY&token=$TRELLO_TOKEN"
```

---

## Conventions for agents

- **Every task must have a card — no exceptions.** If the user hands you a card (or a link/ID to
  one), use it. If they don't, **create one yourself** before starting work: pick the right list
  (Backlog if it's not being worked yet, To Do/In Progress if you're starting immediately) and a
  priority label, and write a `desc` that states the task's goals — what's being done and why —
  not just a title. Never do unticketed work.
- **Card descriptions carry the pointer**, not the whole task: a one-line problem statement plus the
  `file:line` references, so the next agent can jump straight to the code.
- **Keep the board and the work in sync**: move a card to **In Progress** when you pick it up and to
  **Done** only after the commit + review loop passes.
- **Record the outcome before moving a card to Done.** Every completed card gets an outcome comment
  (see §3, *Add a comment*) capturing: a summary of what was done, the commit SHA(s) it landed in,
  and any residual risk or follow-up cards spun off. This keeps the board self-documenting — the next
  agent reads *what actually happened*, not just that the card closed.
- **Don't reconstruct IDs from memory across sessions** — re-fetch lists/labels (§2). The board is the
  source of truth; the private agent-memory note is only a convenience cache.
