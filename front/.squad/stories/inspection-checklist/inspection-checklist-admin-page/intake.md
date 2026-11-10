# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/inspection-checklist/inspection-checklist-admin-page/intake.md`

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit.

---

## Feature

- **Feature name (display):** Inspection checklist
- **Feature slug (folder under `plans/`):** `inspection-checklist`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `inspection`, `admin`, `backend-story-09`

---

## Title

```text
Inspection checklist admin page (indicators and their checks)
```

---

## Description

```text
Backend Story 09 (backend/contracts/inspection-checklist.md): the pre-trip
checklist is a list of indicators (groups), each with checks. 3 indicators
with 16 checks are seeded. Every new trip inspection must answer every live
check (Story 11 builds the trip form from this list).

One page, /inspection-checklist (admin-only sidebar item):
- GET /api/inspection-indicators returns every indicator with its checks,
  already sorted (sortOrder, then nameEn). Not paginated. Show each indicator
  as a card with its checks in a table.
- Indicators: create, edit (nameEn, nameAr: trimmed 2–256; sortOrder: whole
  number 0–1000, default 0) in a dialog; delete with confirmation. Deleting an
  indicator that still has checks -> 409 "Inspection indicator still has
  checks; delete or move them first", shown in the confirmation dialog.
- Checks: "Add check" on an indicator, edit, delete. Fields: indicator
  (select; changing it moves the check), nameEn, nameAr, sortOrder.
  409 "Arabic name is already used by another check in this indicator" /
  "English name is already used by another check in this indicator".
- Info text: changes apply to new trip inspections only; past inspections keep
  their copy of names and order.

For the trips feature (Story 11), export from index.ts: InspectionIndicator,
InspectionCheck types and useInspectionChecklist() (query key
['inspection-checklist']).
```

---

## Acceptance criteria

```text
- [ ] /inspection-checklist shows the 3 seeded indicators with 16 checks in
      API order.
- [ ] Create / edit / delete an indicator; duplicate names show the API
      message; sortOrder outside 0–1000 is caught before sending.
- [ ] Deleting an indicator with checks shows the 409 message.
- [ ] Add / edit / delete a check; moving a check to another indicator works.
- [ ] Sidebar item visible to admins only.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 03 (authentication; `NavItem.adminOnly` filtering).
- Backend Story 09 (implemented).

## Out of scope

- Drag-and-drop ordering, bulk edit, tests. Roles are not enforced by the API; hiding the nav item is cosmetic.
