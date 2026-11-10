import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInspectionChecksTable1793440800000 implements MigrationInterface {
  name = 'CreateInspectionChecksTable1793440800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inspection_checks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "indicator_id" uuid NOT NULL,
        "name_ar" character varying(256) NOT NULL,
        "name_en" character varying(256) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_f0a7703d865e27eddb25390d4e2" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inspection_checks_indicator_id" FOREIGN KEY ("indicator_id")
          REFERENCES "inspection_indicators"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inspection_checks_indicator_id_name_ar" ON "inspection_checks" ("indicator_id", "name_ar") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inspection_checks_indicator_id_name_en" ON "inspection_checks" ("indicator_id", "name_en") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inspection_checks_indicator_id_name_en"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inspection_checks_indicator_id_name_ar"`,
    );
    await queryRunner.query(`DROP TABLE "inspection_checks"`);
  }
}
