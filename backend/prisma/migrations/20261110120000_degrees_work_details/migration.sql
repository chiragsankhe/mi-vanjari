-- Multiple degrees + a free-text work description on profiles.
ALTER TABLE "Profile" ADD COLUMN "degrees" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Profile" ADD COLUMN "workDetails" TEXT;

-- Existing profiles: their single education text becomes the first degree.
UPDATE "Profile" SET "degrees" = jsonb_build_array(jsonb_build_object('degree', "education"))
WHERE "education" IS NOT NULL AND btrim("education") <> '';
