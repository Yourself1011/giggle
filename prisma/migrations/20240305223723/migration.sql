-- CreateTable
CREATE TABLE "Link" (
    "incomingUrl" TEXT NOT NULL,
    "outgoingUrl" TEXT NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("incomingUrl","outgoingUrl")
);

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_incomingUrl_fkey" FOREIGN KEY ("incomingUrl") REFERENCES "Site"("url") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_outgoingUrl_fkey" FOREIGN KEY ("outgoingUrl") REFERENCES "Site"("url") ON DELETE RESTRICT ON UPDATE CASCADE;
