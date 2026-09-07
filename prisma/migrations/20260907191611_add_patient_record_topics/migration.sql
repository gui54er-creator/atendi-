-- CreateTable
CREATE TABLE "patient_record_topics" (
    "id" TEXT NOT NULL,
    "patientWorkplaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_record_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_record_topics_patientWorkplaceId_order_idx" ON "patient_record_topics"("patientWorkplaceId", "order");

-- AddForeignKey
ALTER TABLE "patient_record_topics" ADD CONSTRAINT "patient_record_topics_patientWorkplaceId_fkey" FOREIGN KEY ("patientWorkplaceId") REFERENCES "patient_workplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
