# Using Mongo Express

A web MongoDB admin UI in the dev Docker stack, at **<http://localhost:8081>** — browse
collections, inspect documents, drop a collection for a clean re-seed. No auth
(`ME_CONFIG_BASICAUTH=false`).

Starts with the rest of the stack (`./scripts/ambi.sh`), or on its own:

```bash
docker compose up -d mongo-express
docker compose stop mongo-express
```

> `depends_on: mongodb` in `compose.yaml` guarantees Mongo is up first. `restart: unless-stopped`
> means the container comes back after a daemon restart, but a container you stopped stays stopped.

Most useful after seeding: open the `ambi` database's `decks` / `slides` collections and check the
`createdBy` field matches your user id. Dropping a collection from the left panel (**Delete
Collection**) is the way to reset before re-running `scripts/seed-sample-data.sh`.
