-- Event tablosuna "kim ekledi" sütunu. Neon SQL Editor'da çalıştırın.
-- Böylece her kullanıcı sadece kendi eklediği / atandığı etkinlikleri görür.

ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
