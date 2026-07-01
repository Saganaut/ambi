# Environment Variables

Local dev secrets live in `dev.env` at the project root (copy from `example.env`; not committed). `scripts/ambi.sh` sources `dev.env` into the process environment (`set -a; source dev.env; set +a`) before launching the backend, so Spring resolves them as ordinary `${...}` placeholders — there is no dotenv loader in the app itself. Frontend accesses `VITE_`-prefixed vars.

| Variable                                       | Used By                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`    | Backend (OAuth)                                |
| `MONGO_URI`                                    | Backend                                        |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Backend                                        |
| `VITE_API_BASE_URL`                            | Frontend (defaults to `http://localhost:8080`) |

Test-profile values live in `backend/src/test/resources/application-test.properties` with test-safe defaults — see [Testing & CI](testing-and-ci.md).
