-- Family phone numbers are shown only to followers the profile owner approved.
ALTER TABLE "Follow" ADD COLUMN "approvedByOwner" BOOLEAN NOT NULL DEFAULT false;

-- Existing data: requests accepted on a private profile were approved by hand.
UPDATE "Follow" f SET "approvedByOwner" = true
FROM "Profile" p
WHERE p."userId" = f."receiverId" AND p."accountType" = 'PRIVATE' AND f."status" = 'ACCEPTED';

-- Existing data: two members who follow each other approved one another.
UPDATE "Follow" f SET "approvedByOwner" = true
WHERE f."status" = 'ACCEPTED' AND EXISTS (
  SELECT 1 FROM "Follow" b WHERE b."senderId" = f."receiverId" AND b."receiverId" = f."senderId" AND b."status" = 'ACCEPTED'
);
