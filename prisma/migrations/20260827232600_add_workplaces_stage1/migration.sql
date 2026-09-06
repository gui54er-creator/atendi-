-- AlterTable
ALTER TABLE "appointment_series" ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "custom_field_values" ADD COLUMN     "patientWorkplaceId" TEXT;

-- AlterTable
ALTER TABLE "patient_files" ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "patient_records" ADD COLUMN     "patientWorkplaceId" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "workplaceId" TEXT;

-- CreateTable
CREATE TABLE "workplaces" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "cep" TEXT,
    "address" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "workplaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_workplaces" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "workplaceId" TEXT NOT NULL,
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "howFoundUs" TEXT,
    "notes" TEXT,
    "defaultProfessionalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_workplaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workplaces_companyId_idx" ON "workplaces"("companyId");

-- CreateIndex
CREATE INDEX "patient_workplaces_workplaceId_idx" ON "patient_workplaces"("workplaceId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_workplaces_patientId_workplaceId_key" ON "patient_workplaces"("patientId", "workplaceId");

-- CreateIndex
CREATE INDEX "custom_field_values_patientWorkplaceId_idx" ON "custom_field_values"("patientWorkplaceId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_records_patientWorkplaceId_key" ON "patient_records"("patientWorkplaceId");

-- AddForeignKey
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_workplaces" ADD CONSTRAINT "patient_workplaces_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_workplaces" ADD CONSTRAINT "patient_workplaces_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "workplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_workplaces" ADD CONSTRAINT "patient_workplaces_defaultProfessionalId_fkey" FOREIGN KEY ("defaultProfessionalId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_patientWorkplaceId_fkey" FOREIGN KEY ("patientWorkplaceId") REFERENCES "patient_workplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_patientWorkplaceId_fkey" FOREIGN KEY ("patientWorkplaceId") REFERENCES "patient_workplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_series" ADD CONSTRAINT "appointment_series_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "workplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "workplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_files" ADD CONSTRAINT "patient_files_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "workplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "workplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

