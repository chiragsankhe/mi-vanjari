-- Years of experience / years in business can have decimals (e.g. 2.5)
ALTER TABLE "Profile" ALTER COLUMN "experienceYears" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "businessYears" SET DATA TYPE DOUBLE PRECISION;
