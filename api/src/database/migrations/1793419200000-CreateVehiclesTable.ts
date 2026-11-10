import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVehiclesTable1793419200000 implements MigrationInterface {
  name = 'CreateVehiclesTable1793419200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "plate_number" character varying(50) NOT NULL,
        "model" character varying(256) NOT NULL,
        "type" character varying(256) NOT NULL,
        "company_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vehicles_company_id" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_vehicles_plate_number" ON "vehicles" ("plate_number") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicles_company_id" ON "vehicles" ("company_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_vehicles_company_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_vehicles_plate_number"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
  }
}
