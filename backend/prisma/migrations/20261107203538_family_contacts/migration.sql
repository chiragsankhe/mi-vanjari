-- CreateTable
CREATE TABLE "FamilyContact" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "relationLabel" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bestTime" TEXT,
    "languages" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyContact_profileId_idx" ON "FamilyContact"("profileId");

-- AddForeignKey
ALTER TABLE "FamilyContact" ADD CONSTRAINT "FamilyContact_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
