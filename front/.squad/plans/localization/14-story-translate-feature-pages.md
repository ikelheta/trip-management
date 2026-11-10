# Story 14 — Translate every feature page into Arabic

## Prerequisites

- **Story 13 completed:** [13-story-language-switching-foundation.md](13-story-language-switching-foundation.md). It provides:
  - `shared/i18n/`: `useLanguage`, `useMessages`, `defineMessages`, `plural`, `localizedName`, `bilingualLabel`, `commonMessages`, `translateApiMessage`
  - `LanguageSwitcher`
  - `formatDate*(…, locale)`
  - the schema-factory pattern in `features/authentication/types/authSchemas.ts`
- Intake: [../../stories/localization/translate-feature-pages/intake.md](../../stories/localization/translate-feature-pages/intake.md).
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

In Arabic, every page of every business feature reads fully in Arabic; in English nothing changes. Features: `users`, `companies`, `countries`, `vehicles`, `drivers`, `inspection-checklist`, `trips`.

**Not in scope:** translating data users typed, more languages, changing behaviour or layout.

**Hard constraints for the executor:**

- Follow the **Language** section of `src/README.md` (written in Story 13) exactly. Copy the pattern from `src/features/authentication/` (its `i18n.ts`, `authSchemas.ts` factories, pages).
- One dictionary per feature: `src/features/<feature>/i18n.ts` exporting:
  - `<feature>Messages = defineMessages({ en, ar })`
  - `type <Feature>Messages = (typeof <feature>Messages)['en']`

  Generic words come from `commonMessages`; do not duplicate them.
- A feature never imports another feature's dictionary. Exported components (e.g. `CountrySelect`) translate their own default texts.
- English text must stay **exactly** as it is today (the browser smoke test matches it).
- No new dependency, no behaviour changes, no remounting on language change.

---

## Context — Read These Files First

1. `src/README.md` — **Language** section.
2. `src/shared/i18n/*` and, as the reference implementation, `src/features/authentication/`:
   - `i18n.ts`
   - `types/authSchemas.ts`
   - `pages/LoginPage.tsx`
3. All files of the feature being translated (listed per task below).
4. The feature's contract in `backend/contracts/` — field names used in labels.

---

## Implementation tasks

Do the features in this order; run `npm run build` after each one.

### Per-feature recipe

For each feature:

1. **Create `i18n.ts`** with nested sections per screen or component (`list`, `details`, `form`, `delete`, `fields`, `validation`, …). Put every user-visible string there:
   - page titles and descriptions
   - column headers, including the visually-hidden "Actions"
   - field labels, hints and placeholders
   - buttons and links
   - loading and empty texts
   - confirm dialog titles and bodies (functions when they include a name)
   - `aria-label`, `title` and `alt` attributes
   - status and role labels
2. **Schemas → factories:**
   - `createXSchema(m: XMessages, common: CommonMessages)`.
   - `export type XFormValues = z.infer<ReturnType<typeof createXSchema>>`.
   - Keep the limits (`MAX_PASSENGERS`, `NOTE_MAX_LENGTH`, …) as constants; only the messages change.
   - In the form component: `const schema = useMemo(() => createXSchema(m, common), [m, common])`.
3. **Components:** call `const m = useMessages(xMessages)` (and `useMessages(commonMessages)` where needed) and replace the literals. Default prop values like `emptyLabel = 'Loading companies…'` become an optional `emptyLabel` with the fallback taken from the dictionary inside the component.
4. **Label maps** (role, status, good/faulty, …) move into the dictionary: `m.roles[user.role]`, typed as `Record<UserRole, string>`.
5. **Dates:** callers already pass `locale` (Story 13); check that nothing new was added without it.
6. **Plurals:** any "N items" text uses a dictionary function built with `plural()` in Arabic.
7. **Mixed text:** wrap plates, identity numbers, secret codes and emails shown inside Arabic sentences in `<span className="ltr">`.

### 1 — users

- `components/UserForm.tsx`
- `pages/UsersPage.tsx`, `NewUserPage.tsx`, `EditUserPage.tsx`
- `types/userSchemas.ts`
- role and active labels, and the texts for the limits on editing your own account

### 2 — companies

- `components/CompanyForm.tsx`, `CompanySelect.tsx`, `DeleteCompanyDialog.tsx`
- `pages/CompaniesPage.tsx`, `CompanyDetailsPage.tsx`, `NewCompanyPage.tsx`, `EditCompanyPage.tsx`
- `types/companySchemas.ts`
- `utils/companyRequests.ts`, only if it holds text

### 3 — countries

Files: `components/CountryForm.tsx`, `CountrySelect.tsx`, `CountryTable.tsx`, `pages/CountriesPage.tsx`, `types/countrySchema.ts`.

- `formatCountryName(country, language)` → `bilingualLabel(country, language)`, current language first. Update `index.ts` and every caller (drivers).
- `useAllCountries()` keeps sorting by English name, because one cache serves both languages. `CountrySelect` sorts its options at render by the current language's name with `localeCompare(…, locale)`.
- The table keeps both name columns; in Arabic the Arabic column comes first.

### 4 — vehicles

- `components/VehicleForm.tsx`, `VehicleSelect.tsx`, `VehicleTable.tsx`
- `pages/*`
- `types/vehicleSchema.ts`
- `utils/formatVehicleLabel.ts`: if it adds words, take them from the dictionary (pass `m`, or return the parts).

### 5 — drivers

- `components/DriverForm.tsx`, `DriverSelect.tsx`, `DriverTable.tsx`
- `pages/*`, including the "All …" options in the filter selects
- `types/driverSchema.ts`
- `utils/formatDriverLabel.ts`
- Nationality uses `bilingualLabel` / `localizedName` through the countries feature's public API.

### 6 — inspection-checklist

Files: `components/CheckForm.tsx`, `IndicatorCard.tsx`, `IndicatorForm.tsx`, `pages/InspectionChecklistPage.tsx`, `types/inspectionChecklistSchemas.ts`.

- Indicator and check names: show `localizedName(item, language)` first and the other language as secondary text.
- Both names stay editable in the forms. Label the inputs "English name" / "Arabic name", with their Arabic equivalents in Arabic.
- Move up / down buttons get their aria-labels from the dictionary. Up and down arrows do not flip in Arabic.

### 7 — trips

Files:
- `components/InspectionBadge.tsx`, `InspectionFieldset.tsx`, `PassengersFieldset.tsx`, `PassengersTable.tsx`, `TripForm.tsx`, `TripInspectionView.tsx`, `TripQrCodeCard.tsx`, `TripsTable.tsx`
- `pages/TripsListPage.tsx`, `TripDetailsPage.tsx`, `CreateTripPage.tsx`, `EditTripPage.tsx`
- `types/tripSchemas.ts`
- `utils/tripForm.ts`

Notes:
- Texts to translate include:
  - the "Untitled trip" fallback
  - Good / Faulty and Passed / Failed
  - "N failed" and passenger counts, both as plurals
  - "Mark all good"
  - the QR card texts (loading, regenerate, download, failed)
  - the print button
- Inspection indicator and check names (the live checklist in the form, the snapshot in the details view): show `localizedName` first and the other language as secondary text.
- The QR download file name stays ASCII; do not translate it.
- The `superRefine` message in `tripSchemas.ts` ("This identity number is already in the list") comes from `m`.

### 8 — Docs and plans

- `.squad/plans/localization/00-overview.md`: status for Story 14.
- Each feature's `00-overview.md` (`users` … `trips`): add one dependency-note line, "Text in `i18n.ts` (English / Arabic) since Story 14".
- `src/README.md`: change it only if something in the Language section turned out wrong or missing.

---

## Edge Cases & Failure Modes

| Case | Expected |
|------|----------|
| Language switched on the trip form with answers filled | Answers, passengers and notes are kept; labels change. |
| Country picker in Arabic | Arabic names first, sorted in Arabic order; the selected value does not change. |
| Trip without an inspection (old trips) | The "no inspection" text is translated. |
| Delete confirm that includes a company or driver name | The name is inserted by a dictionary function; the Arabic sentence order is correct. |
| 0, 1, 2, 3, 11, 100 passengers / failed checks in Arabic | Correct plural forms. |
| English | Exactly the same visible text as before. |

---

## Test Plan

With the backend running, check each step in Arabic and in English:

1. Every sidebar page: no English UI text in Arabic (data excepted).
2. Create a company, vehicle, driver and trip in Arabic. Check the labels, the validation messages (submit empty) and the success flow.
3. Trip details: inspection names with Arabic first, the badge plural, the QR card texts, edit, and the delete confirm.
4. Inspection checklist page: dialogs, move, delete confirm.
5. Users page: create and edit, role labels.
6. Countries: search in Arabic, picker order.
7. Switch language mid-form on the trip form: values are kept.
8. Re-run the browser smoke test (`scratchpad/browser-test/ui-test.mjs`, in English): still 34/34.

---

## Migration / Rollback

Front-end only; revert the commit.

---

## Verification Steps

```bash
npm run build
npm run lint
# English literals left in JSX text or text attributes (heuristic; every hit must be data, a CSS class, or justified)
grep -rnE '>[^<{}]*[A-Za-z]{3,}[^<{}]*<' src/features --include=*.tsx
grep -rnE '(aria-label|placeholder|title|alt|label|emptyLabel)="[^"]*[A-Za-z]{3,}' src/features --include=*.tsx
# string literals passed to zod (must print nothing: messages come from the dictionaries)
grep -rnE "\.(min|max|regex|refine|email)\([^)]*'[A-Z]" src/features --include=*.ts
```

---

## Done Criteria

- [x] Every business feature has `i18n.ts`; schemas are factories; no hard-coded UI text is left.
- [x] Bilingual names follow the current language (countries, checklist, trip inspection).
- [x] Arabic plurals are correct.
- [x] English is unchanged (smoke test 34/34).
- [x] Overviews updated.
- [x] `npm run build` and `npm run lint` pass with no warnings.

---

## Implementation notes (2026-11-08)

Implemented in the planned order (users, companies, countries, vehicles, drivers, inspection-checklist, trips), `npm run build` after each. Every feature has `i18n.ts` (`<feature>Messages` + `<Feature>Messages` type) and schema factories (`createNewUserSchema` / `createEditUserSchema`, `createCompanyFormSchema(m)`, `createCountrySchema(common)`, `createVehicleSchema`, `createDriverSchema`, `createIndicatorSchema` / `createCheckSchema`, `createTripFormSchema`), built with `useMemo(…, [m, common])`. English text is unchanged.

Deviations and additions:

- **Bidi marks for data in sentences** (new `shared/i18n/bidi.ts`: `isolate(text)` = FSI…PDI, `ltr(text)` = LRI…PDI). Dictionary values must stay strings, so a `<span className="ltr">` cannot go inside a dictionary function; the `ar` functions wrap names / emails / registration numbers / identity numbers with these marks instead (user and company delete confirms, company and driver select options, edit-driver / edit-vehicle titles, QR alt and caption). Without them `Delete Ui User (ui@x.com)?` reorders to `(Ui User (ui@x.com؟`. `en` functions stay plain. Where the data already sits in its own element, the sentence is split into `before` / `after` texts (country, vehicle, driver, checklist delete confirms; the "no checks" link on the new-trip page) and the vehicle plate gets `<strong className="ltr">`.
- **`secondaryName(item, language)`** added to `shared/i18n/localizedName.ts` (the other language's name plus its `lang` / `dir`), used by the checklist card and the trips `InspectionName` component (indicator / check names in the trip form and the details view: current language first, the other as muted text).
- **`formatCountryName` removed** (countries `index.ts`): `CountrySelect` and the drivers list use `bilingualLabel` from `shared/i18n/` directly. `CountrySelect` sorts a copy of the cached list by `localizedName` with `localeCompare(…, locale)`; `useAllCountries` still sorts by English name. The countries table and the checklist checks table put the current language's name column first.
- **`formatDriverLabel` removed**: it was used only by `DriverSelect`; the label is now `driversMessages.select.option(name, identityId)` so the Arabic version can isolate the parts. `formatVehicleLabel` is unchanged (it adds no words).
- **Role labels:** the users list badge keeps the lower-case `admin` / `user` (as the API value was shown before, same as Story 13's user menu); the role select keeps `Admin` / `User`; both are `مسؤول` / `مستخدم` in Arabic (`m.roles`, `m.roleOptions`).
- **Move up / down buttons:** the checklist page has none (order is the editable "Sort order" number), so there were no aria-labels to translate. `SORT_ORDER_MIN` / `SORT_ORDER_MAX` are now exported from the schema file and used for the input `min` / `max` and the hint.
- **Arabic passengers heading** uses the plural alone (`3 ركاب`, `راكبان`, `11 راكبًا`, `100 راكب`; zero = `الركاب`, the list below says there are none) instead of `الركاب (3)`; English stays `Passengers (3)`. Failed checks: `بند واحد معيب`, `بندان معيبان`, `3 بنود معيبة`, `11 بندًا معيبًا`, `100 بند معيب`.
- **English name inputs** of the country, indicator and check forms got `dir="ltr" lang="en"` (mirror of the existing `dir="rtl" lang="ar"` on the Arabic inputs), so they stay left-to-right in Arabic; no visible change in English.
- **Smoke-test flake fixed (behaviour-neutral):** deleting a trip from its details page sometimes logged a 404 (`GET /api/trips/<id>`) because `useDeleteTrip` removes the detail query while the page is still mounted, and the page re-rendered (mutation success) before the navigation to the list rendered, re-creating and refetching the query. It reproduced with this page's i18n hooks taken out too, so it was not caused by the translation. `useTrip(id, enabled = true)` now takes `enabled`, and `TripDetailsPage` passes `!deleteTrip.isSuccess`. 0 404s in 8 delete rounds afterwards; the smoke test failed 3 of 4 runs before and passed 2 of 2 after.
- `tripForm.ts` and `companyRequests.ts` hold no UI text and are unchanged.

Verification:

- `npm run build`, `npm run lint`: pass, no warnings (only the existing Vite "chunk larger than 500 kB" notice).
- Verification greps: the JSX-text grep prints only TypeScript lines (`Promise<void>` in three form prop types) and one comment (`DriverForm.tsx`, `"Country <id> does not exist"`); the attribute grep and the zod-literal grep print nothing. An extra grep for multi-line JSX text and for capitalised string literals outside `i18n.ts` printed nothing.
- English smoke test (`scratchpad/browser-test/ui-test.mjs`): 34 passed, 0 failed (twice, after the race fix).
- Arabic check (Playwright, `scratchpad/browser-test/ar-check.mjs`, own data, cleaned up): every sidebar page plus the new user / company / vehicle / driver / trip forms, own-user edit, company details, trip details and trip edit, with the Latin words of the page text, attributes and options listed and reviewed: all are data (country / checklist English names, plates, company and driver names, emails, `JPEG` / `WebP` in the file hint, `PNG` / `QR` / `API`) or the `English` switcher. Empty submit gives Arabic messages on the company, vehicle, driver, user and trip forms and in the indicator dialog. Nationality picker: `آيسلندا — Iceland`, `إثيوبيا — Ethiopia`, … sorted in Arabic. Countries search `مصر` works and the Arabic column is first; country / check / company / trip delete confirms in Arabic. Users: Arabic role / status badges and own-account limits. Trip form: switching to English and back with vehicle, driver, date, time, name, three passengers, answers and a note filled keeps every value (no remount) and the heading becomes `Passengers (3)` / `3 ركاب`. Trip details: `بندان معيبان` badge, indicator and check names Arabic first, QR card texts, Arabic date `5 ديسمبر 2026 الساعة 08:30`; untitled trips show `رحلة بلا اسم`. Plural functions checked for 0, 1, 2, 3, 11, 100. No console errors. Screenshots of the trip form, trip details and checklist reviewed.
- Not covered: image upload errors, print preview and narrow screens in Arabic; the native date / time / file inputs follow the browser language.
