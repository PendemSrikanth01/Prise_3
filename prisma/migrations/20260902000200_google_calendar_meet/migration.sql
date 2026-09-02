CREATE TYPE "CalendarSyncStatus" AS ENUM ('NOT_CONNECTED', 'SYNCED', 'ERROR');

CREATE TABLE "GoogleCalendarConnection" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "googleAccountEmail" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT NOT NULL,
  "scopes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Session"
ADD COLUMN "calendarConnectionId" TEXT,
ADD COLUMN "calendarSyncStatus" "CalendarSyncStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
ADD COLUMN "calendarSyncError" TEXT,
ADD COLUMN "calendarSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "GoogleCalendarConnection_personId_key" ON "GoogleCalendarConnection"("personId");
CREATE INDEX "GoogleCalendarConnection_googleAccountEmail_idx" ON "GoogleCalendarConnection"("googleAccountEmail");
CREATE INDEX "Session_calendarConnectionId_idx" ON "Session"("calendarConnectionId");

ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_calendarConnectionId_fkey" FOREIGN KEY ("calendarConnectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
