# Environment Variables

Local dev secrets live in `dev.env` at the project root (copy from `example.env`; not committed). `scripts/ambi.sh` sources `dev.env` into the process environment (`set -a; source dev.env; set +a`) before launching the backend, so Spring resolves them as ordinary `${...}` placeholders — there is no dotenv loader in the app itself. Frontend accesses `VITE_`-prefixed vars.

## Auth

| Variable                                       | Used By                                        |
| ----------------------------------------------- | ---------------------------------------------- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`     | Backend (OAuth) — `spring.security.oauth2.client.registration.google.*` |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`   | Backend (OAuth) — `spring.security.oauth2.client.registration.discord.*` |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Backend (OAuth) — `spring.security.oauth2.client.registration.microsoft.*` |
| `AMBI_JWT_SIGNING_KEY`                          | Backend — `ambi.auth.token.signing-key` (HMAC signing key for access/refresh tokens; dev falls back to an insecure built-in default, **must** be overridden in production) |
| `FRONTEND_ORIGIN`                               | Backend — `ambi.auth.cors.frontend-origin` (default `http://localhost:5173`) |
| `ENV`                                           | Backend — `spring.profiles.active=${ENV:DEV}` (selects the active Spring profile, e.g. `DEV`/`PROD`/`test`) |

## Data stores

| Variable                                       | Used By                                        |
| ----------------------------------------------- | ----------------------------------------------- |
| `MONGO_URI`                                     | Backend                                         |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`  | Backend                                         |

## Storage (S3 / Garage)

| Variable        | Used By                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| `S3_ENDPOINT`    | Backend — `ambi.s3.endpoint` (default `http://localhost:3900`)          |
| `S3_REGION`      | Backend — `ambi.s3.region` (default `garage`)                            |
| `S3_BUCKET`      | Backend — `ambi.s3.bucket` (default `ambi-images`)                       |
| `S3_ACCESS_KEY`  | Backend — `ambi.s3.access-key`                                           |
| `S3_SECRET_KEY`  | Backend — `ambi.s3.secret-key`                                           |
| `S3_KEY_NAME`    | Not a Spring property — consumed only by `scripts/init-garage.sh`, which uses it as the name of the Garage API key it mints (defaults to `ambi-key` in `example.env`) |

## Observability / AWS SDK

| Variable              | Used By                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `LOGGING_LEVEL_ROOT`   | Backend — Spring Boot relaxed binding to `logging.level.root` (no explicit properties entry; set via env only) |
| `AWS_ENDPOINT_URL`     | Backend — read by the AWS SDK's standard env chain to point CloudWatch-bound clients at LocalStack in dev (unset in production so the SDK uses real AWS endpoints) |
| `AWS_REGION`           | Backend — read by the AWS SDK's standard env chain                                          |

## Frontend

| Variable                                       | Used By                                        |
| ----------------------------------------------- | ----------------------------------------------- |
| `VITE_API_BASE_URL`                            | Frontend (defaults to `http://localhost:8080`) |

Test-profile values live in `backend/src/test/resources/application-test.properties` with test-safe defaults — see [Testing & CI](testing-and-ci.md).
