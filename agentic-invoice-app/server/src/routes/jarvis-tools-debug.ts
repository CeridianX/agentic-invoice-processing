import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Add logging middleware for all requests
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`🤖 [${timestamp}] Jarvis Tool Called: ${req.method} ${req.originalUrl}`);
  console.log(`📋 Headers:`, req.headers);
  console.log(`📦 Body:`, req.body);
  next();
});

// Get highest invoice amount specifically
router.post('/get-highest-invoice', async (req, res) => {
  try {
    console.log('🤖 Jarvis requesting highest invoice amount...');
    
    const highestInvoice = await prisma.invoice.findFirst({
      orderBy: { amount: 'desc' },
      include: { vendor: true }
    });

    if (!highestInvoice) {
      return res.json({
        result: 'No invoices found in the system.'
      });
    }

    const formattedAmount = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(highestInvoice.amount);

    const result = `The highest invoice amount in the system is ${formattedAmount} for invoice ${highestInvoice.invoiceNumber} from ${highestInvoice.vendor?.name || 'Unknown Vendor'}.`;

    console.log('💰 Returning highest invoice to Jarvis:', result);

    res.json({ 
      result,
      debug: {
        invoiceId: highestInvoice.id,
        amount: highestInvoice.amount,
        vendor: highestInvoice.vendor?.name,
        invoiceNumber: highestInvoice.invoiceNumber
      }
    });

  } catch (error) {
    console.error('Error getting highest invoice for Jarvis:', error);
    res.status(500).json({
      error: 'Unable to retrieve highest invoice at this time'
    });
  }
});

// Enhanced portfolio summary with more detailed breakdown
router.post('/get-detailed-portfolio', async (req, res) => {
  try {
    console.log('🤖 Jarvis requesting detailed portfolio...');
    
    const [
      invoices,
      totalAmountResult,
      highestInvoice,
      lowestInvoice
    ] = await Promise.all([
      prisma.invoice.findMany({
        include: { vendor: true },
        orderBy: { amount: 'desc' }
      }),
      prisma.invoice.aggregate({ _sum: { amount: true } }),
      prisma.invoice.findFirst({ orderBy: { amount: 'desc' } }),
      prisma.invoice.findFirst({ orderBy: { amount: 'asc' } })
    ]);

    const totalCount = invoices.length;
    const totalAmount = totalAmountResult._sum.amount || 0;
    const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    const statusGroups = invoices.reduce((acc: any, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});

    const result = `Detailed Portfolio Analysis: ${totalCount} total invoices worth ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}. Highest: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(highestInvoice?.amount || 0)}. Average: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(avgAmount)}. Status breakdown: ${Object.entries(statusGroups).map(([status, count]) => `${status}: ${count}`).join(', ')}.`;

    console.log('📊 Returning detailed portfolio to Jarvis:', result);

    res.json({ 
      result,
      debug: {
        totalCount,
        totalAmount,
        highestAmount: highestInvoice?.amount,
        lowestAmount: lowestInvoice?.amount,
        avgAmount,
        statusGroups
      }
    });

  } catch (error) {
    console.error('Error getting detailed portfolio for Jarvis:', error);
    res.status(500).json({
      error: 'Unable to retrieve detailed portfolio at this time'
    });
  }
});

// Test endpoint to verify Jarvis is calling our tools
router.post('/test-call', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`🧪 [${timestamp}] JARVIS TEST CALL RECEIVED!`);
  console.log('🧪 This confirms Jarvis can reach our webhook endpoints');
  
  res.json({
    result: `Test successful! Jarvis called this endpoint at ${timestamp}. The webhook system is working correctly.`,
    debug: {
      timestamp,
      requestHeaders: req.headers,
      requestBody: req.body,
      serverTime: Date.now()
    }
  });
});

export default router;