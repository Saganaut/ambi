# Using Mongo Express

Mongo Express is a web-based MongoDB admin UI included in the dev Docker stack. Use it to browse collections, inspect documents, run queries, and manually verify seed data without needing a separate GUI client.

## Starting

Mongo Express starts automatically with the rest of the stack:

```bash
./scripts/ambi.sh
```

Or start it on its own:

```bash
docker compose up -d mongo-express
```

Then open **http://localhost:8081**.

> MongoDB must be running before Mongo Express starts. `depends_on` in `compose.yaml` enforces this when using `docker compose up -d`.

## Browsing data

1. Open http://localhost:8081.
2. Click the **ambi** database in the left panel.
3. Select a collection (e.g. `decks`, `slides`, `users`) to browse documents.

## Seeding and verifying data

After running the sample-data seeder (`scripts/seed-sample-data.sh`), confirm the data landed:

1. Open the `decks` or `slides` collection.
2. Check that documents exist with the expected `createdBy` field matching your logged-in user ID.

The seeder is idempotent — re-running it will not create duplicates.

## Dropping a collection (dev only)

1. Click the collection name in the left panel.
2. Click **Delete Collection** in the top-right toolbar.
3. Confirm the prompt.

Use this to reset seed data so you can re-run the seeder from a clean state.

## Stopping

Mongo Express stops with the rest of the stack on `Ctrl+C` in `./scripts/ambi.sh`, or explicitly:

```bash
docker compose stop mongo-express
```
