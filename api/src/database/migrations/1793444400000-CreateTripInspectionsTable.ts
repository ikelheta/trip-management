import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTripInspectionsTable1793444400000 implements MigrationInterface {
  name = 'CreateTripInspectionsTable1793444400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trip_inspections" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "trip_id" uuid NOT NULL,
        "inspected_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_ae569055e24c9c32c28866aa9ca" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_inspections_trip_id" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_trip_inspections_trip_id" ON "trip_inspections" ("trip_id") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_trip_inspections_trip_id"`,
    );
    await queryRunner.query(`DROP TABLE "trip_inspections"`);
  }
}
