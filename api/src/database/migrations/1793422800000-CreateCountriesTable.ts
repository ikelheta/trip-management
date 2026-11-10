import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCountriesTable1793422800000 implements MigrationInterface {
  name = 'CreateCountriesTable1793422800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "countries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name_ar" character varying(256) NOT NULL,
        "name_en" character varying(256) NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_b2d7006793e8697ab3ae2deff18" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_countries_name_ar" ON "countries" ("name_ar") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_countries_name_en" ON "countries" ("name_en") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_countries_name_en"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_countries_name_ar"`);
    await queryRunner.query(`DROP TABLE "countries"`);
  }
}
