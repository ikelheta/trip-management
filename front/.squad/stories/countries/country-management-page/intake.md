# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/countries/country-management-page/intake.md`

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit.

---

## Feature

- **Feature name (display):** Countries
- **Feature slug (folder under `plans/`):** `countries`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `countries`, `backend-story-04`

---

## Title

```text
Country management page and a country picker for other features
```

---

## Description

```text
Backend Story 04 (backend/contracts/countries.md) stores countries with an
Arabic and an English name; 249 are seeded. Drivers use a country as their
nationality.

One page, /countries:
- Paginated list (page / limit / search in the URL). search matches nameAr
  and nameEn. Columns: English name, Arabic name (right-to-left), last
  updated, actions.
- "New country" and "Edit" open a dialog with nameEn and nameAr
  (trimmed, 2–256 each). 409 "Arabic name is already in use" /
  "English name is already in use" shown on the form.
- "Delete" asks for confirmation; soft delete (drivers that use it keep their
  nationalityId).

For other features (drivers, Story 09), export from the feature's index.ts:
- Country type.
- useAllCountries(): every country (all pages, sorted by English name),
  cached 5 minutes.
- CountrySelect: a <select> of all countries labelled "English — Arabic",
  usable with react-hook-form register and as a controlled filter.
- formatCountryName(country).

Sidebar item "Countries".
```

---

## Acceptance criteria

```text
- [ ] /countries lists countries 10 per page with working Previous / Next.
- [ ] Searching "Saudi" or "السعودية" finds Saudi Arabia; page and search
      survive a reload.
- [ ] Create and edit through the dialog; duplicate names show the API
      message; 1-character names are caught before sending.
- [ ] Delete asks first and removes the row.
- [ ] CountrySelect lists all 249+ countries.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 03 (authentication; every route is protected).
- Backend Story 04 (implemented).

## Extra notes (optional)

- The contract suggests a search-as-you-type picker instead of loading all
  countries. 249 rows are 3 requests of 100, cached for 5 minutes, which keeps
  the picker a plain <select>. Revisit if the list grows a lot.

## Out of scope

- Country details page, bulk import, sorting columns, tests.
