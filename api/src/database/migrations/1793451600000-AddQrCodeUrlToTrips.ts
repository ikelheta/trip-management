import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQrCodeUrlToTrips1793451600000 implements MigrationInterface {
  name = 'AddQrCodeUrlToTrips1793451600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "qr_code_url" character varying(512)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "qr_code_url"`);
  }
}
