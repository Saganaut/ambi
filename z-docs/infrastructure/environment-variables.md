# Environment Variables

Local dev secrets live in `dev.env` at the project root (copy from `example.env`;
not committed). The scripts that launch the app source it into the process
environment (`set -a; source dev.env; set +a`), so Spring resolves the values as
ordinary `${...}` placeholders — there is no dotenv loader in the app. A bare
`./mvnw spring-boot:run` therefore sees none of them and falls back to the
defaults baked into `application.properties`.

`example.env` documents most variables inline; the table below covers the
backend ones whose behaviour is not obvious from the file.

| Variable | Notes |
| --- | --- |
| `GOOGLE_*`, `DISCORD_*`, `MICROSOFT_*` `_CLIENT_ID`/`_SECRET` | OAuth client credentials, one pair per provider. |
| `AMBI_JWT_SIGNING_KEY` | HMAC key for access/refresh tokens. Dev falls back to an insecure built-in default — **must** be overridden in production. |
| `AMBI_OPAQUE_IMAGE_SECRET` | HMAC secret behind the [opaque image proxy](../diagrams/media-gallery.md#opaque-image-proxy--urls-that-hide-their-key). Insecure dev default; **≥ 32 characters or the app refuses to start**. |
| `AMBI_PUBLIC_BASE_URL` | Origin opaque image URLs are minted absolute against (default `http://localhost:8080`). Set empty when one origin fronts both API and frontend. |
| `FRONTEND_ORIGIN` | The single allowed CORS origin (default `http://localhost:5173`). |
| `ENV` | Selects the Spring profile — `spring.profiles.active=${ENV:DEV}`. **Not present in `example.env`**, so a fresh copy silently gets the `DEV` fallback; add it explicitly for `PROD`. |
| `MONGO_URI`, `REDIS_HOST` / `_PORT` / `_PASSWORD` | Datastore connections. |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `ambi.s3.*`. Defaults target local Garage: `http://localhost:3900`, region `garage`, bucket `ambi-images`. |
| `S3_KEY_NAME` | **Not a Spring property.** Consumed only by `scripts/init-garage.sh` as the name of the Garage API key it mints (`ambi-key`). |
| `LOGGING_LEVEL_ROOT` | Bound by Spring's relaxed binding to `logging.level.root`. No properties entry exists — env only. |
| `AWS_ENDPOINT_URL`, `AWS_REGION` | Read by the AWS SDK's own env chain; point CloudWatch-bound clients at LocalStack in dev. Leave unset in production. |

Frontend: `VITE_API_BASE_URL` (defaults to `http://localhost:8080`) is the only
one, read in `shared/store/emptyApi.ts`. Only `VITE_`-prefixed vars reach the
browser bundle.

Test-profile values live in
`backend/src/test/resources/application-test.properties` — see
[Testing & CI](testing-and-ci.md).
