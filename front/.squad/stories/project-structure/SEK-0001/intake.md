# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/project-structure/SEK-0001/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Project structure
- **Feature slug (folder under `plans/`):** `project-structure`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `SEK-0001` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `New`
- **Assignee:** ``
- **Labels:** `frontend`, `architecture`, `setup`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
Set up feature-based project structure and coding conventions for the trip-managment frontend
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
Context
-------
trip-managment is a fresh Vite + React 19 + TypeScript project (create-vite
"react-ts" template). It still contains only the Vite demo: src/App.tsx (counter
demo), src/App.css, src/index.css, src/main.tsx, src/assets/{hero.png,react.svg,vite.svg},
public/{favicon.svg,icons.svg}. No router, state, data-fetching or form libraries
are installed. Styling is plain CSS. Linting is oxlint (`npm run lint`).

Goal
----
Turn the demo into a clean, empty foundation with a feature-based modular
architecture, so every later feature story (authentication, users, trips, ...)
has an obvious place for its code and follows the same conventions.

The engineering rules for this project are in attachments/frontend-guidelines.md.
They apply to this story and every story after it. Key points: feature-based
modules, keep it simple, no DDD / Clean Architecture, no abstractions used only
once, no new dependencies without a clear need, strict TypeScript, no `any`.

Target structure
----------------
This tree is the agreed target. It supersedes section 2 of the guidelines
attachment.

src/
├── app/
│   ├── providers/
│   ├── routes/
│   └── App.tsx
│
├── features/
│   ├── authentication/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── pages/
│   │
│   ├── users/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── pages/
│   │
│   └── products/
│
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── utils/
│
├── assets/
├── config/
└── main.tsx

The feature folders in the tree (authentication, users, products) only show
the per-feature layout. This story does not create them. It documents the
feature layout so that later stories create real features (for example
authentication, users, trips) in that shape.

What to do
----------
1. Create the folders of the target tree (app/, shared/, features/, config/;
   assets/ already exists). Add a .gitkeep to any folder that would
   otherwise be empty so the structure survives version control.
2. Move src/App.tsx to src/app/App.tsx and update the import in
   src/main.tsx. main.tsx stays at src/main.tsx.
3. Remove the Vite demo: replace App with a minimal placeholder (for example
   the app name in a heading), and delete the demo-only files: App.css,
   assets/hero.png, assets/react.svg, assets/vite.svg, public/icons.svg.
   Keep public/favicon.svg.
4. Keep plain CSS. Move the global stylesheet src/index.css to
   src/shared/styles/index.css, update the import in main.tsx, and strip it
   down to a small, neutral base (no demo styling). shared/styles/ is the only
   folder this story adds beyond the target tree.
5. Make TypeScript strict explicit: set "strict": true in tsconfig.app.json
   and tsconfig.node.json, even if the compiler already defaults to it, so the
   intent is visible.
6. Write a short src/README.md that a new developer can read in a few minutes:
   - what each top-level folder under src/ is for and what does NOT belong there;
   - the per-feature layout (components/, hooks/, services/, types/, pages/,
     plus an optional utils/) and that a feature exposes its public API
     through features/<feature>/index.ts; other code imports a feature only
     through that file;
   - the rule that code goes into shared/ only when two or more features
     really use it;
   - naming conventions: component files and components in PascalCase
     (e.g. TripCard.tsx), hooks camelCase with a `use` prefix
     (useTrips.ts), every other file camelCase (tripService.ts,
     formatDate.ts), types/interfaces PascalCase, constants UPPER_SNAKE_CASE;
     folders kebab-case;
   - a pointer to the guidelines (copy the important rules from the
     attachment in short form; do not link to .squad/).
7. Replace the template README.md at the project root with a short project
   README: name, stack (Vite, React 19, TypeScript, plain CSS, oxlint), npm
   scripts (dev, build, lint, preview), and a link to src/README.md.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
- [ ] src/ contains app/ (App.tsx, providers/, routes/), features/, shared/
      (components/ui/, components/layout/, hooks/, services/, types/, utils/,
      styles/), assets/, config/ and main.tsx, matching the target tree in the
      description.
- [ ] Folders with no files yet contain a .gitkeep. No placeholder .ts/.tsx
      files exist just to fill folders.
- [ ] src/App.tsx no longer exists; src/app/App.tsx renders a minimal
      placeholder with no counter, logos or demo links.
- [ ] Demo files are removed: src/App.css, src/assets/hero.png,
      src/assets/react.svg, src/assets/vite.svg, public/icons.svg.
      public/favicon.svg is kept.
- [ ] The global stylesheet lives at src/shared/styles/index.css, is imported
      once from src/main.tsx, and contains no demo-specific styles.
- [ ] tsconfig.app.json and tsconfig.node.json both set "strict": true.
- [ ] src/README.md documents the folder purposes, feature layout and
      index.ts public-API rule, the shared/ rule, and the naming conventions
      listed in the description.
- [ ] The root README.md describes the project and its npm scripts and links
      to src/README.md.
- [ ] package.json dependencies and devDependencies are unchanged (no new
      packages).
- [ ] No file uses `any`.
- [ ] `npm run build` succeeds with no TypeScript errors.
- [ ] `npm run lint` reports no errors.
- [ ] `npm run dev` starts and the page shows the placeholder with no console
      errors.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |
| `attachments/frontend-guidelines.md` | React frontend architecture and clean-code guidelines for this project (verbatim from the product owner). Section 2's folder tree is superseded by the target tree in the Description. |

---

## Dependencies

- **Blocked by / related ids:** None. This is the first story.
- **Depends on code areas or other stories:** None. Every later feature story depends on this one, because it sets the folder layout and conventions they follow.

## Extra notes (optional)

- The project folder name `trip-managment` (spelled this way) is intentional as-is. Do not rename it in this story.
- The product owner asked for a simple, practical setup. If a planning decision is unclear, prefer fewer files and fewer abstractions.

## Technical hints (optional)

- Repos/roots: `.`. Primary language: `typescript`.
- Stack: Vite 8, React 19, TypeScript 7 (`tsc -b` runs in `npm run build`), oxlint, plain CSS. Node 24.
- `tsconfig.app.json` already has `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` and `allowImportingTsExtensions`. Keep them. Imports currently use explicit extensions (`import App from './App.tsx'`), so keep that style.
- `index.html` loads `/src/main.tsx`. That path does not change.

## Out of scope

- What this story explicitly does **not** cover:
  - Creating real features (authentication, users, trips, ...) or any pages.
  - Installing or configuring a router, TanStack Query, a state library, a form or validation library, or an HTTP client. Each one comes with the first story that needs it.
  - Adding code to `app/providers/`, `app/routes/` or `config/` (folders only).
  - Shared UI components, a layout component, or a design system / design tokens.
  - Path aliases (e.g. `@/`). Relative imports stay for now.
  - Testing setup (Vitest, Testing Library), Prettier, CI, or git hooks.
  - Changing lint rules beyond what is needed to pass on the new structure.
