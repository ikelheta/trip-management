import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTripInspectionResultsTable1793448000000 implements MigrationInterface {
  name = 'CreateTripInspectionResultsTable1793448000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trip_inspection_results" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "inspection_id" uuid NOT NULL,
        "check_id" uuid NOT NULL,
        "status" boolean NOT NULL,
        "note" character varying(500),
        "indicator_id" uuid NOT NULL,
        "indicator_name_ar" character varying(256) NOT NULL,
        "indicator_name_en" character varying(256) NOT NULL,
        "indicator_sort_order" integer NOT NULL,
        "check_name_ar" character varying(256) NOT NULL,
        "check_name_en" character varying(256) NOT NULL,
        "check_sort_order" integer NOT NULL,
        CONSTRAINT "PK_7dfe93d27919a7836115d6989ca" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_inspection_results_inspection_id" FOREIGN KEY ("inspection_id")
          REFERENCES "trip_inspections"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trip_inspection_results_check_id" FOREIGN KEY ("check_id")
          REFERENCES "inspection_checks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_trip_inspection_results_inspection_id_check_id" ON "trip_inspection_results" ("inspection_id", "check_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trip_inspection_results_check_id" ON "trip_inspection_results" ("check_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_trip_inspection_results_check_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_trip_inspection_results_inspection_id_check_id"`,
    );
    await queryRunner.query(`DROP TABLE "trip_inspection_results"`);
  }
}
