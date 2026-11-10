# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/companies/company-management-pages/intake.md`

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit.

---

## Feature

- **Feature name (display):** Companies
- **Feature slug (folder under `plans/`):** `companies`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `companies`, `backend-story-03`

---

## Title

```text
Company management pages: list, details with header/footer images, create, edit and delete
```

---

## Description

```text
Covers backend Story 03 (backend/contracts/companies.md).

API facts:
- GET /api/companies?page&limit&search -> Paginated<Company>, newest first;
  search matches name, registration number and city.
- Company { id, name, registrationNumber, city, address, whatsAppNumber,
  phoneNumber, headerUrl, footerUrl, createdAt, updatedAt }.
- POST: name, registrationNumber, city, address, whatsAppNumber, phoneNumber
  all trimmed 2–256; registrationNumber unique (409 "Registration number is
  already in use"); headerUrl / footerUrl optional, url from POST /api/files
  with ownerType "companies", JPEG/PNG/WebP, must be different files.
- PATCH: any subset. Image fields: new url replaces (old file deleted),
  null removes (file deleted), omitted keeps. null on a required field -> 400.
- DELETE -> 204 soft delete; the company's vehicles are not deleted.
- 404 "Company <id> not found".

Pages:
- /companies: paginated table (name, registration number, city, phone,
  WhatsApp) with search, New company button, Edit / Delete per row; name
  links to the details page.
- /companies/:id: details (all fields) with header and footer images
  (protected: AuthImage from the files feature), Edit and Delete.
- /companies/new and /companies/:id/edit: one form; images through
  ImageUploadField (upload-first, ownerType "companies"). On edit only
  changed image fields are sent (unchanged = omitted, removed = null).
- Delete asks for confirmation and mentions that vehicles stay.
- Sidebar item "Companies".
- For other stories (vehicles): export Company, useAllCompanies() (every
  company, for dropdowns) and CompanySelect (a <select> usable with
  react-hook-form register or as a controlled filter).
```

---

## Acceptance criteria

```text
- [ ] List paginates and searches (URL keeps page and search).
- [ ] Create with header image; details page shows it (no 401 in Network).
- [ ] Duplicate registration number -> "Registration number is already in use".
- [ ] Edit: removing the header sends headerUrl null; untouched images are not
      sent; replacing an image sends the new url.
- [ ] Delete from list and from details, with confirmation.
- [ ] CompanySelect lists all companies (more than 100 works).
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 02 (foundation), Story 03 (authentication), Story 05 (files: `ImageUploadField`, `AuthImage`).
- **Used by:** the vehicles story (`CompanySelect`, `useAllCompanies`, `Company`).

## Extra notes (optional)

- Abandoned image uploads stay unlinked on the server (see Story 05). Accepted.

## Out of scope

- Printing documents with header / footer, listing a company's vehicles on its page (vehicles story may add a link), restoring deleted companies, tests.
