-- Community / business / services members don't need matrimony details:
-- date of birth, gender, education and occupation become optional (required only for matrimony, enforced in the API).
ALTER TABLE "Profile" ALTER COLUMN "dateOfBirth" DROP NOT NULL;
ALTER TABLE "Profile" ALTER COLUMN "gender" DROP NOT NULL;
ALTER TABLE "Profile" ALTER COLUMN "education" DROP NOT NULL;
ALTER TABLE "Profile" ALTER COLUMN "occupation" DROP NOT NULL;
-- Contact email collected at sign-up
ALTER TABLE "Profile" ADD COLUMN "email" TEXT;
-- Wedding services: years of experience
ALTER TABLE "ServiceProvider" ADD COLUMN "experienceYears" INTEGER;
