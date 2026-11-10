# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/app-foundation/app-shell-routing-api-client-and-shared-ui/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** App foundation
- **Feature slug (folder under `plans/`):** `app-foundation`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Assignee:** ``
- **Labels:** `frontend`, `setup`, `routing`, `api-client`, `ui`

---

## Title

```text
App shell, routing, API client and shared UI building blocks
```

---

## Description

```text
Story 01 leaves an empty feature-based structure. Before any page can be built,
the app needs the pieces every page shares. This story adds them once so the
feature stories (authentication, users, companies, countries, vehicles,
drivers, inspection checklist, trips) only add their own code.

Backend facts (backend/contracts/README.md):
- Every route is under /api; CORS is off, so the Vite dev server proxies /api
  to http://localhost:3000.
- Errors: { statusCode, error, message: string | string[], path, timestamp }.
  message is an array for validation errors ("<field> must ..."), a string
  otherwise.
- Paginated lists take page / limit (1–100) / search and return
  { data, meta: { page, limit, total, totalPages } }.

Add:
- Libraries: react-router (routing), @tanstack/react-query (server state),
  react-hook-form + zod + @hookform/resolvers (forms and validation).
- Vite proxy for /api; API base url config.
- One HTTP client (fetch wrapper): JSON and multipart bodies, query params,
  Bearer token hook (filled by the authentication story), ApiError with a
  messages[] list, a hook for "session is gone" 401s, blob download for files.
- Shared API types: Paginated<T>, PaginationMeta, ListQuery, ApiErrorBody.
- QueryClient with sensible defaults (no retry on 4xx).
- Router with an app layout (sidebar navigation + header + content), a home
  page, a not-found page and a route error page.
- Shared UI: Field (label + control + error), ErrorAlert, LoadingState,
  EmptyState, Pagination, SearchInput (debounced), ConfirmDialog (native
  <dialog>), PageHeader.
- Shared hook useListParams: page / search / filters kept in the URL.
- Shared utils: applyServerErrors (API validation messages -> form fields),
  date/time formatting.
- Design tokens and global CSS classes (buttons, inputs, tables, cards,
  badges, alerts, form grid), light and dark.
```

---

## Acceptance criteria

```text
- [ ] npm run dev serves the app shell on http://localhost:5173: sidebar with
      the app name, header, home page.
- [ ] /anything-unknown shows the not-found page inside the layout.
- [ ] A request to /api/health from the browser (dev) goes through the proxy.
- [ ] apiRequest throws ApiError with status and messages[] for both array and
      string messages; network failure -> status 0.
- [ ] Shared components and hooks exist and are typed; no `any`.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 01 (project structure) implemented.
- **Depends on code areas:** `src/app/`, `src/shared/`, `src/config/`, `vite.config.ts`.

## Extra notes (optional)

- UI language: English. Data with Arabic and English names shows both. RTL and i18n are out of scope.
- No component library: plain CSS (global classes + CSS Modules for component-specific styles), as Story 01 decided.
- Navigation items and routes are added by each feature story, not here.

## Out of scope

- Login, tokens, protected routes (Story 03).
- Any feature page.
- Toast notifications, i18n / RTL, tests, CI.
