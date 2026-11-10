# Story 15 — Refreshed styling and a separate "My account" page for the signed-in user

## Prerequisites

- Stories 01–14 completed (shell, authentication, every feature page, English / Arabic with right-to-left).
- Intake: `.squad/stories/user-experience/styling-refresh-and-account-page/intake.md`.
- Follows the shell pattern of [02](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) and the authentication feature of [03](../authentication/03-story-login-session-and-protected-routes.md); every new text follows [13](../localization/13-story-language-switching-foundation.md) (`defineMessages({ en, ar })`).

---

## Story Goal

1. Every page looks more polished through the **global CSS only**: page markup keeps the same class names (`btn`, `input`, `card`, `table`, …).
2. The sidebar has icons, a clear active item, stays in view while scrolling and has **Sign out** at the bottom. On screens ≤ 720px the navigation is a horizontal, scrollable row.
3. The top bar shows only the language switcher and an **account button** (initials + first name) that opens **"My account"** at `/account`.
4. "My account" shows name, email, role, member-since date, a **Change password** action and a **Sign out** action. The change-password page links back.

**Not in scope:** editing one's own profile (no self-service endpoint in `backend/contracts/auth.md`; `PATCH /api/users/:id` is admin-only), avatars, a theme toggle, new fonts, code splitting. **No backend change, no new dependency.**

---

## Context — Read These Files First

1. `src/shared/styles/index.css` — the tokens in `:root` and the dark-mode override; every global class.
2. `src/app/layout/AppLayout.tsx`, `AppLayout.module.css`, `navigation.ts` — the shell.
3. `src/features/authentication/i18n.ts` — `account` and `changePassword` groups.
4. `src/features/authentication/index.ts` — public API (`AccountLink`, `SignOutButton`, `AccountPage`).
5. `src/config/routes.ts` (`ROUTES.account`) and `src/app/routes/router.tsx`.
6. `src/shared/utils/formatDate.ts` — `formatTimestampDate`.

---

## Frontend Tasks

### 1 — Global styles

File: `src/shared/styles/index.css`

- New tokens: `--color-surface-muted`, `--color-border-strong`, `--color-primary-hover`, `--color-danger-hover`, `--color-link` (text links and focus; in dark mode lighter than `--color-primary`, so white button text on `--color-primary` keeps enough contrast), `--radius: 8px`, `--radius-lg: 12px`, `--sidebar-width: 240px`, `--header-height`, `--content-max-width: 1200px`, `--shadow-sm`, `--shadow-lg`, `--focus-ring`, `--transition` (0ms under `prefers-reduced-motion`).
- `:focus-visible` outline everywhere; `.input:focus` uses border + `--focus-ring`.
- Buttons: min height 38px (32px small), hover colours, 1px press; `.icon` sizing inside buttons.
- Inputs: min height 40px, hover / focus / disabled states, placeholder colour; checkboxes 18px with `accent-color`.
- `card`, `table-wrap`: `--radius-lg` + `--shadow-sm`. Table header row on `--color-surface-muted`, row hover, more padding, `vertical-align: middle`.
- `form-actions` separated by a top border; `page-header p` has no margin.
- Alerts have a coloured start border (`border-inline-start`, flips in right-to-left); empty state is a dashed card; dialog uses `--shadow-lg`.
- New classes: `icon` (20px), `icon-mirror` (`[dir='rtl']` flips arrows).
- ≤ 720px: smaller card padding, `details` becomes one column.

### 2 — Icons

Create file: `src/shared/components/ui/Icon.tsx` — `Icon({ name, className })`, `IconName`. 24×24 outline shapes in `ICON_SHAPES` (`trips`, `drivers`, `vehicles`, `companies`, `countries`, `inspectionChecklist`, `users`, `key`, `signOut`), `stroke="currentColor"`, `aria-hidden`. Shared because both the shell and the authentication feature use it.

### 3 — Shell

- `navigation.ts`: `NavItem.icon: IconName` on every item.
- `AppLayout.tsx`: brand mark (`Icon name="trips"` on a primary square), nav links with icons, `<div className={styles.sidebarFooter}><SignOutButton /></div>`, top bar = `<LanguageSwitcher />` + `<AccountLink />` (replaces `UserMenu`).
- `AppLayout.module.css`: sticky full-height sidebar (`position: sticky; height: 100vh`), sticky top bar, content max width. ≤ 720px: `grid-template-columns: minmax(0, 1fr)` (**`minmax(0, …)` is required**, otherwise the nav row widens the page instead of scrolling), static sidebar, nav `display: flex; overflow-x: auto`, sidebar footer hidden (sign out stays on `/account`).

### 4 — Authentication: account button, sign out, account page

- **Deleted:** `components/UserMenu.tsx`, `components/UserMenu.module.css`.
- Create `components/UserAvatar.tsx` (+ `.module.css`): initials of `firstName` / `lastName` (`Array.from(...)[0]`), sizes `small` (32px) / `large` (72px), `aria-hidden`.
- Create `components/AccountLink.tsx` (+ `.module.css`): `NavLink` to `ROUTES.account` with avatar + first name, `title={m.account.openLabel}`; active (border in `--color-link`) on `/account` and `/account/password` because `NavLink` matches child paths. Padding uses `padding-inline` so it flips in right-to-left.
- Create `components/SignOutButton.tsx`: `btn btn-secondary` + `Icon name="signOut" className="icon-mirror"`, calls `useAuth().logout`; optional `className`.
- Create `pages/AccountPage.tsx` (+ `.module.css`): `PageHeader` (title, description); Profile card (avatar, full name, role badge, `details` list: email in `ltr`, role, member since = `formatTimestampDate(user.createdAt, locale)`); Password card (text + `Link` to `ROUTES.changePassword` with `Icon name="key"`); Sign out card (text + `SignOutButton`). Two columns (3fr / 2fr), one column ≤ 900px.
- `pages/ChangePasswordPage.tsx`: `PageHeader actions` = `Link` to `ROUTES.account` ("Back to my account").
- `i18n.ts`: `userMenu` group replaced by `account` (`title`, `description`, `openLabel`, `profileTitle`, `email`, `role`, `memberSince`, `passwordTitle`, `passwordText`, `changePassword`, `signOutTitle`, `signOutText`, `signOut`, `roles`); `changePassword.backToAccount`. English and Arabic.
- `index.ts`: exports `AccountLink`, `SignOutButton`, `AccountPage`; no longer `UserMenu`.

### 5 — Routes and helpers

- `config/routes.ts`: `account: '/account'`.
- `app/routes/router.tsx`: `{ path: ROUTES.account, element: <AccountPage /> }` before the change-password route.
- `shared/utils/formatDate.ts`: `formatTimestampDate(iso, locale)` — date part of a timestamp in the user's timezone, same cached formatter as `formatDate`.
- `src/README.md`: `Icon`, `formatTimestampDate`, the new tokens / classes, the account page note, `m.account.roles` example.

---

## Edge Cases & Failure Modes

- **Page wider than a phone screen:** without `minmax(0, 1fr)` on `.shell` (≤ 720px) the horizontal nav stretches the page (measured 915px on a 390px viewport). With it, `document.documentElement.scrollWidth` is 390.
- **Right-to-left:** the sidebar moves right, the account button sits at the left of the top bar, the sign-out arrow is mirrored (`icon-mirror`), alert borders flip (`border-inline-start`). The email stays left-to-right (`ltr`).
- **Dark mode:** links and focus use `--color-link` (#7aa7ff); buttons use the darker `--color-primary` (#2f6fe0) so white text stays readable.
- **No user yet:** `AccountLink` and `AccountPage` return `null`; in practice `RequireAuth` renders the layout only once the user is loaded.
- **Name with a non-BMP first character:** `Array.from` keeps the whole character in the initials.
- **Reduced motion:** `--transition` becomes 0ms.

---

## Test Plan

1. No automated tests (no test runner in the project).
2. Smoke (headless Chrome, Playwright, dev server + real backend, seeded admin): header text is only the language switch + account button; `/account` renders; account button is active on `/account/password`; sidebar "Sign out" goes to `/login`; Arabic `/account` is right-to-left and translated; dark `/trips` readable; 390px `/account` and `/trips` fit the screen; no console errors.

---

## Verification Steps

1. **Frontend builds:** `npm run build` in the project root — passes (existing "chunk larger than 500 kB" notice only).
2. **Lint:** `npm run lint` — no warnings.
3. **Frontend runs:** `npm run dev`, sign in, open the account button → "My account"; Change password → "Back to my account"; Sign out from the sidebar and from the account page.
4. **Regression:** trips, drivers, vehicles, companies, countries, checklist, users pages and their forms / dialogs render with the new styles; Arabic and dark mode.

---

## Done Criteria

- [x] The top bar shows only the language switcher and the account button.
- [x] The account button opens `/account`; it looks active on `/account` and `/account/password`.
- [x] `/account` shows name, email, role and member-since date, with working "Change password" and "Sign out".
- [x] The sidebar has icons, a visible active item and "Sign out"; on narrow screens the navigation scrolls horizontally and the page does not.
- [x] Buttons, inputs and links have hover and visible keyboard focus states; table rows highlight on hover.
- [x] Every new text has English and Arabic; Arabic layout is right-to-left.
- [x] Dark mode remains readable.
- [x] No new npm dependency.
- [x] `npm run build` and `npm run lint` pass.
