-- Defense in depth for login throttling and the append-only audit ledger.

CREATE INDEX "LoginAttempt_ipHash_createdAt_idx"
  ON "LoginAttempt"("ipHash", "createdAt");

CREATE OR REPLACE FUNCTION prevent_activity_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ActivityLog is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "ActivityLog_append_only"
BEFORE UPDATE OR DELETE ON "ActivityLog"
FOR EACH ROW EXECUTE FUNCTION prevent_activity_log_mutation();
