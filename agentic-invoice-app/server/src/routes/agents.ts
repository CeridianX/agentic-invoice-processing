import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AgentZeroService } from '../agent-zero/AgentZeroService';

const router = Router();
const prisma = new PrismaClient();

// Use the global Agent Zero instance
function getAgentZero(): AgentZeroService | null {
  return (global as any).agentZeroInstance || null;
}

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

// Agent Zero specific endpoints

// Get Agent Zero status
router.get('/agent-zero/status', async (req, res) => {
  try {
    const agentZeroInstance = getAgentZero();
    if (!agentZeroInstance) {
      return res.json({ 
        status: 'not_initialized',
        message: 'Agent Zero is still starting up'
      });
    }
    const status = await agentZeroInstance.getAgentStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting Agent Zero status:', error);
    res.status(500).json({ error: 'Failed to get Agent Zero status' });
  }
});

// Get Agent Zero processing insights
router.get('/agent-zero/insights', async (req, res) => {
  try {
    const agentZeroInstance = getAgentZero();
    const insights = await agentZeroInstance.getProcessingInsights();
    res.json(insights);
  } catch (error) {
    console.error('Error getting Agent Zero insights:', error);
    res.status(500).json({ error: 'Failed to get Agent Zero insights' });
  }
});

// Manually trigger Agent Zero processing for a specific invoice
router.post('/agent-zero/process/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Get the invoice with related data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        vendor: true,
        purchaseOrder: true,
        agentActivities: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const agentZeroInstance = getAgentZero();
    const result = await agentZeroInstance.processInvoice(invoice);
    
    res.json({
      success: true,
      invoiceId,
      result
    });
  } catch (error) {
    console.error('Error processing invoice with Agent Zero:', error);
    res.status(500).json({ error: 'Failed to process invoice with Agent Zero' });
  }
});

// Trigger learning from feedback
router.post('/agent-zero/learn', async (req, res) => {
  try {
    const { experience } = req.body;
    
    const agentZeroInstance = getAgentZero();
    await agentZeroInstance.triggerLearning(experience);
    
    res.json({
      success: true,
      message: 'Learning experience processed'
    });
  } catch (error) {
    console.error('Error triggering Agent Zero learning:', error);
    res.status(500).json({ error: 'Failed to trigger learning' });
  }
});

// Get learning insights
router.get('/agent-zero/learning/insights', async (req, res) => {
  try {
    const agentZeroInstance = getAgentZero();
    const insights = await agentZeroInstance.getLearningInsights();
    
    res.json({
      success: true,
      insights
    });
  } catch (error) {
    console.error('Error getting learning insights:', error);
    res.status(500).json({ error: 'Failed to get learning insights' });
  }
});

// Get adaptation recommendations
router.get('/agent-zero/learning/adaptations', async (req, res) => {
  try {
    const agentZeroInstance = getAgentZero();
    const adaptations = await agentZeroInstance.getAdaptationRecommendations();
    
    res.json({
      success: true,
      adaptations
    });
  } catch (error) {
    console.error('Error getting adaptation recommendations:', error);
    res.status(500).json({ error: 'Failed to get adaptation recommendations' });
  }
});

// Apply an adaptation
router.post('/agent-zero/learning/adaptations/:id/apply', async (req, res) => {
  try {
    const { id } = req.params;
    
    const agentZeroInstance = getAgentZero();
    const success = await agentZeroInstance.applyAdaptation(id);
    
    res.json({
      success,
      message: success ? 'Adaptation applied successfully' : 'Failed to apply adaptation'
    });
  } catch (error) {
    console.error('Error applying adaptation:', error);
    res.status(500).json({ error: 'Failed to apply adaptation' });
  }
});

// Record user feedback for learning
router.post('/agent-zero/learning/feedback', async (req, res) => {
  try {
    const { feature, rating, comments, context } = req.body;
    
    if (!feature || rating === undefined) {
      return res.status(400).json({ error: 'Feature and rating are required' });
    }
    
    const agentZeroInstance = getAgentZero();
    await agentZeroInstance.triggerLearning({
      type: 'user_feedback',
      context: {
        feature,
        ...context
      },
      outcome: {},
      feedback: {
        rating,
        comments
      },
      confidence: 1.0
    });
    
    res.json({
      success: true,
      message: 'Feedback recorded for learning'
    });
  } catch (error) {
    console.error('Error recording user feedback:', error);
    res.status(500).json({ error: 'Failed to record user feedback' });
  }
});

export default router;