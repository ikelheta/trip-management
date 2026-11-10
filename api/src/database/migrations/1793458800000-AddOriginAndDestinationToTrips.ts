import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginAndDestinationToTrips1793458800000
  implements MigrationInterface
{
  name = 'AddOriginAndDestinationToTrips1793458800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "origin" character varying(256)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "destination" character varying(256)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "destination"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "origin"`);
  }
}
