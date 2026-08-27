CREATE TYPE "MatchPreferenceSource" AS ENUM ('MENTOR', 'INCUBATEE');

CREATE TABLE "MentorMatchPreference" (
    "id" TEXT NOT NULL,
    "source" "MatchPreferenceSource" NOT NULL,
    "mentorId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "note" TEXT,
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorMatchPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentorMatchPreference_source_mentorId_startupId_key"
ON "MentorMatchPreference"("source", "mentorId", "startupId");

CREATE INDEX "MentorMatchPreference_startupId_source_rank_idx"
ON "MentorMatchPreference"("startupId", "source", "rank");

CREATE INDEX "MentorMatchPreference_mentorId_source_rank_idx"
ON "MentorMatchPreference"("mentorId", "source", "rank");

ALTER TABLE "MentorMatchPreference"
ADD CONSTRAINT "MentorMatchPreference_mentorId_fkey"
FOREIGN KEY ("mentorId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorMatchPreference"
ADD CONSTRAINT "MentorMatchPreference_startupId_fkey"
FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorMatchPreference"
ADD CONSTRAINT "MentorMatchPreference_submittedById_fkey"
FOREIGN KEY ("submittedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
