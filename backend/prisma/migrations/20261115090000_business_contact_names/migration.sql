-- Business: name of the person for each contact number
ALTER TABLE "Business" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Business" ADD COLUMN "extraNames" TEXT[] DEFAULT ARRAY[]::TEXT[];
