-- Business: more than one contact number
ALTER TABLE "Business" ADD COLUMN "extraPhones" TEXT[] DEFAULT ARRAY[]::TEXT[];
