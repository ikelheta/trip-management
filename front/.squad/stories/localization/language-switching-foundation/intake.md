# Story intake

- Folder: `.squad/stories/localization/language-switching-foundation/intake.md`

---

## Feature

- **Feature name (display):** Localization
- **Feature slug (folder under `plans/`):** `localization`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `localization`, `i18n`, `rtl`

---

## Title

```text
Change language: English / Arabic switcher, right-to-left layout and translated app shell
```

---

## Description

```text
Users can switch the app between English and Arabic at any time.

- A language switcher in the top bar (next to the user menu) and on the
  sign-in page. It shows the other language's own name ("العربية" /
  "English") and switches immediately, without a reload and without losing
  what is typed in a form.
- The choice is remembered in localStorage ("trip-management.language") and
  follows other open tabs. First visit: Arabic if the browser language starts
  with "ar", otherwise English.
- Arabic switches the whole page to right-to-left (<html lang="ar" dir="rtl">).
  The browser tab title is translated.
- Dates and times follow the language (Arabic uses the Gregorian calendar and
  Latin digits, so they match plate numbers, IDs and the date inputs).

This story builds the mechanism and translates everything outside the
business features: the layout and sidebar, shared components (pagination,
search, dialogs, alerts, loading/empty states, file upload, images), the
not-found / error pages, and the authentication feature (sign-in, user menu,
change password, session messages). Known API messages (409 conflicts,
"Invalid email or password", network failure, …) are shown in Arabic too.

Story 14 translates the business feature pages using the same mechanism.
```

---

## Acceptance criteria

```text
- [ ] The switcher on the sign-in page and in the top bar changes the
      language at once; the sidebar moves to the right in Arabic.
- [ ] The choice survives a reload and applies to other open tabs.
- [ ] Text typed in a form is kept when the language changes.
- [ ] Sign-in, change password, user menu, sidebar, pagination, search,
      dialogs, alerts, not-found page are fully Arabic in Arabic.
- [ ] A wrong password shows the Arabic message in Arabic.
- [ ] Dates use the selected language.
- [ ] A missing Arabic translation fails `npm run build` (typed dictionaries).
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Stories 01–12 (implemented).
- No backend change; API messages stay English and are translated in the
  client.

## Extra notes (optional)

- No new dependency: typed per-feature dictionaries ({ en, ar }) are enough
  for two languages and make a missing translation a compile error.

## Out of scope

- Feature pages (Story 14), more languages, translating data typed by users,
  server-side language (Accept-Language), Hijri dates.
