-- AlterTable
ALTER TABLE "public"."Role" ADD COLUMN     "config" JSONB NOT NULL DEFAULT '{}';
