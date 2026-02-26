-- MatchScout tablosuna otonom rota waypoint'leri (PathPlanner tarzı).
-- Neon SQL Editor'da çalıştırın.

ALTER TABLE "MatchScout"
ADD COLUMN IF NOT EXISTS "autonomous_route_waypoints" JSONB;
