-- CreateTable
CREATE TABLE "public"."Audit" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "user" JSONB NOT NULL,
    "resource" JSONB NOT NULL,
    "payload" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audit_timestamp_idx" ON "public"."Audit"("timestamp");

-- CreateIndex
CREATE INDEX "Audit_jobId_idx" ON "public"."Audit"("jobId");
