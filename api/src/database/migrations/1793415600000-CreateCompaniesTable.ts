import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompaniesTable1793415600000 implements MigrationInterface {
  name = 'CreateCompaniesTable1793415600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name" character varying(256) NOT NULL,
        "registration_number" character varying(256) NOT NULL,
        "city" character varying(256) NOT NULL,
        "address" character varying(256) NOT NULL,
        "whatsapp_number" character varying(256) NOT NULL,
        "phone_number" character varying(256) NOT NULL,
        "header_url" character varying(512),
        "footer_url" character varying(512),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_companies_registration_number" ON "companies" ("registration_number") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_companies_registration_number"`,
    );
    await queryRunner.query(`DROP TABLE "companies"`);
  }
}
