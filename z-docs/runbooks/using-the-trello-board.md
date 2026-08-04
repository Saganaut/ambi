# Using the Trello board

Work on Ambi is tracked on the **Ambi Dev** board: <https://trello.com/b/nH50o6jt/ambi-dev>.
Agents drive it through the **Trello REST API over `curl`** (no MCP server).

## 1. Credentials

Read from `~/.config/ambi/trello.env` (outside the repo — it cannot be committed; `chmod 600`):

```bash
export TRELLO_KEY="<32-char API key>"     # trello.com/power-ups/admin → your Power-Up → API Key
export TRELLO_TOKEN="<ATTA… token>"       # from the authorize URL below, with your key substituted
# https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=<KEY>&name=Ambi
```

The Power-Up **Secret** is not a token (it is for OAuth signing only) — using it yields
`invalid key`/`invalid token`. Allowed Origins (CORS) is irrelevant to server-side `curl`.

**Never paste the key or token into a commit, a doc, or a chat reply.** Verify:

```bash
source ~/.config/ambi/trello.env
curl -s "https://api.trello.com/1/members/me?key=$TRELLO_KEY&token=$TRELLO_TOKEN&fields=username" | jq
```

## 2. Board structure

**Lists:** Backlog → To Do → In Progress → Done. **Labels (priority):** 🔴 P0 Blocking · 🟠 P1
Migration · 🟡 P2 Security · 🔵 P3 Housekeeping.

New work lands in **Backlog** with a priority label; pull it to **To Do** when queued, **In
Progress** when you start, **Done** when it's committed *and* reviewed (per the
[feature workflow](../../AGENTS.md#feature-workflow)).

Board id `6a5e0f0e4a25faa1d4ef1e3d` (short link `nH50o6jt`). Re-fetch list/label ids rather than
reconstructing them from memory:

```bash
curl -s "https://api.trello.com/1/boards/$BOARD/lists?fields=id,name&key=$TRELLO_KEY&token=$TRELLO_TOKEN" | jq
curl -s "https://api.trello.com/1/boards/$BOARD/labels?fields=id,name,color&key=$TRELLO_KEY&token=$TRELLO_TOKEN" | jq
```

## 3. Common operations

All commands assume `source ~/.config/ambi/trello.env`. Use `--data-urlencode` for any
`name`/`desc` text so special characters survive.

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

**Move a card** to another list:

```bash
curl -s -X PUT "https://api.trello.com/1/cards/<CARD_ID>?idList=<LIST_ID>&key=$TRELLO_KEY&token=$TRELLO_TOKEN" | jq -r .name
```

**Add a comment:**

```bash
curl -s -X POST "https://api.trello.com/1/cards/<CARD_ID>/actions/comments" \
  --data-urlencode "text=<comment>" -d "key=$TRELLO_KEY" -d "token=$TRELLO_TOKEN"
```

**Archive (close) a card:**

```bash
curl -s -X PUT "https://api.trello.com/1/cards/<CARD_ID>?closed=true&key=$TRELLO_KEY&token=$TRELLO_TOKEN"
```

## 4. Conventions

- **Card descriptions carry the pointer**, not the whole task: a one-line problem statement plus
  `file:line` references so the next agent jumps straight to the code.
- **Record the outcome before moving a card to Done** — an outcome comment with what was done, the
  commit SHA(s), and any residual risk or spun-off cards. This keeps the board self-documenting.
