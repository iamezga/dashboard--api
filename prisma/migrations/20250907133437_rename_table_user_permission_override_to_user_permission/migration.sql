/*
  Warnings:

  - You are about to drop the `UserPermissionOverride` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."UserPermissionOverride" DROP CONSTRAINT "UserPermissionOverride_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserPermissionOverride" DROP CONSTRAINT "UserPermissionOverride_userId_fkey";

-- DropTable
DROP TABLE "public"."UserPermissionOverride";

-- CreateTable
CREATE TABLE "public"."UserPermission" (
    "userId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("userId","permissionId")
);

-- CreateIndex
CREATE INDEX "UserPermission_permissionId_idx" ON "public"."UserPermission"("permissionId");

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
