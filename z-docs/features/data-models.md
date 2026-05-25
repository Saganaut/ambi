# Data Models

The MongoDB documents and their associated DTOs / image-processing tiers. Sealed `DeckElement` / `AnswerPayload` hierarchies for decks and runtime answers live in [features/games](games/README.md); this file covers user/org/theme + image processing.

## User (collection: `users`)

```
id               String   (ObjectId)
email            String   (unique index)
name             String
userName         String
isGuest          Boolean
googleId         String
pictureUrl       String
organizationIds  List<String> (orgs this user belongs to; empty = personal-only)
activeThemeId    String   (nullable — ID of the user's active custom theme)
stats            PlayerStats (embedded)
lastLogin        LocalDateTime
createdAt        LocalDateTime
```

Compound index on `stats.totalPoints DESC` for leaderboard sorting.

### PlayerStats (embedded)

```
gamesPlayed     int
highScore       int
totalPoints     int
currentStreak   int
```

## Organization (collection: `organizations`)

```
id          String   (ObjectId)
name        String
ownerId     String   (userId of creator)
createdAt   LocalDateTime
```

Users may belong to multiple organizations simultaneously. `User.organizationIds` is the list of memberships; joining/leaving an org adds/removes an id from that list. A theme's or deck's `organizationId` is still a single string — content is scoped to one org at a time. Theme create/update rejects an `organizationId` that isn't in the caller's `organizationIds`.

See [Membership feature](membership/README.md) for tier/role mapping that turns a `User` into a Spring authority set.

## Theme (collection: `themes`)

```
id                  String   (ObjectId)
name                String
ownerId             String   (userId)
organizationId      String   (nullable — if set, all org members can view it)
huePrimary          int      (0–360, oklch hue for the primary palette)
hueAccent           int      (0–360, oklch hue for the accent palette)
mode                String   ("light" | "dark" | "system")
backgroundImageUrl  String   (nullable, S3 presigned URL)
logoImageUrl        String   (nullable, S3 presigned URL)
createdAt           LocalDateTime
```

## DTOs

- `UserDTO` — sealed interface in `backend/.../dto/UserDTO.java`
  - `UserDTO.GuestUser` — id, userName, isGuest, pictureUrl, stats (safe for leaderboard)
  - `UserDTO.RegisteredUser` — all fields including email, googleId, organizationIds, activeThemeId, timestamps (authenticated only)

## Image Processing Tiers

Images are validated by byte-header MIME detection (not Content-Type), resized with Scrimage, and stored as WebP in S3.

| Tier       | Endpoint                           | Max size | Max dimension         | Allowed types        |
| ---------- | ---------------------------------- | -------- | --------------------- | -------------------- |
| Avatar     | `POST /api/users/me/profile-image` | 1 MB     | 500×500 px            | JPEG, PNG, WebP, GIF |
| Logo       | `POST /api/themes/{id}/logo`       | 2 MB     | 400×400 px            | JPEG, PNG, WebP, GIF |
| Background | `POST /api/themes/{id}/background` | 5 MB     | 2000px (longest side) | JPEG, PNG, WebP      |

S3 keys follow deterministic patterns so re-uploading overwrites the same object:

- `profile-images/{userId}/avatar.webp`
- `theme-logos/{themeId}/logo.webp`
- `theme-backgrounds/{themeId}/bg.webp`
