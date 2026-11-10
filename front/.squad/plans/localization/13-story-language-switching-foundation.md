# Story 13 — Change language: English / Arabic switcher, right-to-left layout and translated app shell

## Prerequisites

- **Stories 01–12 completed** (see [../00-index.md](../00-index.md)). `npm run build` and `npm run lint` pass on the current `src/`.
- Intake: [../../stories/localization/language-switching-foundation/intake.md](../../stories/localization/language-switching-foundation/intake.md).
- No backend change. API messages stay English; the client translates the known ones.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

1. A language store (`en` | `ar`), remembered in localStorage, synced across tabs, applied to `<html lang dir>` and the tab title.
2. Typed dictionaries: each area keeps `{ en, ar }` text next to its code; a missing or extra Arabic key is a **compile error**.
3. `LanguageSwitcher` in the top bar and on the sign-in page.
4. Translated: app shell (sidebar, brand, not-found, route error), shared UI components, the `files` feature components, the whole `authentication` feature, known API messages, dates.
5. The pattern Story 14 follows for the business features (schema factories, plural helper, bilingual data names).

**Not in scope:** business feature pages (Story 14), more languages, Hijri calendar, server-side language.

**Hard constraints for the executor:**

- Conventions from `src/README.md`: no semicolons, `.ts` / `.tsx` import extensions, `import type` for types, no `enum`, no `any`, named exports, `.tsx` files export only components, hooks in `.ts` files.
- **No new dependency** (no i18next). The mechanism below is the whole library.
- Text typed by users and data from the API is never translated (except the known API messages in task 5).
- Changing language must **not** remount pages or forms (no `key={language}` on the tree). Typed form values must survive a switch.

---

## Context — Read These Files First

1. `src/README.md` — folders, naming, coding rules, "Shared building blocks".
2. `src/main.tsx`, `src/app/layout/AppLayout.tsx`, `AppLayout.module.css`, `navigation.ts`, `useNavItems.ts`.
3. `src/app/pages/NotFoundPage.tsx`, `RouteErrorPage.tsx`.
4. Every file in `src/shared/components/` and `src/shared/utils/` (`formatDate.ts`, `formErrors.ts`).
5. `src/shared/services/httpClient.ts` — `ApiError`, the fallback / network messages, `SESSION_ERROR_MESSAGES`.
6. `src/features/authentication/**` (all files), `src/features/files/**` (all files).
7. `src/features/authentication/utils/sessionStore.ts` — the localStorage + `useSyncExternalStore` pattern to copy.
8. `src/shared/styles/index.css` — check every rule for physical directions (the current CSS already uses logical properties; keep it that way).
9. `backend/contracts/*.md` — every exact error message string the API returns (409 conflicts, 404 "… not found", 401 "Invalid email or password", 400 business rules such as wrong current password).

---

## Implementation tasks

### 1 — Language store

**New file: `src/shared/i18n/language.ts`**

```ts
export const LANGUAGES = ['en', 'ar'] as const
export type Language = (typeof LANGUAGES)[number]
export type TextDirection = 'ltr' | 'rtl'

const STORAGE_KEY = 'trip-management.language'

/** English keeps the browser's English region (en-US, en-GB, …) so dates read as they did before. */
function englishLocale(): string {
  const browser = navigator.language
  return browser.toLowerCase().startsWith('en') ? browser : 'en-GB'
}

/** Arabic keeps the Gregorian calendar and Latin digits so dates match the date inputs, plates and IDs. */
export const LOCALES: Record<Language, string> = {
  en: englishLocale(),
  ar: 'ar-SA-u-ca-gregory-nu-latn',
}

export const DIRECTIONS: Record<Language, TextDirection> = { en: 'ltr', ar: 'rtl' }

/** Each language's own name, shown on the switcher. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', ar: 'العربية' }

const APP_TITLES: Record<Language, string> = { en: 'Trip Management', ar: 'إدارة الرحلات' }
```

Rest of the file (same shape as `sessionStore.ts`):

- `isLanguage(value: unknown): value is Language`.
- `readStoredLanguage(): Language | null` — `localStorage.getItem` in `try/catch` (storage can throw), validated with `isLanguage`.
- `detectLanguage(): Language` — `'ar'` if `navigator.language` lower-cased starts with `'ar'`, else `'en'`.
- module variable `current: Language = readStoredLanguage() ?? detectLanguage()`.
- `getLanguage(): Language` (the `useSyncExternalStore` snapshot — a string, so it is stable).
- `setLanguage(language)`: no-op if unchanged; set `current`, write storage (`try/catch`), `applyToDocument`, notify listeners.
- `subscribeToLanguage(listener): () => void`.
- `applyToDocument(language)`: `document.documentElement.lang = language`, `.dir = DIRECTIONS[language]`, `document.title = APP_TITLES[language]`.
- `initLanguage(): void` — called once from `main.tsx` **before** `createRoot(...).render` (no flash of the wrong direction): `applyToDocument(current)` and a `window` `storage` listener that, for `STORAGE_KEY`, re-reads the stored language and, if it changed, sets `current`, applies it and notifies (other tabs follow).

**Edit `src/main.tsx`:** `import { initLanguage } from './shared/i18n/language.ts'` and call `initLanguage()` next to `connectSessionToApi()`.

**Edit `index.html`:** `<title>Trip Management</title>` (it is replaced at start anyway).

### 2 — Hooks and dictionary helpers

**New file: `src/shared/i18n/useLanguage.ts`**

```ts
import { useSyncExternalStore } from 'react'
import { DIRECTIONS, getLanguage, LOCALES, setLanguage, subscribeToLanguage, type Language, type TextDirection } from './language.ts'

export interface LanguageState {
  language: Language
  /** BCP 47 tag for Intl formatters. */
  locale: string
  dir: TextDirection
  setLanguage: (language: Language) => void
}

export function useLanguage(): LanguageState {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguage)
  return { language, locale: LOCALES[language], dir: DIRECTIONS[language], setLanguage }
}
```

**New file: `src/shared/i18n/messages.ts`**

```ts
import type { Language } from './language.ts'
import { useLanguage } from './useLanguage.ts'

export type Messages<T> = Record<Language, T>

/**
 * English is the source of the shape; `NoInfer` makes TypeScript check Arabic against it,
 * so a missing, extra or wrongly typed Arabic entry fails the build.
 */
export function defineMessages<T>(messages: { en: T; ar: NoInfer<T> }): Messages<T> {
  return messages
}

/** The current language's dictionary. Re-renders the component when the language changes. */
export function useMessages<T>(messages: Messages<T>): T {
  return messages[useLanguage().language]
}
```

Dictionary rules (write them into `src/README.md`, task 9):

- Values are strings or functions returning strings, e.g. `pageOf: (page: number, total: number) => string`. **No `as const`** on dictionaries (it would make English literal types and reject Arabic).
- Nest by screen / component, e.g. `m.list.title`, `m.form.submit`.
- One dictionary per area, next to its code: `src/app/appMessages.ts`, `src/shared/i18n/commonMessages.ts`, `src/features/<feature>/i18n.ts`. A feature never imports another feature's dictionary.
- Text shared by many features (Save, Cancel, Delete, Edit, Saving…, Loading…, Previous / Next, generic validation) lives in `commonMessages` and is used with `useMessages(commonMessages)`.

**New file: `src/shared/i18n/plural.ts`**

```ts
type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

/** Arabic has zero / one / two / few / many / other forms. `{count}` is replaced by the number. */
export function plural(locale: string, count: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules(locale).select(count)
  return (forms[rule] ?? forms.other).replace('{count}', String(count))
}
```

Use it inside dictionary functions, e.g. in `ar`: `failedChecks: (count: number) => plural('ar', count, { zero: 'لا توجد فحوص فاشلة', one: 'فحص واحد فاشل', two: 'فحصان فاشلان', few: '{count} فحوص فاشلة', many: '{count} فحصًا فاشلًا', other: '{count} فحص فاشل' })`.

**New file: `src/shared/i18n/localizedName.ts`**

```ts
import type { Language } from './language.ts'

export interface BilingualName {
  nameAr: string
  nameEn: string
}

/** The name in the current language (countries, inspection indicators and checks). */
export function localizedName(item: BilingualName, language: Language): string {
  return language === 'ar' ? item.nameAr : item.nameEn
}

/** "Primary — secondary", current language first. */
export function bilingualLabel(item: BilingualName, language: Language): string {
  return language === 'ar' ? `${item.nameAr} — ${item.nameEn}` : `${item.nameEn} — ${item.nameAr}`
}
```

### 3 — Common dictionary

**New file: `src/shared/i18n/commonMessages.ts`** — `export const commonMessages = defineMessages({ en: {...}, ar: {...} })` with at least:

- `actions`: save, saving (`'Saving…'` / `'جارٍ الحفظ…'`), cancel, delete, deleting, working (`'Working…'`, the `ConfirmDialog` pending label), edit, create, back, close, confirm, retry (`'Try again'`).
- `states`: loading (`'Loading…'` / `'جارٍ التحميل…'`), empty, notSet (`'—'` both).
- `pagination`: previous, next, `summary: (page, totalPages, total) => string`, ariaLabel.
- `search`: placeholder default, ariaLabel, button.
- `errors`: generic (`'Something went wrong. Please try again.'`), network.
- `validation` (functions used by every schema factory): `required`, `lengthBetween(min, max)`, `atMost(max)`, `atLeast(min)`, `atLeastOrEmpty(min)`, `lengthBetweenOrEmpty(min, max)`, `digitsOnly(min, max)`, `email`, `choose(what)`. English wording matches the existing schemas (`Use at most 72 characters`, `Use 2–256 characters, or leave it empty`, …).
- `language`: `change` (`'Change language'` / `'تغيير اللغة'`).

Arabic must be natural Modern Standard Arabic, not word-for-word. Keep the `…` character where English uses it.

### 4 — Switcher

**New file: `src/shared/components/ui/LanguageSwitcher.tsx`**

```tsx
import { LANGUAGE_NAMES } from '../../i18n/language.ts'
import { commonMessages } from '../../i18n/commonMessages.ts'
import { useMessages } from '../../i18n/messages.ts'
import { useLanguage } from '../../i18n/useLanguage.ts'

interface LanguageSwitcherProps {
  className?: string
}

/** Two languages: one button showing the other language's own name. */
export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage()
  const m = useMessages(commonMessages)
  const next = language === 'en' ? 'ar' : 'en'
  return (
    <button
      type="button"
      className={`btn btn-secondary btn-small ${className}`}
      lang={next}
      title={m.language.change}
      onClick={() => setLanguage(next)}
    >
      {LANGUAGE_NAMES[next]}
    </button>
  )
}
```

Place it in `AppLayout`'s header **before** `<UserMenu />`, and on `LoginPage` at the top of the card's end side (CSS module, logical properties only).

### 5 — API messages

**New file: `src/shared/i18n/apiMessages.ts`**

- `const ARABIC_API_MESSAGES: Record<string, string>` — exact English string → Arabic. Include: the generic / network / `'Request failed'` fallbacks from `httpClient.ts` and `formErrors.ts`, the two session 401s, and **every** fixed message in `backend/contracts/*.md` (409 "… is already in use", 404 "… not found", 401 "Invalid email or password", 400 business rules, file errors). Grep the contracts; do not guess strings.
- `export function translateApiMessage(message: string, language: Language): string` — Arabic lookup, otherwise the message unchanged (class-validator messages such as "email must be an email" stay English; client validation runs first so they are rare).

Translate **at display time** so the text changes live when the language changes:

- `ErrorAlert`: each message through `translateApiMessage`.
- `FormError`: the message (may be several lines) — translate line by line.
- `Field`: the `error` string (server errors are put on fields by `applyServerErrors`). Already-localized client messages pass through unchanged because they are not keys.

Leave `httpClient.ts` and `formErrors.ts` producing English; only make sure their fallback strings are keys in the map. `SESSION_ERROR_MESSAGES` must keep comparing the English API strings.

### 6 — Dates

Edit `src/shared/utils/formatDate.ts`: `formatDateTime(iso, locale)` and `formatDate(date, locale)` take the locale from `useLanguage().locale`. Cache one `Intl.DateTimeFormat` per locale (`Map<string, Intl.DateTimeFormat>`), do not create one per call. `formatTime` stays as is.

Options are explicit fields, `{ day: 'numeric', month: 'short', year: 'numeric' }` (+ `hour: 'numeric', minute: '2-digit'` for date-time), not `dateStyle: 'medium'`: English output is identical, but Arabic `medium` is all digits (`31/10/2026`) while the explicit fields give month names (`31 أكتوبر 2026`).

Update **every** caller (`grep -rn 'formatDate\|formatDateTime' src`), including those in business features, so the build passes. The component calling a formatter must call `useLanguage()` (that is also what re-renders it on a switch).

### 7 — App shell and shared components

**New file: `src/app/appMessages.ts`** — brand, `nav` labels (one key per nav item), main-nav aria-label, not-found page, route error page.

- `navigation.ts`: replace `label: string` with `labelKey: keyof AppMessages['nav']` (export `type AppMessages = (typeof appMessages)['en']`); `AppLayout` renders `m.nav[item.labelKey]`.
- `AppLayout`, `NotFoundPage`, `RouteErrorPage`: all text from `appMessages`.
- Every component in `src/shared/components/` (`ConfirmDialog`, `Dialog`, `EmptyState`, `ErrorAlert`, `Field`, `FormError`, `LoadingState`, `Pagination`, `SearchInput`, `PageHeader`): default labels / aria-labels / button texts from `commonMessages`. Props that callers pass (titles, labels) stay props — callers translate them.

### 8 — Files and authentication features

- **New `src/features/files/i18n.ts`**: every text of `ImageUploadField` and `AuthImage` (upload / replace / remove, alt fallbacks, size and type errors from `fileRules.ts` — turn those into functions of the dictionary, e.g. `tooLarge: (maxMb: number) => string`). `downloadFile.ts` has no UI text unless it builds one.
- **New `src/features/authentication/i18n.ts`**: `LoginPage`, `ChangePasswordPage`, `UserMenu` (including the role label: Admin / User → مسؤول / مستخدم), `RequireAuth` loading label, any session-expired text.
- **Schema factories** (the pattern Story 14 copies): in `authSchemas.ts` replace the constants with

  ```ts
  export function createLoginSchema(m: AuthMessages) { return z.object({ ... m.validation.emailInvalid ... }) }
  export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>
  ```

  (`AuthMessages = (typeof authMessages)['en']`; generic texts may come from `commonMessages` passed as a second argument). In the page: `const schema = useMemo(() => createLoginSchema(m, common), [m, common])` and `resolver: zodResolver(schema)`. The dictionaries are module constants, so the memo only changes on a language switch.
- `UserMenu` / `LoginPage` / `AppLayout` headers show the `LanguageSwitcher` (task 4).

### 9 — RTL details and styles

- `index.css`: keep logical properties only (`grep -nE '(margin|padding|border)-(left|right)|[^-](left|right):|text-align: *(left|right)' src -r --include=*.css` must print nothing).
- Inputs that always hold Latin text stay left-to-right in Arabic:

  ```css
  [dir='rtl'] input[type='email'],
  [dir='rtl'] input[type='password'],
  [dir='rtl'] input[type='tel'],
  [dir='rtl'] input[type='date'],
  [dir='rtl'] input[type='time'],
  [dir='rtl'] input[type='datetime-local'] {
    direction: ltr;
    text-align: end;
  }

  /* Plates, identity numbers, codes inside Arabic text. */
  .ltr {
    direction: ltr;
    unicode-bidi: isolate;
  }
  ```

- Font stack: make sure the body font has an Arabic-capable fallback (`system-ui, 'Segoe UI', Tahoma, sans-serif` covers Windows / macOS / Android).
- Any arrow characters or chevrons in text (e.g. "← Back") come from the dictionary so they can point the other way in Arabic (`'→ رجوع'`), or use CSS that flips with `[dir='rtl']`.

### 10 — Docs and plans

- `src/README.md`: add `shared/i18n/` to the folder table, `i18n.ts` to the feature layout, a **Language** section with the dictionary rules from task 2, the schema-factory pattern (task 8), "translate API messages at display time" (task 5), `localizedName` / `bilingualLabel`, and the new shared blocks (`useLanguage`, `useMessages`, `defineMessages`, `plural`, `LanguageSwitcher`, `formatDate*(…, locale)`).
- Root `CLAUDE.md` of the React project: one line — every new user-visible text goes through a dictionary with English and Arabic.
- `.squad/plans/localization/00-overview.md`: status line for Story 13.

---

## Edge Cases & Failure Modes

| Case | Expected |
|------|----------|
| localStorage blocked / throws | Language still works for the session (detect → `en`/`ar`), no crash. |
| Stored value is garbage (`'fr'`) | Ignored; detection is used. |
| Switch language with a half-filled form | Values kept (no remount). Error messages already shown stay in the old language until the field is validated again — acceptable. |
| Other tab switches language | This tab follows within one `storage` event. |
| API message not in the map | Shown in English (not hidden). |
| Wrong password in Arabic | "البريد الإلكتروني أو كلمة المرور غير صحيحة" (from the map). |
| Arabic text next to a plate / ID | Wrapped with `.ltr` where it reorders badly. |
| Print in Arabic | Inherits `dir="rtl"`; nothing extra. |

---

## Test Plan

Manual, `npm run dev` with the backend running:

1. Clear `trip-management.language`; with an English browser the app opens in English, `<html lang="en" dir="ltr">`.
2. Sign-in page → click "العربية": card text Arabic, `<html lang="ar" dir="rtl">`, tab title "إدارة الرحلات". Wrong password → Arabic message.
3. Sign in → sidebar on the right, nav labels Arabic, user menu Arabic, switcher shows "English".
4. Change password: type into fields, switch language → typed values kept; submit empty → Arabic validation messages.
5. Trips list in Arabic: pagination text, search, dates in Arabic month names with Latin digits. (Feature text still English until Story 14.)
6. Reload → still Arabic. Open a second tab, switch there → first tab follows.
7. Switch back to English: everything as before Story 13.

---

## Migration / Rollback

Front-end only. Rollback = revert the commit; the stored `trip-management.language` key is then ignored.

---

## Verification Steps

```bash
npm run build
npm run lint
# no English literal left in translated areas (heuristic; review every hit)
grep -rnE '>[^<{}]*[A-Za-z]{3,}[^<{}]*<' src/app src/shared/components src/features/authentication src/features/files --include=*.tsx
grep -rnE '(aria-label|placeholder|title|alt|label)="[^"]*[A-Za-z]{3,}' src/app src/shared/components src/features/authentication src/features/files --include=*.tsx
# physical CSS directions (must print nothing)
grep -rnE '(margin|padding|border)-(left|right)|[^-](left|right):|text-align: *(left|right)' src --include=*.css
```

---

## Done Criteria

- [x] `src/shared/i18n/` with `language.ts`, `useLanguage.ts`, `messages.ts`, `plural.ts`, `localizedName.ts`, `commonMessages.ts`, `apiMessages.ts`; `initLanguage()` in `main.tsx`.
- [x] `LanguageSwitcher` in the top bar and on the sign-in page.
- [x] App shell, shared components, `files` and `authentication` have no hard-coded English text.
- [x] Removing one key from an `ar` dictionary breaks `npm run build` (try it, then put it back).
- [x] Dates use the selected language; all callers pass the locale.
- [x] Known API messages show in Arabic.
- [x] `src/README.md`, React `CLAUDE.md`, overview updated.
- [x] `npm run build` and `npm run lint` pass with no warnings.

---

## Implementation notes (2026-11-08)

Implemented as planned. `NoInfer` and `Intl.LDMLPluralRule` type-check under TypeScript 7.0.2, so `defineMessages` is exactly the design above: removing `ar.userMenu.signOut` failed `npm run build` with TS2741, an extra Arabic key fails with TS2353; both restored.

Deviations and additions:

- **English locale:** `en` is the browser's own English locale (`en-US`, `en-GB`, …), falling back to `en-GB` for a non-English browser, instead of a fixed `en-GB`. Before this story dates used the browser default, so an `en-US` browser kept showing `Oct 31, 2026, 8:44 PM`; a fixed `en-GB` would have changed English text.
- **Date options:** explicit fields instead of `dateStyle` (see task 6), so Arabic shows month names as the test plan expects.
- **Role label in English** stays `admin` / `user` (lower case, as the badge showed before); Arabic `مسؤول` / `مستخدم`. "English text unchanged" wins over the planned `Admin` / `User`.
- **API messages with an id or value** (`<Resource> <id> not found`, `<Resource> <id> does not exist`, `Trip <id> has no inspection`, `Unknown or deleted checks: …`, `Missing results for checks: …`, `Checks not part of this inspection: …`, `File type "<type>" is not allowed`) are matched by a short pattern list next to the exact-string map; the exact map uses `Object.hasOwn` so a message such as `constructor` cannot hit the prototype.
- **`fileRules.ts`:** `validateImageFile` returns a problem code (`'wrongType' | 'empty' | 'tooLarge'`) and `ImageUploadField` keeps the problem (or the `ApiError`) in state and builds the text at render, so an upload error already shown also follows a language switch.
- **Sign-in card:** title and switcher share a flex row (`LoginPage.module.css` `.header`, `justify-content: space-between`), so the switcher sits at the card's end side in both directions.
- **Font stack:** `Tahoma` added before `sans-serif`; `Roboto` kept so English rendering does not change.
- `commonMessages` also has `actions.working` and `validation.atLeastOrEmpty` (see task 3).

Verification:

- `npm run build`, `npm run lint`: pass, no warnings (only the existing Vite "chunk larger than 500 kB" notice).
- Verification greps: the JSX-text grep prints only `router.tsx:21` (element names `<LoginPage />`, not text); the attribute grep and the physical-CSS grep print nothing.
- Headless Chrome over the DevTools protocol against the dev server and backend, 27/27: opens in English (`lang="en" dir="ltr"`, title "Trip Management"); sign-in switcher gives Arabic `lang` / `dir` / title, typed email kept, empty-password and wrong-password messages in Arabic, the shown API error switches back to English live; signed in: Arabic nav in order, sidebar on the right, top bar shows "English" + Arabic user menu, trip dates `21 نوفمبر 2026`; countries pagination `الصفحة 1 من 25 (الإجمالي: 249)`; change password keeps typed values across two switches and shows Arabic validation and the Arabic "Current password is incorrect"; not-found in Arabic after reload; a second tab switching to English is followed by the first; English nav and user menu unchanged; no console errors.
- Not covered: image upload errors in Arabic (`ImageUploadField`, needs a file picker), the route error page, print preview, narrow screens. The native file input's own "Choose file / No file chosen" text follows the browser language and cannot be translated.
