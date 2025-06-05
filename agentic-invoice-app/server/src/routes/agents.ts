import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get recent agent activities
router.get('/activities', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const activities = await prisma.agentActivity.findMany({
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            vendor: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get agent insights
router.get('/insights', async (req, res) => {
  try {
    // Get processing statistics
    const processingStats = await prisma.agentActivity.groupBy({
      by: ['activityType'],
      _count: {
        _all: true
      },
      where: {
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    // Get confidence levels
    const confidenceStats = await prisma.agentActivity.aggregate({
      _avg: {
        confidenceLevel: true
      },
      where: {
        confidenceLevel: { not: null }
      }
    });

    // Get pattern insights
    const patterns = await prisma.vendor.findMany({
      select: {
        name: true,
        typicalVariancePattern: true,
        _count: {
          select: {
            invoices: {
              where: {
                hasIssues: true
              }
            }
          }
        }
      },
      where: {
        typicalVariancePattern: { not: null }
      }
    });

    // Get matching statistics
    const matchingStats = await prisma.matchingActivity.groupBy({
      by: ['matchType'],
      _count: {
        _all: true
      },
      _avg: {
        confidenceScore: true
      }
    });

    res.json({
      processingStats,
      averageConfidence: confidenceStats._avg.confidenceLevel,
      patterns,
      matchingStats
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// Get agent suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = [];

    // Find invoices ready for auto-approval
    const autoApprovable = await prisma.invoice.findMany({
      where: {
        status: 'pending_approval',
        hasIssues: false,
        variancePercentage: {
          lte: 2
        }
      },
      include: {
        vendor: true
      },
      take: 5
    });

    if (autoApprovable.length > 0) {
      suggestions.push({
        type: 'auto_approval',
        title: 'Invoices ready for auto-approval',
        description: `${autoApprovable.length} invoices match auto-approval criteria`,
        invoices: autoApprovable,
        confidence: 0.95
      });
    }

    // Find early payment discount opportunities
    const earlyPayment = await prisma.invoice.findMany({
      where: {
        status: 'approved',
        dueDate: {
          gte: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // Due in 10+ days
        }
      },
      include: {
        vendor: true
      },
      take: 5
    });

    if (earlyPayment.length > 0) {
      const totalSavings = earlyPayment.reduce((sum, inv) => sum + (inv.amount * 0.02), 0);
      suggestions.push({
        type: 'early_payment',
        title: 'Early payment discount opportunities',
        description: `Save $${totalSavings.toFixed(2)} with 2% early payment discount`,
        invoices: earlyPayment,
        confidence: 1.0
      });
    }

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

export default router;