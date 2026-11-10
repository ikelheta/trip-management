import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractNumberToTrips1793462400000
  implements MigrationInterface
{
  name = 'AddContractNumberToTrips1793462400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "contract_number" character varying(20)`,
    );
    // Existing trips (deleted ones too): sequence per trip date in creation order.
    await queryRunner.query(`
      UPDATE "trips" AS t
      SET "contract_number" = numbered.value
      FROM (
        SELECT "id",
               to_char("date", 'YYYYMMDD') || '-' ||
               lpad(row_number() OVER (PARTITION BY "date" ORDER BY "created_at", "id")::text, 4, '0') AS value
        FROM "trips"
      ) AS numbered
      WHERE t."id" = numbered."id"
    `);
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "contract_number" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_trips_contract_number" ON "trips" ("contract_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_trips_contract_number"`);
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN "contract_number"`,
    );
  }
}
