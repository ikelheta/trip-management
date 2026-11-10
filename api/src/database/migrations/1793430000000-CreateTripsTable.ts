import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTripsTable1793430000000 implements MigrationInterface {
  name = 'CreateTripsTable1793430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trips" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "trip_name" character varying(256),
        "secret_code" character varying(50),
        "vehicle_id" uuid NOT NULL,
        "driver_id" uuid NOT NULL,
        "date" date NOT NULL,
        "time" TIME NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trips_vehicle_id" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_trips_driver_id" FOREIGN KEY ("driver_id")
          REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_vehicle_id" ON "trips" ("vehicle_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_driver_id" ON "trips" ("driver_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_date" ON "trips" ("date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_trips_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_trips_driver_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_trips_vehicle_id"`);
    await queryRunner.query(`DROP TABLE "trips"`);
  }
}
