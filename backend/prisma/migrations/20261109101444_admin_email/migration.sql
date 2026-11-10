-- Admin login by email: users get an optional unique email; phone becomes optional
-- (an email-only admin account has no phone number).
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
