-- Structured mentor profiles support matching and workload decisions without a parallel directory.
CREATE TYPE "MentorMeetingMode" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID', 'FLEXIBLE');

ALTER TABLE "Person"
  ADD COLUMN "organization" TEXT,
  ADD COLUMN "designation" TEXT,
  ADD COLUMN "professionalBio" TEXT,
  ADD COLUMN "expertiseAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "preferredSectors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "maxStartupCapacity" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN "acceptingMentees" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "preferredMeetingMode" "MentorMeetingMode" NOT NULL DEFAULT 'FLEXIBLE',
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  ADD CONSTRAINT "Person_maxStartupCapacity_check" CHECK ("maxStartupCapacity" BETWEEN 1 AND 30);

CREATE TABLE "MentorAvailability" (
  "id" TEXT NOT NULL,
  "mentorId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "mode" "MentorMeetingMode" NOT NULL DEFAULT 'FLEXIBLE',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorAvailability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MentorAvailability_dayOfWeek_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  CONSTRAINT "MentorAvailability_minutes_check" CHECK ("startMinute" BETWEEN 0 AND 1439 AND "endMinute" BETWEEN 1 AND 1440 AND "endMinute" > "startMinute"),
  CONSTRAINT "MentorAvailability_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MentorAvailability_mentorId_dayOfWeek_startMinute_endMinute_key"
  ON "MentorAvailability"("mentorId", "dayOfWeek", "startMinute", "endMinute");
CREATE INDEX "MentorAvailability_mentorId_isActive_dayOfWeek_idx"
  ON "MentorAvailability"("mentorId", "isActive", "dayOfWeek");
