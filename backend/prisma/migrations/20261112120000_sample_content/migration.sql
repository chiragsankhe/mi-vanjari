-- Sample content (admin can add / remove it): marks profiles that are samples
ALTER TABLE "Profile" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
