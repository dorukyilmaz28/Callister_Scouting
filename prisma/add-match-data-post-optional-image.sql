-- Takım feed'de metin paylaşımı: imageUrl opsiyonel yapılır.
-- Neon SQL Editor'da çalıştırın.

ALTER TABLE "MatchDataPost"
ALTER COLUMN "image_url" DROP NOT NULL;
