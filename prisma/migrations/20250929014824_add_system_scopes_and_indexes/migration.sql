/*
  Warnings:

  - Made the column `organizationId` on table `Role` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."OrganizationScope" AS ENUM ('TENANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."RoleScope" AS ENUM ('TENANT', 'SYSTEM');

-- AlterEnum
ALTER TYPE "public"."PermissionScope" ADD VALUE 'SYSTEM';

-- DropForeignKey
ALTER TABLE "public"."Role" DROP CONSTRAINT "Role_organizationId_fkey";

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "scope" "public"."OrganizationScope" NOT NULL DEFAULT 'TENANT';

-- AlterTable
ALTER TABLE "public"."Role" ADD COLUMN     "scope" "public"."RoleScope" NOT NULL DEFAULT 'TENANT',
ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Organization_scope_idx" ON "public"."Organization"("scope");

-- CreateIndex
CREATE INDEX "Role_scope_idx" ON "public"."Role"("scope");

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
