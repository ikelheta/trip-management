# Story intake

- Folder: `.squad/stories/localization/translate-feature-pages/intake.md`

---

## Feature

- **Feature name (display):** Localization
- **Feature slug (folder under `plans/`):** `localization`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `localization`, `i18n`

---

## Title

```text
Translate every feature page into Arabic
```

---

## Description

```text
Using the mechanism from Story 13, translate the business features:
users, files (if anything is left), companies, countries, vehicles, drivers,
inspection checklist, trips (list, details, form, passengers, inspection,
QR code card).

Everything a user reads comes from the feature's dictionary: headings,
descriptions, column headers, field labels, hints, placeholders, buttons,
loading / empty states, confirm dialogs, validation messages, status labels
(Admin / User, Good / Faulty, Passed / Failed), aria-labels and titles.

Bilingual data (countries, inspection indicators and checks) shows the name
in the current language first. Pickers label countries "Arabic — English" in
Arabic and "English — Arabic" in English. Data typed by users (trip names,
company names, passenger names) is shown as entered.
```

---

## Acceptance criteria

```text
- [ ] In Arabic, no English UI text is left on any page (data typed in
      English excepted).
- [ ] Validation messages appear in the current language.
- [ ] Counts read correctly in Arabic (e.g. passengers, failed checks).
- [ ] Inspection checks and countries show the Arabic name first in Arabic.
- [ ] Everything still works in English exactly as before.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 13.

## Out of scope

- Translating data entered by users, more languages.
