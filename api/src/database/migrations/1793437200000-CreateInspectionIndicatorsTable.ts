import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInspectionIndicatorsTable1793437200000 implements MigrationInterface {
  name = 'CreateInspectionIndicatorsTable1793437200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inspection_indicators" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name_ar" character varying(256) NOT NULL,
        "name_en" character varying(256) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_4c2fa7080879a3b837bc783ac8e" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inspection_indicators_name_ar" ON "inspection_indicators" ("name_ar") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inspection_indicators_name_en" ON "inspection_indicators" ("name_en") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inspection_indicators_name_en"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inspection_indicators_name_ar"`,
    );
    await queryRunner.query(`DROP TABLE "inspection_indicators"`);
  }
}
