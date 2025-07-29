ALTER TABLE "user_plan" ADD COLUMN "paymentId" integer;
-- Optionally, add a foreign key constraint if you want strict referential integrity:
-- ALTER TABLE "user_plan" ADD CONSTRAINT "fk_userplan_payment" FOREIGN KEY ("paymentId") REFERENCES "payment"(id) ON DELETE SET NULL;
