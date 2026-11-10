-- Chat with business / wedding-service owners: enquiry conversations don't need a follow.
ALTER TABLE "Conversation" ADD COLUMN "enquiry" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Conversation" ADD COLUMN "contextType" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "contextId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "contextTitle" TEXT;
