import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDemoData() {
  try {
    console.log('🧹 Clearing existing demo data...');

    // Delete in correct order due to foreign key constraints
    await prisma.matchingActivity.deleteMany();
    await prisma.exception.deleteMany();
    await prisma.agentActivity.deleteMany();
    await prisma.goodsReceiptLineItem.deleteMany();
    await prisma.goodsReceipt.deleteMany();
    await prisma.invoiceLineItem.deleteMany();
    await prisma.pOLineItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    
    // Keep vendors as they're needed for realistic demo
    console.log('✅ Cleared all invoice and related data');
    console.log('🏢 Kept vendor data for realistic demo scenarios');
    
    console.log('\n📊 Database ready for Agent Zero demo!');

  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDemoData();