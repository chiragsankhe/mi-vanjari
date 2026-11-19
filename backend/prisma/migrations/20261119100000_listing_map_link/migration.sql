-- Listings: optional Google Maps link for the exact location
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "mapUrl" TEXT;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "mapUrl" TEXT;
