# Key entry points

The files worth knowing first when navigating the codebase.

| File                                       | Purpose                                                   |
| ------------------------------------------ | --------------------------------------------------------- |
| `frontend/src/features/<feature>/store/<api>Api.gen.ts` | Auto-generated per-feature RTK Query clients (inject into `shared/store/emptyApi.ts`) — **do not edit** |
| `frontend/src/features/<feature>/store/<feature>ValidationConstants.ts` | Auto-generated per-feature validation bounds (+ `shared/store/sharedValidationConstants.ts`) — **do not edit** |
| `backend/.../common/validation/ValidationConstants.java` | Source of truth for validation bounds (drives the above) |
| `frontend/src/routes/__root.tsx`           | Root layout (TanStack Router + shared AuthBar)            |
| `frontend/src/features/auth/hooks/useCurrentUser.ts` | Auth state machine (visitor/guest/registered)   |
| `frontend/openapi-config.cts`              | API codegen config                                        |
| `backend/.../config/SecurityConfig.java`   | Auth, CORS, public routes, OAuth2 success handler         |
| `backend/.../config/SampleDataSeeder.java` | Manual sample-data seeder (`scripts/seed-sample-data.sh`) |
| `compose.yaml`                             | Docker services (MongoDB, Redis, Garage S3)               |
| `dev.env`                                  | Local dev secrets (copy from `example.env`)               |

Feature-specific file maps live in each feature doc — e.g. [deck editor](../features/deck-editor/README.md).
