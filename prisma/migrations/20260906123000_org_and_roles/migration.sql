-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_uuid_key" ON "Organization"("uuid");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

INSERT INTO "Organization" ("uuid", "slug", "name")
SELECT gen_random_uuid(), 'vax-aqua', COALESCE(
  (SELECT "companyName" FROM "User" ORDER BY "id" ASC LIMIT 1),
  'אביזרי הולכת מים'
);

ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';
ALTER TABLE "User" ADD COLUMN "organizationId" INTEGER;

UPDATE "User"
SET
  "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'vax-aqua'),
  "role" = 'admin';

ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

ALTER TABLE "Customer" ADD COLUMN "organizationId" INTEGER;

UPDATE "Customer" c
SET "organizationId" = u."organizationId"
FROM "User" u
WHERE u."id" = c."userId";

UPDATE "Customer"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'vax-aqua')
WHERE "organizationId" IS NULL;

ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
