-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "config" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';
