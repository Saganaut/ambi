# Frontend conventions — errors, types, and shared idioms

Small but universal patterns — exactly one sanctioned way to do each.

## API errors are `ProblemDetail` — extract, branch on `code`/`status`

API errors are RFC 9457 `ProblemDetail` (`{ status, title, detail, code, … }`), exposed by RTK Query on `error.data`. Surface them through the shared helpers in `shared/utils/utils.ts` — **don't re-parse the error shape inline**:

- `extractApiError(error)` → `{ statusCode, title, message }` for the full-page `ErrorPage`.
- `extractErrorMessage(error, fallback)` → a user-readable string for inline form/toast errors.

Narrowing lives in `shared/types/typeguards.ts` (`isFetchBaseQueryError`, `isProblemDetail`). Branch on `status` / `code` — **never on `detail`**, which is human-facing and may be reworded. Mirrors the backend [exception rules](../exception-rules.md).

## Type discipline

- **Derive from the generated schema, don't re-declare.** Use indexed access (`SetVisibilityRequest["visibility"]`, `DeckResponse["publishStatus"]`) so a backend change surfaces as a compile error. (Reinforces [generated-artifacts.md](generated-artifacts.md).)
- **Model variants as discriminated unions, narrow with `Extract` + type-guard predicates, not `as`.** `useCurrentUser`'s `CurrentUserState` (discriminated on `state`) and the `isRegistered` / `isGuest` predicates are the pattern; `useSlideEditor` narrows slide content by kind the same way.

## Shared idioms

- **Typed Redux hooks.** Import `useAppDispatch` / `useAppSelector` from `shared/store/hooks.ts` (alias `@store/hooks`) — never the raw react-redux `useDispatch` / `useSelector`.
- **className merging is `[...classes].filter(Boolean).join(" ")`** — there is **no `clsx`/`classnames` dependency**. Conditional classes go in the array (`shape !== "default" && styles[shape]`). See `Btn.tsx`, `DropdownMenu.tsx`.
- **Polymorphic structural components take an `as` prop.** Layout wrappers (`Container`, `Card`) accept `as?: ElementType` (default `"div"`) and spread `HTMLAttributes`. Leaf controls (Btn, Icon) don't.
- **Imperative confirmation is a promise-based hook.** `useConfirm` resolves a promise rather than taking a callback: `const ok = await confirm({...}); if (!ok) return;`. `useRequireLogin` is callback-based instead — `openLoginModal()` pops the modal, `requireLogin(action)` wraps an action; never `await` it. Hence the ban on `window.confirm`/`alert`/`prompt` (see [styling-rules.md](../styling-rules.md) rule 10).
