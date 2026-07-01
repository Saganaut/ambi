# Using RedisInsight

RedisInsight is a web-based Redis GUI bundled with the `redis-stack-server` image already in the dev Docker stack. Use it to inspect keys, browse session data, monitor pub/sub, and run raw Redis commands.

## Starting

RedisInsight starts automatically with the rest of the stack:

```bash
./scripts/ambi.sh
```

Or start it on its own:

```bash
docker compose up -d redis
```

Then open **http://localhost:8001**.

## Connecting to the local instance

On first launch RedisInsight may prompt you to add a database. Use these settings:

| Field    | Value       |
| -------- | ----------- |
| Host     | `localhost` |
| Port     | `6379`      |
| Password | `password`  |

## Useful things to inspect

### Session keys

Spring Session stores user sessions under keys prefixed `spring:session:`. Browse or search for them to verify that login/logout is creating and expiring sessions correctly.

### Guest TTL reaper

Guest sessions are stored with a TTL. In RedisInsight, select a guest session key and check the **TTL** field to confirm it is counting down as expected.

### Pub/Sub

Open the **Pub/Sub** tab and subscribe to a channel to watch messages in real time — useful when debugging any future async pipeline work.

## Running raw commands

Use the **CLI** tab (bottom of the UI) to run arbitrary Redis commands, e.g.:

```text
KEYS spring:session:*
TTL spring:session:sessions:<id>
GET <key>
```

## Flushing all data (dev only)

To wipe Redis entirely and start fresh:

```redis
FLUSHALL
```

Run this from the CLI tab. All sessions will be invalidated — you will need to log in again.

## Stopping

RedisInsight stops with the rest of the stack on `Ctrl+C` in `./scripts/ambi.sh`, or explicitly:

```bash
docker compose stop redis
```
