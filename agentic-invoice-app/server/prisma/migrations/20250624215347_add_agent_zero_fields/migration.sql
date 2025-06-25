-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "agentConfidence" REAL;
ALTER TABLE "Invoice" ADD COLUMN "agentProcessingCompleted" DATETIME;
ALTER TABLE "Invoice" ADD COLUMN "agentProcessingStarted" DATETIME;
ALTER TABLE "Invoice" ADD COLUMN "agentReasoning" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "learningImpact" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "processingTimeMs" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "scenario" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "workflowRoute" TEXT;
