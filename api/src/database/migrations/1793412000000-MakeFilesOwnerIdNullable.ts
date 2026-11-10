import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeFilesOwnerIdNullable1793412000000 implements MigrationInterface {
  name = 'MakeFilesOwnerIdNullable1793412000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "owner_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Unlinked uploads cannot satisfy NOT NULL; their bytes stay in storage.
    await queryRunner.query(`DELETE FROM "files" WHERE "owner_id" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "owner_id" SET NOT NULL`,
    );
  }
}
