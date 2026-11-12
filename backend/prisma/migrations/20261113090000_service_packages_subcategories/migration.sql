-- Wedding services: subcategories, provider-suggested categories (need approval) and provider packages

-- AlterTable: categories get a de-duplication key (existing rows are back-filled), an approval flag and a creator
ALTER TABLE "ServiceCategory" ADD COLUMN "createdById" TEXT,
ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "key" TEXT;
UPDATE "ServiceCategory" SET "key" = COALESCE(NULLIF(lower(regexp_replace("name", '[^a-zA-Z0-9]+', '', 'g')), ''), "slug");
ALTER TABLE "ServiceCategory" ALTER COLUMN "key" SET NOT NULL;

-- CreateTable
CREATE TABLE "ServiceSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "photos" TEXT[],
    "includes" TEXT[],
    "duration" TEXT,
    "details" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ServiceProviderToServiceSubcategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ServiceProviderToServiceSubcategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSubcategory_categoryId_key_key" ON "ServiceSubcategory"("categoryId", "key");

-- CreateIndex
CREATE INDEX "ServicePackage_providerId_sortOrder_idx" ON "ServicePackage"("providerId", "sortOrder");

-- CreateIndex
CREATE INDEX "_ServiceProviderToServiceSubcategory_B_index" ON "_ServiceProviderToServiceSubcategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_key_key" ON "ServiceCategory"("key");

-- AddForeignKey
ALTER TABLE "ServiceSubcategory" ADD CONSTRAINT "ServiceSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceProviderToServiceSubcategory" ADD CONSTRAINT "_ServiceProviderToServiceSubcategory_A_fkey" FOREIGN KEY ("A") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceProviderToServiceSubcategory" ADD CONSTRAINT "_ServiceProviderToServiceSubcategory_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceSubcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
