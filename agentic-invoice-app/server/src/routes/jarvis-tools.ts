import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Webhook endpoint for ElevenLabs Conversational AI tools
// This will be called by Jarvis when it needs real-time invoice data

// Get invoice portfolio summary
router.post('/get-portfolio-summary', async (req, res) => {
  try {
    console.log('🤖 Jarvis requesting portfolio summary...');
    
    const [totalCount, pendingCount, approvedCount, exceptionCount, totalAmountResult] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'pending' } }),
      prisma.invoice.count({ 
        where: { status: { in: ['approved', 'approved_ready_for_payment'] } } 
      }),
      prisma.invoice.count({ where: { hasIssues: true } }),
      prisma.invoice.aggregate({ _sum: { amount: true } })
    ]);

    const summary = {
      totalInvoices: totalCount,
      pendingInvoices: pendingCount,
      approvedInvoices: approvedCount,
      exceptionsCount: exceptionCount,
      totalAmount: totalAmountResult._sum.amount || 0,
      approvalRate: totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : '0',
      exceptionRate: totalCount > 0 ? ((exceptionCount / totalCount) * 100).toFixed(1) : '0'
    };

    console.log('📊 Returning portfolio summary to Jarvis:', summary);

    res.json({
      result: `Portfolio Summary: ${totalCount} total invoices worth $${summary.totalAmount.toLocaleString()}. ${pendingCount} pending, ${approvedCount} approved (${summary.approvalRate}% approval rate), ${exceptionCount} exceptions requiring attention (${summary.exceptionRate}% exception rate).`
    });

  } catch (error) {
    console.error('Error getting portfolio summary for Jarvis:', error);
    res.status(500).json({
      error: 'Unable to retrieve portfolio data at this time'
    });
  }
});

// Get specific invoice details
router.post('/get-invoice-details', async (req, res) => {
  try {
    const { invoiceNumber, invoiceId } = req.body;
    console.log(`🤖 Jarvis requesting invoice details for: ${invoiceNumber || invoiceId}`);

    if (!invoiceNumber && !invoiceId) {
      return res.status(400).json({
        error: 'Please provide either invoiceNumber or invoiceId'
      });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: invoiceId },
          { invoiceNumber: { contains: invoiceNumber } }
        ]
      },
      include: {
        vendor: true
      }
    });

    if (!invoice) {
      return res.json({
        result: `Invoice ${invoiceNumber || invoiceId} not found in the system. Please verify the invoice number.`
      });
    }

    const formattedAmount = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(invoice.amount);

    const daysOld = Math.floor((Date.now() - invoice.receivedDate.getTime()) / (1000 * 60 * 60 * 24));

    let statusDescription = '';
    switch (invoice.status) {
      case 'pending':
        statusDescription = 'pending processing';
        break;
      case 'approved':
        statusDescription = 'approved and ready for payment';
        break;
      case 'approved_ready_for_payment':
        statusDescription = 'approved and ready for payment';
        break;
      case 'pending_approval':
        statusDescription = 'pending approval';
        break;
      case 'rejected':
        statusDescription = 'rejected';
        break;
      default:
        statusDescription = invoice.status;
    }

    const result = `Invoice ${invoice.invoiceNumber} from ${invoice.vendor?.name || 'Unknown Vendor'} for ${formattedAmount} is currently ${statusDescription}. Received ${daysOld} days ago.${invoice.hasIssues ? ' This invoice has been flagged for review due to validation issues.' : ''}${invoice.agentReasoning ? ` AI Analysis: ${invoice.agentReasoning}` : ''}`;

    console.log('📄 Returning invoice details to Jarvis');

    res.json({ result });

  } catch (error) {
    console.error('Error getting invoice details for Jarvis:', error);
    res.status(500).json({
      error: 'Unable to retrieve invoice details at this time'
    });
  }
});

// Get invoices by status
router.post('/get-invoices-by-status', async (req, res) => {
  try {
    const { status } = req.body;
    console.log(`🤖 Jarvis requesting invoices with status: ${status}`);

    let whereClause: any = {};
    let statusFilter = status?.toLowerCase() || '';

    if (statusFilter.includes('pending') && !statusFilter.includes('approval')) {
      whereClause.status = 'pending';
    } else if (statusFilter.includes('approval') || statusFilter.includes('pending approval')) {
      whereClause.status = 'pending_approval';
    } else if (statusFilter.includes('approved') && !statusFilter.includes('approval')) {
      whereClause.status = { in: ['approved', 'approved_ready_for_payment'] };
    } else if (statusFilter.includes('exception') || statusFilter.includes('issue')) {
      whereClause.hasIssues = true;
    } else if (statusFilter.includes('ready')) {
      whereClause.status = 'approved_ready_for_payment';
    } else if (statusFilter.includes('rejected')) {
      whereClause.status = 'rejected';
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: { vendor: true },
      orderBy: { receivedDate: 'desc' },
      take: 10
    });

    if (invoices.length === 0) {
      return res.json({
        result: `No invoices found with status "${status}". All invoices may be processed or you may need to check different status criteria.`
      });
    }

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const formattedTotal = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(totalAmount);

    let result = `Found ${invoices.length} invoice${invoices.length > 1 ? 's' : ''} with status "${status}" totaling ${formattedTotal}.`;

    if (invoices.length <= 3) {
      const invoiceList = invoices.map(inv => 
        `${inv.invoiceNumber} from ${inv.vendor?.name || 'Unknown'} for $${inv.amount.toLocaleString()}`
      ).join(', ');
      result += ` They are: ${invoiceList}.`;
    } else {
      result += ` Recent ones include: ${invoices.slice(0, 3).map(inv => 
        `${inv.invoiceNumber} ($${inv.amount.toLocaleString()})`
      ).join(', ')}.`;
    }

    console.log(`📋 Returning ${invoices.length} invoices to Jarvis`);

    res.json({ result });

  } catch (error) {
    console.error('Error getting invoices by status for Jarvis:', error);
    res.status(500).json({
      error: 'Unable to retrieve invoices at this time'
    });
  }
});

// Get urgent/overdue invoices
router.post('/get-urgent-invoices', async (req, res) => {
  try {
    console.log('🤖 Jarvis requesting urgent invoices...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const urgentInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { status: 'pending', receivedDate: { lt: thirtyDaysAgo } },
          { hasIssues: true },
          { status: 'requires_review' }
        ]
      },
      include: { vendor: true },
      orderBy: { receivedDate: 'asc' },
      take: 10
    });

    if (urgentInvoices.length === 0) {
      return res.json({
        result: 'Excellent! No urgent invoices requiring immediate attention. Your portfolio is well-managed.'
      });
    }

    const totalAmount = urgentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const formattedTotal = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(totalAmount);

    let result = `Found ${urgentInvoices.length} invoice${urgentInvoices.length > 1 ? 's' : ''} requiring urgent attention, totaling ${formattedTotal}. `;

    const overdueInvoices = urgentInvoices.filter(inv => inv.receivedDate < thirtyDaysAgo);
    const exceptionInvoices = urgentInvoices.filter(inv => inv.hasIssues);

    if (overdueInvoices.length > 0) {
      result += `${overdueInvoices.length} are overdue (over 30 days). `;
    }
    if (exceptionInvoices.length > 0) {
      result += `${exceptionInvoices.length} have validation exceptions. `;
    }

    if (urgentInvoices.length <= 3) {
      const urgentList = urgentInvoices.map(inv => {
        const daysOld = Math.floor((Date.now() - inv.receivedDate.getTime()) / (1000 * 60 * 60 * 24));
        return `${inv.invoiceNumber} from ${inv.vendor?.name || 'Unknown'} (${daysOld} days old)`;
      }).join(', ');
      result += `Priority items: ${urgentList}.`;
    }

    console.log(`🚨 Returning ${urgentInvoices.length} urgent invoices to Jarvis`);

    res.json({ result });

  } catch (error) {
    console.error('Error getting urgent invoices for Jarvis:', error);
    res.status(500).json({
      error: 'Unable to retrieve urgent invoices at this time'
    });
  }
});

// Get recent invoice activity
router.post('/get-recent-activity', async (req, res) => {
  try {
    console.log('🤖 Jarvis requesting recent activity...');

    const recentInvoices = await prisma.invoice.findMany({
      include: { vendor: true },
      orderBy: { receivedDate: 'desc' },
      take: 5
    });

    if (recentInvoices.length === 0) {
      return res.json({
        result: 'No recent invoice activity found in the system.'
      });
    }

    const totalAmount = recentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const formattedTotal = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(totalAmount);

    let result = `Recent activity shows ${recentInvoices.length} invoices totaling ${formattedTotal}. `;

    const recentList = recentInvoices.map(inv => {
      const daysAgo = Math.floor((Date.now() - inv.receivedDate.getTime()) / (1000 * 60 * 60 * 24));
      return `${inv.invoiceNumber} from ${inv.vendor?.name || 'Unknown'} for $${inv.amount.toLocaleString()} (${daysAgo} days ago, ${inv.status})`;
    }).join('; ');

    result += `Recent invoices: ${recentList}.`;

    console.log(`📈 Returning recent activity to Jarvis`);

    res.json({ result });

  } catch (error) {
    console.error('Error getting recent activity for Jarvis:', error);
    res.status(500).json({
      error: 'Unable to retrieve recent activity at this time'
    });
  }
});

export default router;