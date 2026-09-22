-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'direct';

-- Ramat Negev region from the updated field roster
INSERT INTO "Region" ("uuid", "slug", "name", "subtitle", "code")
SELECT gen_random_uuid(), 'ramatnegev', 'רמת נגב', 'פיתחת ניצנה · חלוצה', 'RN'
WHERE NOT EXISTS (
  SELECT 1 FROM "Region" WHERE "slug" = 'ramatnegev'
);
