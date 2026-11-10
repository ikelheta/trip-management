# Source structure

All application code lives here. Code is grouped **by business feature first**. Only code that several features really use lives outside a feature.

## Folders

| Folder | What goes here | What does not go here |
| ------ | -------------- | --------------------- |
| `app/` | The app shell: `App.tsx`, app-wide providers (`app/providers/`) and route definitions (`app/routes/`). | Feature UI or business logic. |
| `features/` | One folder per business feature, e.g. `authentication`, `users`, `trips`. | Code used by two or more features. |
| `shared/components/ui/` | Small, generic UI building blocks (button, input, modal). | Components that know about one feature. |
| `shared/components/layout/` | Page layout pieces (header, sidebar, page container). | Feature-specific screens. |
| `shared/i18n/` | Language store, dictionary helpers (`defineMessages`, `useMessages`, `plural`, `localizedName`, `isolate` / `ltr`), `commonMessages`, API message translation. See [Language](#language). | A feature's own texts. Those go in the feature's `i18n.ts`. |
| `shared/hooks/` | Hooks used by two or more features. | Hooks used by one feature. |
| `shared/services/` | Shared API setup: HTTP client, central error handling. | API calls for one feature. Those go in the feature's `services/`. |
| `shared/types/` | Types used by two or more features. | Types used by one feature. |
| `shared/utils/` | Pure helper functions used by two or more features. | Helpers used by one feature. |
| `shared/styles/` | Global CSS. `index.css` is imported once, in `main.tsx`. | Styles for one component. Keep those next to the component. |
| `assets/` | Images, icons and fonts imported from code. | Files that need a fixed URL. Those go in `/public`. |
| `config/` | App configuration, e.g. reading `import.meta.env` values. | Secrets. |
| `main.tsx` | Entry point: loads global CSS and mounts `App`. | Anything else. |

## Features

Each feature uses this layout. Create only the folders the feature needs.

```
features/trips/
├── components/   UI components used only by this feature
├── hooks/        reusable logic for this feature
├── services/     API calls for this feature
├── types/        types for this feature, including API request/response types
├── utils/        (optional) helper functions for this feature
├── pages/        page components that routes render
├── i18n.ts       English / Arabic texts of this feature (see Language)
└── index.ts      public API of the feature
```

Rules:

- A feature exports what others may use from its `index.ts`. Code outside the feature imports **only** from that file, e.g. `import { TripsPage } from '../features/trips/index.ts'`, never from files inside the feature.
- Move code to `shared/` only when **two or more** features really use it. Until then it stays in its feature.
- API calls live in `services/`, never inside components.

## Naming

| What | Convention | Example |
| ---- | ---------- | ------- |
| Component files and components | PascalCase | `TripCard.tsx` |
| Hook files and hooks | camelCase with `use` prefix | `useTrips.ts` |
| All other files | camelCase | `tripService.ts`, `formatDate.ts` |
| Types and interfaces | PascalCase | `Trip`, `CreateTripRequest` |
| Functions | camelCase, start with a verb | `fetchTrips`, `formatDate` |
| Constants | UPPER_SNAKE_CASE | `MAX_TRAVELLERS` |
| Folders | kebab-case | `trip-details/` |

## Coding rules (short form)

- **Keep it simple.** No DDD, no Clean Architecture, no pattern without a real need. No abstraction that is used only once. Don't create a file for every small function.
- **No new dependency** without a clear reason.
- **Components:** one clear job, small, props explicitly typed. Prefer composition over many conditional props. Keep business logic out of components.
- **State:** keep it close to where it is used. Avoid global state unless it is needed. Keep server data (from the API) separate from UI state.
- **Hooks:** don't use `useEffect` for anything you can do while rendering or in an event handler. Use `useMemo`/`useCallback` only when they give a measurable benefit. Use stable, meaningful `key`s in lists.
- **TypeScript:** `strict` is on. Never use `any`. Define types once. Give reusable functions an explicit return type.
- **Code quality:** early returns over deep nesting, small functions, no magic numbers or strings, no unused code. Comments explain *why*, not *what*.
- **Styling:** plain CSS. Reuse styles, avoid inline styles unless there is a reason.

## Shared building blocks

Use these instead of writing your own.

| What | Where |
| ---- | ----- |
| HTTP client: `apiRequest<T>(path, options)` (JSON, `undefined` for 204), `apiBlob(path)` (file downloads), `ApiError` (`status`, `messages`; status 0 = network failure), `toApiPath(url)` (API file url → client path), `configureHttpClient` (token hooks, authentication story) | `shared/services/httpClient.ts` |
| `fetchAllPages(fetchPage)` — every row of a paginated list, for dropdowns (`MAX_PAGE_SIZE` = 100) | `shared/services/fetchAllPages.ts` |
| API types: `Paginated<T>`, `PaginationMeta`, `ListQuery`, `ApiErrorBody` | `shared/types/api.ts` |
| `User`, `UserRole`, `PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH` (8–72) | `shared/types/user.ts` |
| UI components: `Field`, `FormError`, `ErrorAlert`, `LoadingState`, `EmptyState`, `Pagination`, `SearchInput`, `ConfirmDialog`, `Dialog`, `Icon` (decorative outline icons; add a shape to `ICON_SHAPES` for a new one) | `shared/components/ui/` |
| `PageHeader` (title, description, actions) | `shared/components/layout/` |
| `useListParams()` — page, search and filters in the URL | `shared/hooks/useListParams.ts` |
| `applyServerErrors(error, setError, fields)` — API messages onto form fields / `root.server` | `shared/utils/formErrors.ts` |
| `formatDateTime(iso, locale)`, `formatTimestampDate(iso, locale)` (date part only), `formatDate(date, locale)` (locale from `useLanguage()`), `formatTime` | `shared/utils/formatDate.ts` |
| Language: `useLanguage()` (`language`, `locale`, `dir`, `setLanguage`), `useMessages(dict)`, `defineMessages({ en, ar })`, `commonMessages`, `plural(locale, count, forms)`, `localizedName` / `bilingualLabel` / `secondaryName`, `isolate` / `ltr` (bidi marks for data inside `ar` sentences), `translateApiMessage` | `shared/i18n/` |
| `LanguageSwitcher` (top bar and sign-in page) | `shared/components/ui/LanguageSwitcher.tsx` |
| `API_BASE_URL` (`VITE_API_BASE_URL`, default `/api`), `ROUTES` | `config/env.ts`, `config/routes.ts` |
| Protected files (images, QR codes): show with `AuthImage`, save with `downloadFile`, upload with `ImageUploadField` / `uploadFile`; `useFileObjectUrl(url)` for a custom view. File urls need the token, so **never** `<img src={fileUrl}>` or `<a href={fileUrl}>` | `features/files/index.ts` |

**Authentication:** `useAuth()` from `features/authentication/index.ts` gives `user`, `status` and `logout`. Every route except `/login` sits under `RequireAuth` in `router.tsx`. After editing the signed-in user, invalidate `CURRENT_USER_KEY` (also exported there). The signed-in user's details live on the "My account" page (`ROUTES.account`); the top bar only shows `AccountLink` (initials + first name) and the sidebar `SignOutButton`.

Global CSS classes (`shared/styles/index.css`, design tokens as `--color-*` (incl. `--color-surface-muted`, `--color-border-strong`, `--color-link` for text links and focus), `--space-*`, `--radius` / `--radius-lg`, `--shadow-sm` / `--shadow-lg`, `--focus-ring`, `--transition`): `icon`, `icon-mirror` (flips arrows in right-to-left), `btn`, `btn-primary`, `btn-secondary`, `btn-danger`, `btn-small`, `input`, `field`, `field-hint`, `field-error`, `checkbox`, `form`, `form-grid`, `form-actions`, `card`, `stack`, `toolbar`, `search-input`, `page-header`, `table-wrap`, `table`, `table-actions`, `pagination`, `badge`, `badge-success`, `badge-danger`, `alert`, `alert-error`, `alert-info`, `alert-success`, `empty-state`, `details`, `dialog`, `muted`, `page-center`, `ltr` (left-to-right island for plates, IDs and codes inside Arabic text).

### Patterns

- **Server state:** one `services/<feature>Service.ts` with plain functions calling `apiRequest`; one `hooks/use<Feature>.ts` with the TanStack Query hooks; query keys as a `<feature>Keys` object in the hooks file; mutations invalidate the feature's keys.
- **Forms:** react-hook-form + a zod schema factory `createXSchema(m, common)` in `<feature>/types/` or next to the form (see [Language](#language)); `zodResolver`; server errors through `applyServerErrors` + `<FormError message={errors.root?.server?.message} />`.
- **Lists:** `useListParams` + `SearchInput` + `Pagination`, query with `placeholderData: keepPreviousData`.
- **Routes:** paths in `src/config/routes.ts`; routes in `src/app/routes/router.tsx`; sidebar items in `src/app/layout/navigation.ts`. `/` redirects to `/trips` (no separate home page; `ROUTES.home` links still work).

## Language

The app runs in English or Arabic (right-to-left). There is no i18n library: each area has a typed `{ en, ar }` dictionary, and a missing, extra or wrongly typed Arabic text **fails `npm run build`**.

**Every new user-visible text goes through a dictionary with English and Arabic.** That includes `aria-label`, `title`, `alt` and `placeholder` attributes, hints, and loading / empty texts.

### Dictionaries

```ts
// src/features/<feature>/i18n.ts
export const tripsMessages = defineMessages({
  en: { list: { title: 'Trips', pageOf: (page: number, total: number) => `Page ${page} of ${total}` } },
  ar: { list: { title: 'الرحلات', pageOf: (page: number, total: number) => `الصفحة ${page} من ${total}` } },
})
export type TripsMessages = (typeof tripsMessages)['en']

// in a component
const m = useMessages(tripsMessages)
const common = useMessages(commonMessages)
```

- Values are strings or functions returning strings. **No `as const`** on a dictionary (it would make English literal types and reject Arabic).
- Nest by screen / component: `m.list.title`, `m.form.submit`.
- One dictionary per area, next to its code: `src/app/appMessages.ts`, `src/shared/i18n/commonMessages.ts`, `src/features/<feature>/i18n.ts`. A feature never imports another feature's dictionary; exported components translate their own default texts.
- Text shared by many features (Save, Cancel, Delete, Edit, Saving…, Loading…, Previous / Next, Try again, generic validation such as `validation.atMost(max)`) lives in `commonMessages`. Do not duplicate it.
- Label maps (roles, statuses) live in the dictionary, e.g. `m.account.roles[user.role]`.
- Arabic is natural Modern Standard Arabic, not word-for-word. Keep `…` where English uses it.
- Counts use `plural(locale, count, { zero, one, two, few, many, other })` inside the Arabic function (`{count}` is replaced).
- Data typed by users and data from the API is never translated. Bilingual records (countries, inspection indicators and checks) show `localizedName(item, language)` or `bilingualLabel(item, language)` (current language first); `secondaryName(item, language)` gives the other name with its `lang` / `dir` for muted secondary text.
- Data inside a dictionary sentence (a name, email, plate or code in a confirm text or select option): in the `ar` function wrap it with `isolate(name)` (direction of its own first letter) or `ltr(code)` from `shared/i18n/bidi.ts`, so it does not reorder next to Arabic punctuation. Leave the `en` function plain. When the data sits in its own element (e.g. `<strong>`), split the sentence into `before` / `after` texts and give the element `className="ltr"` for left-to-right data.
- Arrows in text come from the dictionary so they can point the other way in Arabic.
- Changing language must not remount anything (never `key={language}`): typed form values survive a switch.

### Forms: schema factories

Zod messages come from the dictionaries, so schemas are built per language (reference: `features/authentication/types/authSchemas.ts`):

```ts
export function createLoginSchema(m: AuthMessages, common: CommonMessages) {
  return z.object({ email: z.string().trim().pipe(z.email(common.validation.email)), ... })
}
export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>

// in the form component
const schema = useMemo(() => createLoginSchema(m, common), [m, common])
useForm<LoginFormValues>({ resolver: zodResolver(schema), ... })
```

Keep limits (`PASSWORD_MAX_LENGTH`, …) as constants; only the messages change. An error already shown stays in the old language until the field is validated again.

### API messages

The API answers in English. Messages are translated **at display time** by `ErrorAlert`, `FormError` and `Field` through `translateApiMessage(message, language)` (`shared/i18n/apiMessages.ts`), so they follow a language switch. Exact strings come from `backend/contracts/*.md`; messages with an id (`Trip <id> not found`, `Vehicle <id> does not exist`, …) are matched by pattern. Unknown messages (e.g. class-validator text) stay English. `httpClient.ts` and `formErrors.ts` keep producing English; when you add a new API error to the contracts, add its Arabic to `apiMessages.ts`.

### Dates, direction and CSS

- `formatDate(date, locale)` / `formatDateTime(iso, locale)` with `locale` from `useLanguage()` (which also re-renders the component on a switch). Arabic uses the Gregorian calendar and Latin digits (`ar-SA-u-ca-gregory-nu-latn`); English uses the browser's English region.
- `<html lang dir>` and the tab title are set by `shared/i18n/language.ts` (`initLanguage()` in `main.tsx`). The choice is stored in localStorage (`trip-management.language`) and followed by other tabs.
- CSS uses logical properties only (`margin-inline-start`, `inset-inline-end`, `text-align: start`, …); never `left` / `right`. Email, password, phone, date and time inputs stay left-to-right in Arabic. Wrap plates, identity numbers and codes inside Arabic text in `<span className="ltr">`.
