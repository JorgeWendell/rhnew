DELETE FROM "punches" AS later
USING "punches" AS earlier
WHERE later.employee_id = earlier.employee_id
  AND later.type = earlier.type
  AND ((later.punched_at AT TIME ZONE 'America/Sao_Paulo')::date) = ((earlier.punched_at AT TIME ZONE 'America/Sao_Paulo')::date)
  AND (
    later.punched_at > earlier.punched_at
    OR (later.punched_at = earlier.punched_at AND later.id > earlier.id)
  );--> statement-breakpoint
CREATE UNIQUE INDEX "punches_employee_type_day_uidx" ON "punches" USING btree ("employee_id","type",(("punched_at" AT TIME ZONE 'America/Sao_Paulo')::date));