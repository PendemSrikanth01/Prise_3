ALTER TABLE "Startup" ADD COLUMN "fullAddress" TEXT;

DELETE FROM "MentorMatchPreference"
WHERE "rank" < 1 OR "rank" > 3;

ALTER TABLE "MentorMatchPreference"
ADD CONSTRAINT "MentorMatchPreference_rank_between_one_and_three"
CHECK ("rank" BETWEEN 1 AND 3);
