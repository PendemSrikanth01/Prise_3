-- Preserve onboarding evidence history while allowing obsolete versions to be hidden safely.
ALTER TABLE "OnboardingDocument" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "OnboardingDocument_archivedAt_idx" ON "OnboardingDocument"("archivedAt");
