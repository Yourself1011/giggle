-- CreateTable
CREATE TABLE "Site" (
    "url" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Term" (
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TermsOnSites" (
    "termName" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "frequency" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TermsOnSites_pkey" PRIMARY KEY ("termName","siteUrl")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_url_key" ON "Site"("url");

-- CreateIndex
CREATE INDEX "Site_url_idx" ON "Site" USING HASH ("url");

-- CreateIndex
CREATE UNIQUE INDEX "Term_name_key" ON "Term"("name");

-- CreateIndex
CREATE INDEX "Term_name_idx" ON "Term" USING HASH ("name");

-- AddForeignKey
ALTER TABLE "TermsOnSites" ADD CONSTRAINT "TermsOnSites_termName_fkey" FOREIGN KEY ("termName") REFERENCES "Term"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsOnSites" ADD CONSTRAINT "TermsOnSites_siteUrl_fkey" FOREIGN KEY ("siteUrl") REFERENCES "Site"("url") ON DELETE CASCADE ON UPDATE CASCADE;
