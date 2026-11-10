# localization — plan overview

Entry point for the **localization** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 13 | [13-story-language-switching-foundation.md](13-story-language-switching-foundation.md) | Change language: English / Arabic switcher, right-to-left layout and translated app shell | — | 01–12 |
| 14 | [14-story-translate-feature-pages.md](14-story-translate-feature-pages.md) | Translate every feature page into Arabic | — | [13](13-story-language-switching-foundation.md) |

## Dependency notes

- **Status:** planned 2026-11-08. Story 13 implemented 2026-11-08 (`shared/i18n/`, switcher, RTL, translated shell / shared components / `files` / `authentication`, Arabic API messages, localized dates; build and lint pass). Story 14 implemented 2026-11-08 (`i18n.ts` + schema factories in users, companies, countries, vehicles, drivers, inspection-checklist, trips; Arabic plurals; bilingual names current language first; build and lint pass; English smoke test 34/34; Arabic browser check).
- No backend change; API messages are translated in the client (`shared/i18n/apiMessages.ts`).
- No new dependency: typed `{ en, ar }` dictionaries; a missing Arabic text fails the build.
