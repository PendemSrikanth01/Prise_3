CREATE TYPE "AttendanceMode" AS ENUM ('OFFLINE', 'ONLINE', 'ABSENT');

CREATE UNIQUE INDEX "Session_externalEventId_key" ON "Session"("externalEventId");

CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "mode" "AttendanceMode" NOT NULL,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceRecord_sessionId_startupId_key" ON "AttendanceRecord"("sessionId", "startupId");
CREATE INDEX "AttendanceRecord_startupId_mode_idx" ON "AttendanceRecord"("startupId", "mode");
CREATE INDEX "AttendanceRecord_sessionId_mode_idx" ON "AttendanceRecord"("sessionId", "mode");
CREATE INDEX "AttendanceRecord_recordedById_createdAt_idx" ON "AttendanceRecord"("recordedById", "createdAt");

ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
