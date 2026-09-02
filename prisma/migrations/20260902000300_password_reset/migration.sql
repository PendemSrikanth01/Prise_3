CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "requestedIpHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_personId_createdAt_idx" ON "PasswordResetToken"("personId", "createdAt");
CREATE INDEX "PasswordResetToken_requestedIpHash_createdAt_idx" ON "PasswordResetToken"("requestedIpHash", "createdAt");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
