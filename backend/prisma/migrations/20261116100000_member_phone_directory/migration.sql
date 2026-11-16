-- Members list: a member may choose to show their mobile number to other logged-in members
ALTER TABLE "Profile" ADD COLUMN "phoneInDirectory" BOOLEAN NOT NULL DEFAULT false;
