import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFilesTable1793408400000 implements MigrationInterface {
  name = 'CreateFilesTable1793408400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "files" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "owner_type" character varying(50) NOT NULL,
        "owner_id" uuid NOT NULL,
        "original_name" character varying(255) NOT NULL,
        "storage_key" character varying(64) NOT NULL,
        "mime_type" character varying(255) NOT NULL,
        "size_bytes" integer NOT NULL,
        "checksum" character(64) NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_files_storage_key" ON "files" ("storage_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_files_owner_type_owner_id" ON "files" ("owner_type", "owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_files_owner_type_owner_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_files_storage_key"`);
    await queryRunner.query(`DROP TABLE "files"`);
  }
}
