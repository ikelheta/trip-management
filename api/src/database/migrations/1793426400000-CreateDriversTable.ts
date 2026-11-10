import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDriversTable1793426400000 implements MigrationInterface {
  name = 'CreateDriversTable1793426400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "drivers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name" character varying(256) NOT NULL,
        "identity_id" character varying(50) NOT NULL,
        "nationality_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_92ab3fb69e566d3eb0cae896047" PRIMARY KEY ("id"),
        CONSTRAINT "FK_drivers_nationality_id" FOREIGN KEY ("nationality_id")
          REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_drivers_vehicle_id" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_drivers_identity_id" ON "drivers" ("identity_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_drivers_nationality_id" ON "drivers" ("nationality_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_drivers_vehicle_id" ON "drivers" ("vehicle_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_drivers_vehicle_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_drivers_nationality_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_drivers_identity_id"`);
    await queryRunner.query(`DROP TABLE "drivers"`);
  }
}
