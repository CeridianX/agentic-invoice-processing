import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get queue status
router.get('/queue-status', async (req, res) => {
  try {
    const queuedCount = await prisma.invoice.count({
      where: { status: 'queued' }
    });
    
    const processingCount = await prisma.invoice.count({
      where: { status: 'processing' }
    });

    res.json({
      queued: queuedCount,
      processing: processingCount,
      total: queuedCount + processingCount
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// Get all invoices with filters
router.get('/', async (req, res) => {
  try {
    const { status, vendorId, hasIssues, sortBy = 'receivedDate', order = 'desc' } = req.query;
    
    const where: any = {
      // Exclude queued invoices from the main list - they should only appear during processing
      status: { not: 'queued' }
    };
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (hasIssues !== undefined) where.hasIssues = hasIssues === 'true';

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        vendor: true,
        purchaseOrder: true,
        exceptions: {
          where: { status: 'open' }
        },
        agentActivities: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      orderBy: { [sortBy as string]: order }
    });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: true,
        purchaseOrder: {
          include: {
            lineItems: true
          }
        },
        lineItems: {
          include: {
            poLineItem: true,
            matchingActivities: {
              orderBy: { matchedAt: 'desc' }
            }
          }
        },
        exceptions: true,
        agentActivities: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Update invoice status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status }
    });

    // Create agent activity
    await prisma.agentActivity.create({
      data: {
        activityType: 'status_update',
        description: `Invoice status updated to ${status}`,
        invoiceId: invoice.id,
        confidenceLevel: 1.0
      }
    });

    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// Create or update line item match
router.post('/:invoiceId/line-items/:lineItemId/match', async (req, res) => {
  try {
    const { invoiceId, lineItemId } = req.params;
    const { poLineItemId, matchType, confidenceScore, matchNotes } = req.body;

    // Update line item
    await prisma.invoiceLineItem.update({
      where: { id: lineItemId },
      data: {
        poLineItemId,
        matchStatus: matchType === 'exact' ? 'matched' : 'partial'
      }
    });

    // Create matching activity
    const matchingActivity = await prisma.matchingActivity.create({
      data: {
        invoiceLineItemId: lineItemId,
        poLineItemId,
        matchType,
        confidenceScore,
        matchedBy: 'user',
        matchNotes
      }
    });

    // Create agent activity
    await prisma.agentActivity.create({
      data: {
        activityType: 'line_item_matched',
        description: `Line item matched with ${confidenceScore * 100}% confidence`,
        invoiceId,
        confidenceLevel: confidenceScore,
        affectedLineItems: lineItemId
      }
    });

    res.json(matchingActivity);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// Get matching suggestions for a line item
router.get('/:invoiceId/line-items/:lineItemId/suggestions', async (req, res) => {
  try {
    const { lineItemId } = req.params;
    
    const lineItem = await prisma.invoiceLineItem.findUnique({
      where: { id: lineItemId },
      include: {
        invoice: {
          include: {
            purchaseOrder: {
              include: {
                lineItems: true
              }
            }
          }
        }
      }
    });

    if (!lineItem || !lineItem.invoice.purchaseOrder) {
      return res.json({ suggestions: [] });
    }

    // Find potential matches
    const poLineItems = lineItem.invoice.purchaseOrder.lineItems;
    const suggestions = poLineItems.map(poLine => {
      let confidenceScore = 0;
      const reasons = [];

      // Check item code match
      if (lineItem.itemCode && poLine.itemCode === lineItem.itemCode) {
        confidenceScore += 0.4;
        reasons.push('Item code matches');
      }

      // Check description similarity
      if (lineItem.description.toLowerCase().includes(poLine.description.toLowerCase()) ||
          poLine.description.toLowerCase().includes(lineItem.description.toLowerCase())) {
        confidenceScore += 0.3;
        reasons.push('Description similar');
      }

      // Check quantity match
      const quantityDiff = Math.abs(lineItem.quantity - poLine.quantityOrdered) / poLine.quantityOrdered;
      if (quantityDiff < 0.05) {
        confidenceScore += 0.2;
        reasons.push('Quantity matches');
      } else if (quantityDiff < 0.1) {
        confidenceScore += 0.1;
        reasons.push('Quantity close match');
      }

      // Check price match
      const priceDiff = Math.abs(lineItem.unitPrice - poLine.unitPrice) / poLine.unitPrice;
      if (priceDiff < 0.02) {
        confidenceScore += 0.1;
        reasons.push('Price matches');
      }

      return {
        poLineItem: poLine,
        confidenceScore,
        reasons,
        matchType: confidenceScore >= 0.9 ? 'exact' : 'fuzzy'
      };
    }).filter(s => s.confidenceScore > 0.3)
      .sort((a, b) => b.confidenceScore - a.confidenceScore);

    res.json({ suggestions });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Bulk approve invoices
router.post('/bulk-approve', async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    
    const invoices = await prisma.invoice.updateMany({
      where: {
        id: { in: invoiceIds },
        status: 'pending_approval'
      },
      data: { status: 'approved' }
    });

    // Create agent activities
    const activities = invoiceIds.map((id: string) => ({
      activityType: 'bulk_approval',
      description: 'Invoice approved in bulk operation',
      invoiceId: id,
      confidenceLevel: 1.0
    }));

    await prisma.agentActivity.createMany({
      data: activities
    });

    res.json({ updated: invoices.count });
  } catch (error) {
    console.error('Error bulk approving:', error);
    res.status(500).json({ error: 'Failed to bulk approve' });
  }
});

export default router;