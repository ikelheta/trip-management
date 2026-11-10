# Story intake

- Folder: `.squad/stories/user-experience/styling-refresh-and-account-page/intake.md`

---

## Feature

- **Feature name (display):** User experience
- **Feature slug (folder under `plans/`):** `user-experience`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `styling`, `ux`, `authentication`

---

## Title

```text
Refreshed styling and a separate "My account" page for the signed-in user
```

---

## Description

```text
Make the app look more polished and easier to use, and move the signed-in
user's details out of the top bar.

Styling (applies to every page through the global CSS):
- Clearer visual hierarchy: softer page background, cards and tables with
  rounded corners and a light shadow, more comfortable spacing.
- Buttons, links and inputs have visible hover, focus and pressed states;
  keyboard focus is always visible.
- Tables: header row with a subtle background, row hover.
- Alerts, badges, empty states and dialogs match the new look.
- Sidebar: navigation items get icons, a clear active state, and the sidebar
  stays in view while the page scrolls. On narrow screens the navigation is a
  horizontal, scrollable bar instead of a long list.
- Dark mode and right-to-left (Arabic) keep working.

Account:
- The top bar no longer shows the name, role badge, "Change password" and
  "Sign out" buttons. It shows the language switcher and a compact account
  button (the user's initials and first name) that opens a new "My account"
  page at /account.
- "My account" shows the user's name, email, role and when the account was
  created, a "Change password" action and a "Sign out" action.
- "Sign out" is also available at the bottom of the sidebar.
- The change-password page links back to "My account".
- All new texts in English and Arabic.
```

---

## Acceptance criteria

```text
- [ ] The top bar shows only the language switcher and the account button.
- [ ] The account button opens /account; it looks active on /account and
      /account/password.
- [ ] /account shows name, email, role and account creation date, and has
      working "Change password" and "Sign out" actions.
- [ ] The sidebar has icons, a visible active item and a "Sign out" button;
      on narrow screens the navigation scrolls horizontally.
- [ ] Buttons, inputs and links have hover and visible keyboard focus states;
      table rows highlight on hover.
- [ ] Every new text has English and Arabic; Arabic layout is right-to-left.
- [ ] Dark mode remains readable.
- [ ] No new npm dependency.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Stories 01–14 (implemented).
- No backend change. The account page uses the user already loaded by
  GET /auth/me (`useAuth().user`).

## Out of scope

- Editing one's own name or email (no self-service endpoint in the
  contract), avatars / profile pictures, a theme toggle, new fonts,
  route-level code splitting.
