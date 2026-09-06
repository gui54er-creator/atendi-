-- DropForeignKey
ALTER TABLE "custom_field_values" DROP CONSTRAINT "custom_field_values_patientId_fkey";

-- DropForeignKey
ALTER TABLE "patient_records" DROP CONSTRAINT "patient_records_patientId_fkey";

-- DropIndex
DROP INDEX "custom_field_values_customFieldId_patientId_key";

-- DropIndex
DROP INDEX "custom_field_values_patientWorkplaceId_idx";

-- DropIndex
DROP INDEX "patient_records_patientId_key";

-- AlterTable
ALTER TABLE "appointment_series" ALTER COLUMN "workplaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "workplaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "custom_field_values" DROP COLUMN "patientId",
ALTER COLUMN "patientWorkplaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "patient_files" ALTER COLUMN "workplaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "patient_records" DROP COLUMN "patientId",
ALTER COLUMN "patientWorkplaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "firstVisitDate",
DROP COLUMN "howFoundUs",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "workplaceId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_customFieldId_patientWorkplaceId_key" ON "custom_field_values"("customFieldId", "patientWorkplaceId");

