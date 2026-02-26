-- Production DB'de eksik PitScout sütunlarını ekler.
-- Neon SQL Editor'da bu dosyayı açıp "Run" ile çalıştırın.

-- climb_system_description (tırmanma sistemi açıklaması)
ALTER TABLE "PitScout"
ADD COLUMN IF NOT EXISTS "climb_system_description" TEXT;
