-- Enable Row-Level Security on all public tables.
-- No permissive policies are added for anon/authenticated roles,
-- so Supabase REST API access is fully blocked.
-- The postgres role (used by Prisma via DATABASE_URL) bypasses RLS.

ALTER TABLE "Manager" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContestPick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Standing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DraftSlot" ENABLE ROW LEVEL SECURITY;
