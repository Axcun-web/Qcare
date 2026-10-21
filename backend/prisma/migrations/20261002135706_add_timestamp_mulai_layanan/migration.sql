-- AlterTable
ALTER TABLE "antrean" ADD COLUMN     "timestamp_mulai_layanan" TIMESTAMPTZ;

-- Until now timestamp_kedatangan was written on SEDANG_DILAYANI, so existing
-- values are really service-start times. Move them to the new column and
-- reset arrival to unknown (NULL) rather than keep a wrong arrival time.
UPDATE "antrean"
SET "timestamp_mulai_layanan" = "timestamp_kedatangan",
    "timestamp_kedatangan" = NULL
WHERE "timestamp_kedatangan" IS NOT NULL;
