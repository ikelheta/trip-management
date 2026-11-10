# Story 11 — Generate a QR code with the trip's url and id after the trip is created

## Prerequisites

- **Story 08 completed:** [08-story-trip-management-api.md](08-story-trip-management-api.md) — trips with passengers (`src/modules/trips/`).
- **Story 10 completed:** [10-story-send-pre-trip-inspection-with-trip.md](10-story-send-pre-trip-inspection-with-trip.md) — `TripsService.create` writes trip, passengers and inspection in one transaction. This story adds a step **after** that transaction.
- **Story 02 completed:** [../files/02-story-shared-file-management-api.md](../files/02-story-shared-file-management-api.md) — `FilesService.upload` and the `/api/files/:id/download` route that serves the QR image.
- Intake: [../../stories/trips/generate-trip-qr-code-after-creation/intake.md](../../stories/trips/generate-trip-qr-code-after-creation/intake.md).
- Local PostgreSQL with all migrations applied (latest: `1793448000000-CreateTripInspectionResultsTable`) and a seeded checklist (`npm run seed`) — runtime verification only.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

Every new trip gets a QR code.

1. After `POST /api/trips` commits, the API renders a **PNG QR code** whose content is the trip's full url `<TRIP_QR_BASE_URL>/<trip id>` (plain text, so a phone camera opens it directly; the id is the last path segment), stores it through `FilesService.upload` (`ownerType: "trips"`, `ownerId: trip id`), and saves the file's download path in a new nullable column `trips.qr_code_url`.
2. Every trip response includes `qrCodeUrl` (`"/api/files/<file id>/download"`), or `null` when the trip has none.
3. Generation on create is **best effort**: a failure is logged and `POST /trips` still returns **201** with `qrCodeUrl: null`.
4. `POST /api/trips/:id/qr-code` (re)generates the QR code for an existing trip, soft-deletes the previous QR file, and returns the trip. Errors reach the client here.
5. New env var `TRIP_QR_BASE_URL` (default `http://localhost:3000/api/trips`).

**Not in scope:** a public trip page behind the url, signing the QR content, putting `secretCode` or passengers in it, backfilling old trips, deleting the QR file on trip delete, client-chosen formats/sizes, authorization, tests.

**Hard constraints for the executor:**

- Controller → Service → Repository; entities are mapped to `TripResponseDto` in the controller.
- The trips module uses the files module **only** through `FilesModule` / `FilesService` (and the `FileEntity` **type** if needed). Never `FilesRepository`, `STORAGE_PROVIDER` or anything under `files/storage/` (rule from `FilesService`'s doc comment, `src/modules/files/files.service.ts` ~lines 36–45).
- `FilesModule` must not import `TripsModule` (it does not today; keep it that way).
- `qrCodeUrl` is **not** added to `CreateTripDto`, so `UpdateTripDto` (built from it) does not accept it either; `forbidNonWhitelisted` rejects it with 400.
- ESM: relative imports end in `.js`; constructor-injected classes are value imports.
- One hand-written migration; `migration:generate` must report no drift afterwards.

---

## Context — Read These Files First

1. `src/modules/trips/trips.service.ts` — constructor (~lines 23–30), `create` (~lines 51–73: the transaction returns `tripId`, then `return this.findOne(tripId)`), `findOne` (~lines 42–49), `remove` (~lines 111–116).
2. `src/modules/trips/trips.controller.ts` — `create` (~lines 30–35), `update` (~lines 57–69), `remove` (~lines 71–77): decorators and `TripResponseDto.fromEntity` mapping to copy for the new route.
3. `src/modules/trips/entities/trip.entity.ts` — `time` column (~lines 52–54); `inspection` non-column property (~lines 59–61). The new column goes between them.
4. `src/modules/trips/dto/trip-response.dto.ts` — fields (~lines 1–21), `fromEntity` (~lines 22–41).
5. `src/modules/trips/trips.module.ts` — `imports` (~lines 14–19).
6. `src/modules/files/files.service.ts` — `UploadableFile` (~lines 22–26: `Pick<Express.Multer.File, 'originalname' | 'mimetype' | 'buffer'>`, so a plain object with a `Buffer` works), `upload` (~lines 63–110: size limit, **allowed MIME types from `FILE_ALLOWED_MIME_TYPES`**, saves bytes then the row), `findByUrl` (~lines 126–134), `remove` (~lines 151–154).
7. `src/modules/files/entities/file.entity.ts` — `url` set by `@AfterInsert`/`@AfterLoad` (~lines 42–48), so the entity returned by `upload` already has `url`.
8. `src/modules/companies/companies.service.ts` — the file-link pattern to copy: `Logger` field (~line 32), `linkImages` (~lines 158–175: post-write failure only logged), `removeImageQuietly` (~lines 177–189).
9. `src/modules/companies/entities/company.entity.ts` — ~lines 29–33: `header_url varchar(512) NULL`, the column shape to copy.
10. `src/config/env.validation.ts` — `EnvironmentVariables` (~lines 25–88); `FILES_*` entries show the style (decorators + default value).
11. `src/modules/files/files.service.ts` ~lines 52–61 — how a service reads config: `ConfigService<EnvironmentVariables, true>` + `config.get(..., { infer: true })` in the constructor.
12. `src/database/migrations/1793448000000-CreateTripInspectionResultsTable.ts` — latest migration; the new timestamp must be larger.
13. `tsconfig.json` — `module: nodenext`, `esModuleInterop: true`: `qrcode` is CommonJS, so use its **default** import.

---

## Implementation tasks

### 1 — Dependency and configuration

```bash
npm install qrcode
npm install -D @types/qrcode
```

**File: `src/config/env.validation.ts`** — add `IsUrl` to the `class-validator` import and, after `FILE_ALLOWED_MIME_TYPES`:

```ts
  // Trip QR codes encode `${TRIP_QR_BASE_URL}/${trip.id}`. require_tld: false allows localhost.
  @IsUrl({ require_tld: false, require_protocol: true })
  TRIP_QR_BASE_URL: string = 'http://localhost:3000/api/trips';
```

**File: `.env.example`** — append:

```dotenv

TRIP_QR_BASE_URL=http://localhost:3000/api/trips
```

### 2 — Column and migration

**File: `src/modules/trips/entities/trip.entity.ts`** — after `time` (before `passengers`):

```ts
  // Download path of the QR code file (FilesService). Null until it is generated.
  @Column({ name: 'qr_code_url', type: 'varchar', length: 512, nullable: true })
  qrCodeUrl: string | null;
```

**New file: `src/database/migrations/1793451600000-AddQrCodeUrlToTrips.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQrCodeUrlToTrips1793451600000 implements MigrationInterface {
  name = 'AddQrCodeUrlToTrips1793451600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "qr_code_url" character varying(512)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "qr_code_url"`);
  }
}
```

### 3 — QR rendering helper

**New file: `src/modules/trips/trip-qr-code.ts`** (plain functions, like `src/modules/files/file-url.ts`):

```ts
import QRCode from 'qrcode';

/** The url a trip's QR code opens; the trip id is its last path segment. */
export function toTripQrUrl(baseUrl: string, tripId: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${tripId}`;
}

// Plain url text (no JSON) so phone cameras open it directly.
export function renderTripQrCode(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });
}
```

### 4 — Trips service

**File: `src/modules/trips/trips.service.ts`**

- Add `Logger` to the `@nestjs/common` import; import `ConfigService` from `@nestjs/config`, `type EnvironmentVariables` from `../../config/env.validation.js`, `FilesService` from `../files/files.service.js`, and `renderTripQrCode, toTripQrUrl` from `./trip-qr-code.js`.
- Above the class: `const FILE_OWNER_TYPE = 'trips';`
- Fields and constructor (inject `FilesService` and `config` last):

```ts
  private readonly logger = new Logger(TripsService.name);
  private readonly qrBaseUrl: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly tripsRepository: TripsRepository,
    private readonly passengersRepository: PassengersRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
    private readonly tripInspectionsService: TripInspectionsService,
    private readonly filesService: FilesService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.qrBaseUrl = config.get('TRIP_QR_BASE_URL', { infer: true });
  }
```

- `create`: between the transaction and `return this.findOne(tripId);`:

```ts
    // The trip is committed; a failed QR code is only logged (POST /trips/:id/qr-code retries).
    await this.createQrCode(tripId).catch((error: unknown) => {
      this.logger.error(
        `Failed to generate the QR code of trip ${tripId}`,
        error instanceof Error ? error.stack : error,
      );
    });
```

- New public method after `update`:

```ts
  /** Generates a new QR code and soft-deletes the previous one. */
  async regenerateQrCode(id: string): Promise<Trip> {
    const trip = await this.findOne(id);
    await this.createQrCode(trip.id);
    if (trip.qrCodeUrl) {
      await this.removeQrCodeQuietly(trip.qrCodeUrl);
    }
    return this.findOne(id);
  }
```

- New private methods after `attachInspections`:

```ts
  // Uploads a PNG of the trip's url as a "trips" file and stores the file's url on the trip.
  private async createQrCode(tripId: string): Promise<void> {
    const file = await this.filesService.upload(
      {
        originalname: `trip-${tripId}-qr.png`,
        mimetype: 'image/png',
        buffer: await renderTripQrCode(toTripQrUrl(this.qrBaseUrl, tripId)),
      },
      FILE_OWNER_TYPE,
      tripId,
    );
    if (!(await this.tripsRepository.update(tripId, { qrCodeUrl: file.url }))) {
      throw new NotFoundException(`Trip ${tripId} not found`);
    }
  }

  // The trip row is the source of truth; an old file that fails to delete is only logged.
  private async removeQrCodeQuietly(url: string): Promise<void> {
    const file = await this.filesService.findByUrl(url);
    if (!file) {
      return;
    }
    await this.filesService.remove(file.id).catch((error: unknown) => {
      this.logger.error(
        `Failed to remove trip QR code file ${file.id}`,
        error instanceof Error ? error.stack : error,
      );
    });
  }
```

### 5 — Module, DTO and controller

**File: `src/modules/trips/trips.module.ts`** — import `FilesModule` from `../files/files.module.js` and add it to `imports` after `TripInspectionsModule`. (`ConfigModule` is global in `app.module.ts`, no import needed.)

**File: `src/modules/trips/dto/trip-response.dto.ts`** — after `time`:

```ts
  /**
   * Download path of the trip's QR code (PNG of the trip's url); null until generated.
   * @example "/api/files/9b2c7c1e-6f0a-4c9e-9a51-0f4f3b8d2a10/download"
   */
  qrCodeUrl: string | null;
```

and in `fromEntity`, after `time: trip.time,`: `qrCodeUrl: trip.qrCodeUrl,`

**File: `src/modules/trips/trips.controller.ts`** — update the `create` JSDoc to `/** Create a trip with an existing vehicle and driver, and its passengers. Generates its QR code. */` and add after `update`:

```ts
  /** Generate a new QR code for the trip; the previous QR file is deleted. */
  @Post(':id/qr-code')
  @HttpCode(HttpStatus.OK)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async regenerateQrCode(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TripResponseDto> {
    return TripResponseDto.fromEntity(
      await this.tripsService.regenerateQrCode(id),
    );
  }
```

### 6 — Plans

- Trips [00-overview.md](00-overview.md) row for Story 11 and a status note; [../00-index.md](../00-index.md) trips NN `08, 10, 11`.

---

## Edge Cases & Failure Modes

- **QR content:** the plain url `<base>/<uuid>`, about 70 bytes with the default base — far below QR capacity (2331 bytes at level M). Phone cameras recognise it as a link and open it. Apps that need the id take the last path segment. With the default base the camera opens the API's JSON (`GET /api/trips/:id`); point `TRIP_QR_BASE_URL` at a front-end page when one exists.
- **Trailing slash in `TRIP_QR_BASE_URL`** → stripped (`replace(/\/+$/, '')`). **Invalid url / no protocol** → the app refuses to boot with `Invalid environment variables`.
- **`image/png` missing from `FILE_ALLOWED_MIME_TYPES`** → `upload` throws 415: on create it is logged and `qrCodeUrl` is `null`; on `POST /trips/:id/qr-code` the client gets **415**.
- **Storage or DB failure while uploading** → `FilesService.upload` removes orphan bytes itself; on create it is logged, trip returned with `qrCodeUrl: null`.
- **Upload succeeded but saving `qr_code_url` failed** (trip deleted in between) → an orphan `trips` file remains, owned by that trip id; logged on create, **404** on regenerate. Accepted.
- **`updatedAt`** of a new trip is a few ms later than `createdAt` (the QR url is a second write). Accepted.
- **Trip created, QR failed, client never retries** → `qrCodeUrl: null` until `POST /trips/:id/qr-code`.
- **Regenerate**: unknown/soft-deleted trip → **404**; non-uuid → **400**; new file is written **before** the old one is removed, so a failure never leaves the trip without a code. Two concurrent regenerates → last write wins, the other new file stays orphaned (owned by the trip). Accepted.
- **`qrCodeUrl` in POST/PATCH body** → **400** `property qrCodeUrl should not exist`.
- **PATCH** never changes the QR code (the id is fixed). **Changing `TRIP_QR_BASE_URL`** does not touch existing codes; regenerate them per trip.
- **Trip delete** keeps the QR file (soft delete, unreachable through the trip), like the inspection.
- **Trips created before this story** → `qrCodeUrl: null` in every response.
- **List** reads `qr_code_url` from the trip row: no extra query.
- **Security:** the QR contains no `secretCode` and no passenger data. The download route has no auth yet (`FilesService.assertCanAccess` is a stub); unchanged by this story.

---

## Test Plan

No automated tests (project rule). Manual smoke tests against a running app with a seeded checklist (`BASE=http://localhost:3000/api`), reusing Story 10 Test Plan step 1's create body.

1. **Create:** `POST $BASE/trips` → **201**, `qrCodeUrl` matches `/api/files/<uuid>/download`.
2. **Download:** `curl -o qr.png http://localhost:3000<qrCodeUrl>` → `Content-Type: image/png`; decode it (e.g. `zbarimg qr.png`) → exactly `http://localhost:3000/api/trips/<trip id>`; a phone camera shows it as a link; the url returns the trip.
3. **Read:** `GET $BASE/trips/:id` and `GET $BASE/trips` → every trip has `qrCodeUrl` (null for trips created before the migration).
4. **Read-only field:** `POST $BASE/trips` with `"qrCodeUrl":"x"` → **400**; `PATCH $BASE/trips/:id` `{"qrCodeUrl":null}` → **400**.
5. **PATCH unchanged:** `PATCH $BASE/trips/:id` `{"tripName":"Renamed"}` → **200**, same `qrCodeUrl`.
6. **Regenerate:** `POST $BASE/trips/:id/qr-code` → **200**, new `qrCodeUrl`; `GET` on the old url → **404**. Random uuid → **404**; `abc` → **400**. Also for a trip with `qrCodeUrl: null` → **200**, url set.
7. **Base url change:** restart with `TRIP_QR_BASE_URL=https://trips.example.com/t/`, regenerate → decoded url is `https://trips.example.com/t/<id>` (no double slash).
8. **Best effort:** restart with `FILE_ALLOWED_MIME_TYPES=application/pdf`; `POST $BASE/trips` → **201**, `qrCodeUrl: null`, log shows `Failed to generate the QR code of trip …`; `POST $BASE/trips/:id/qr-code` → **415**. Restore the env.
9. **Bad config:** `TRIP_QR_BASE_URL=not-a-url` → app fails at boot with `Invalid environment variables`.
10. **Regression:** Story 10 Test Plan steps 1–9 still pass (responses now carry `qrCodeUrl`).

---

## Migration / Rollback

- **Up:** `npm run migration:run` adds nullable `trips.qr_code_url`; existing rows get `NULL`. No backfill.
- **Rollback:** `npm run migration:revert` drops the column, then revert the code and `npm uninstall qrcode @types/qrcode`. QR files already uploaded stay in `files` / storage as `ownerType: "trips"` rows; delete them with `DELETE /api/files/:id` if needed.

---

## Verification Steps

1. **Backend builds:** `npm run build` → no errors.
2. **Lint:** `npm run lint` → no errors.
3. **Migration:** `npm run migration:run` → `AddQrCodeUrlToTrips1793451600000` executed; `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found".
4. **Boundaries:** `grep -rn "files/" src/modules/trips --include=*.ts` → only `trips.module.ts` (`FilesModule`) and `trips.service.ts` (`FilesService`). `grep -rn "trips" src/modules/files --include=*.ts` → only comments.
5. **Backend runs:** `npm run start:dev` → `Mapped {/api/trips/:id/qr-code, POST}`; Test Plan steps 1–10 pass.

---

## Done Criteria

**Implemented 2026-10-31.** Verified: build, lint, `tsc --noEmit`, migration run + no schema drift, boundaries (step 4), Test Plan steps 1–9. QR content was checked by re-rendering the expected url with `renderTripQrCode` and comparing PNG bytes with the downloaded file (identical). Step 10 (full Story 10 regression) was not re-run; creating with an inspection and PATCH were exercised. The code matches the task blocks above; `src/` is the source of truth.

- [x] `qrcode` (^1.5.4) and `@types/qrcode` (^1.5.6) installed; `TRIP_QR_BASE_URL` validated and in `.env.example`.
- [x] Migration `1793451600000-AddQrCodeUrlToTrips` adds `trips.qr_code_url varchar(512) NULL`; no drift.
- [x] `POST /trips` generates a PNG QR code of the plain trip url `<TRIP_QR_BASE_URL>/<trip id>`, stores it via `FilesService` (`ownerType: "trips"`), and returns `qrCodeUrl`; a QR failure is logged and does not fail the create.
- [x] Every trip response includes `qrCodeUrl`; clients cannot set it.
- [x] `POST /trips/:id/qr-code` regenerates the code and soft-deletes the previous file.
- [x] Trips uses only `FilesModule` / `FilesService` from the files module.
- [x] Trips overview and `00-index.md` updated.
- [x] `npm run build` and `npm run lint` pass; no test files.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 12.**
