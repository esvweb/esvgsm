-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'IT_STAFF', 'FINANCE', 'VIEWER');

-- CreateEnum
CREATE TYPE "PersonUserType" AS ENUM ('SALES_AGENT', 'OFFICE_USER', 'HEAVY_DATA_USER');

-- CreateEnum
CREATE TYPE "LineStatus" AS ENUM ('ASSIGNED', 'IT_DEPOT', 'RESERVED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('IN_USE', 'IT_DEPOT', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssignmentAction" AS ENUM ('ASSIGNED', 'UNASSIGNED', 'PACKAGE_CHANGED', 'MOVED_TO_DEPOT', 'RESERVED', 'DEVICE_LINKED', 'DEVICE_UNLINKED');

-- CreateEnum
CREATE TYPE "BillBatchStatus" AS ENUM ('PROCESSING', 'REVIEW', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('OVER_LIST_PRICE');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'SENT', 'ACKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "department" TEXT,
    "userType" "PersonUserType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "listPriceTRY" DECIMAL(10,2) NOT NULL,
    "isAssignable" BOOLEAN NOT NULL DEFAULT true,
    "allowedUserTypes" "PersonUserType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GsmLine" (
    "id" TEXT NOT NULL,
    "msisdn" TEXT NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'Vodafone',
    "currentPackageId" TEXT NOT NULL,
    "status" "LineStatus" NOT NULL DEFAULT 'IT_DEPOT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GsmLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'IT_DEPOT',
    "assignedLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineAssignment" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "displayAsPersonId" TEXT,
    "packageId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "assignedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentLog" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "action" "AssignmentAction" NOT NULL,
    "fromPersonId" TEXT,
    "toPersonId" TEXT,
    "fromPackageId" TEXT,
    "toPackageId" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyBillBatch" (
    "id" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'Vodafone',
    "fileUrl" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "status" "BillBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyBillBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineBillRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "lineId" TEXT,
    "rawExtractedNumber" TEXT NOT NULL,
    "amountTRY" DECIMAL(10,2) NOT NULL,
    "matchedManually" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineBillRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "lineBillRecordId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'OVER_LIST_PRICE',
    "pctDiff" DECIMAL(6,2) NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "recipients" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Package_name_key" ON "Package"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GsmLine_msisdn_key" ON "GsmLine"("msisdn");

-- CreateIndex
CREATE UNIQUE INDEX "Device_imei_key" ON "Device"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "Device_assignedLineId_key" ON "Device"("assignedLineId");

-- CreateIndex
CREATE INDEX "LineAssignment_lineId_endDate_idx" ON "LineAssignment"("lineId", "endDate");

-- CreateIndex
CREATE INDEX "AssignmentLog_lineId_timestamp_idx" ON "AssignmentLog"("lineId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBillBatch_periodMonth_periodYear_operator_key" ON "MonthlyBillBatch"("periodMonth", "periodYear", "operator");

-- CreateIndex
CREATE INDEX "LineBillRecord_batchId_idx" ON "LineBillRecord"("batchId");

-- AddForeignKey
ALTER TABLE "GsmLine" ADD CONSTRAINT "GsmLine_currentPackageId_fkey" FOREIGN KEY ("currentPackageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_assignedLineId_fkey" FOREIGN KEY ("assignedLineId") REFERENCES "GsmLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineAssignment" ADD CONSTRAINT "LineAssignment_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "GsmLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineAssignment" ADD CONSTRAINT "LineAssignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineAssignment" ADD CONSTRAINT "LineAssignment_displayAsPersonId_fkey" FOREIGN KEY ("displayAsPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineAssignment" ADD CONSTRAINT "LineAssignment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineAssignment" ADD CONSTRAINT "LineAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "GsmLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_fromPackageId_fkey" FOREIGN KEY ("fromPackageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_toPackageId_fkey" FOREIGN KEY ("toPackageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyBillBatch" ADD CONSTRAINT "MonthlyBillBatch_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineBillRecord" ADD CONSTRAINT "LineBillRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MonthlyBillBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineBillRecord" ADD CONSTRAINT "LineBillRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "GsmLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_lineBillRecordId_fkey" FOREIGN KEY ("lineBillRecordId") REFERENCES "LineBillRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
