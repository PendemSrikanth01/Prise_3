CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "phase" INTEGER,
    "externalUrl" TEXT,
    "storageKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploaderId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Resource_isArchived_createdAt_idx" ON "Resource"("isArchived", "createdAt");
CREATE INDEX "Resource_category_phase_idx" ON "Resource"("category", "phase");
CREATE INDEX "Resource_uploaderId_idx" ON "Resource"("uploaderId");

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_uploaderId_fkey"
FOREIGN KEY ("uploaderId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
