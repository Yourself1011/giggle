/*
  Warnings:

  - Added the required column `pageRank` to the `Site` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "crawled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pageRank" DOUBLE PRECISION NOT NULL;
