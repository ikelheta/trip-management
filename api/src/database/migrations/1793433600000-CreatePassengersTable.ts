import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePassengersTable1793433600000 implements MigrationInterface {
  name = 'CreatePassengersTable1793433600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "passengers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "trip_id" uuid NOT NULL,
        "name" character varying(256) NOT NULL,
        "identity_number" character varying(50) NOT NULL,
        "doc_type" character varying(50) NOT NULL,
        "nationality" character varying(256) NOT NULL,
        CONSTRAINT "PK_9863c72acd866e4529f65c6c98c" PRIMARY KEY ("id"),
        CONSTRAINT "FK_passengers_trip_id" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_passengers_trip_id_identity_number" ON "passengers" ("trip_id", "identity_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_passengers_trip_id_identity_number"`,
    );
    await queryRunner.query(`DROP TABLE "passengers"`);
  }
}
