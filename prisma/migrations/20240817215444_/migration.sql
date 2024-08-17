/*
  Warnings:

  - The primary key for the `TermsOnSites` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `siteUrl` on the `TermsOnSites` table. All the data in the column will be lost.
  - You are about to drop the column `termName` on the `TermsOnSites` table. All the data in the column will be lost.
  - Added the required column `siteId` to the `TermsOnSites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `termId` to the `TermsOnSites` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TermsOnSites" DROP CONSTRAINT "TermsOnSites_siteUrl_fkey";

-- DropForeignKey
ALTER TABLE "TermsOnSites" DROP CONSTRAINT "TermsOnSites_termName_fkey";

-- AlterTable
ALTER TABLE "Site" ADD CONSTRAINT "Site_pkey" PRIMARY KEY ("order");

-- AlterTable
ALTER TABLE "Term" ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Term_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TermsOnSites" DROP CONSTRAINT "TermsOnSites_pkey",
DROP COLUMN "siteUrl",
DROP COLUMN "termName",
ADD COLUMN     "siteId" INTEGER NOT NULL,
ADD COLUMN     "termId" INTEGER NOT NULL,
ADD CONSTRAINT "TermsOnSites_pkey" PRIMARY KEY ("termId", "siteId");

-- AddForeignKey
ALTER TABLE "TermsOnSites" ADD CONSTRAINT "TermsOnSites_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsOnSites" ADD CONSTRAINT "TermsOnSites_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("order") ON DELETE CASCADE ON UPDATE CASCADE;
