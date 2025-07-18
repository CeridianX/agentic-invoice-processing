/*
  Warnings:

  - Added the required column `invoiceDate` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "assignedTo" TEXT,
    "poId" TEXT,
    "receivedDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "hasIssues" BOOLEAN NOT NULL DEFAULT false,
    "variancePercentage" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "createdAt", "currency", "dueDate", "hasIssues", "id", "invoiceNumber", "invoiceDate", "notes", "paymentTerms", "poId", "receivedDate", "status", "updatedAt", "variancePercentage", "vendorId") SELECT "amount", "createdAt", "currency", "dueDate", "hasIssues", "id", "invoiceNumber", "receivedDate", "notes", "paymentTerms", "poId", "receivedDate", "status", "updatedAt", "variancePercentage", "vendorId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
