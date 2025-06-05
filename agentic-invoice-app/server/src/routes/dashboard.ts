import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Invoice statistics by status
    const invoicesByStatus = await prisma.invoice.groupBy({
      by: ['status'],
      _count: {
        _all: true
      },
      _sum: {
        amount: true
      }
    });

    // Total metrics
    const totalMetrics = await prisma.invoice.aggregate({
      _count: {
        _all: true
      },
      _sum: {
        amount: true
      },
      _avg: {
        amount: true,
        variancePercentage: true
      }
    });

    // Exceptions count
    const openExceptions = await prisma.exception.count({
      where: { status: 'open' }
    });

    // Processing time saved (simulated)
    const processedCount = await prisma.invoice.count({
      where: { status: 'processed' }
    });
    const timeSaved = processedCount * 15; // 15 minutes per invoice

    // Recent activity
    const recentActivity = await prisma.agentActivity.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    // Vendor performance
    const vendorStats = await prisma.vendor.findMany({
      select: {
        name: true,
        trustLevel: true,
        _count: {
          select: {
            invoices: true
          }
        },
        invoices: {
          select: {
            hasIssues: true,
            variancePercentage: true
          }
        }
      },
      take: 5,
      orderBy: {
        invoices: {
          _count: 'desc'
        }
      }
    });

    const vendorPerformance = vendorStats.map(vendor => ({
      name: vendor.name,
      trustLevel: vendor.trustLevel,
      invoiceCount: vendor._count.invoices,
      issueRate: vendor.invoices.filter(inv => inv.hasIssues).length / vendor.invoices.length,
      averageVariance: vendor.invoices.reduce((sum, inv) => sum + (inv.variancePercentage || 0), 0) / vendor.invoices.length
    }));

    // Line item matching statistics
    const matchingStats = await prisma.invoiceLineItem.groupBy({
      by: ['matchStatus'],
      _count: {
        _all: true
      }
    });

    res.json({
      invoicesByStatus,
      totalMetrics,
      openExceptions,
      timeSaved,
      recentActivity,
      vendorPerformance,
      matchingStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get time series data for charts
router.get('/time-series', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

    // Get invoices grouped by date
    const invoices = await prisma.invoice.findMany({
      where: {
        receivedDate: {
          gte: startDate
        }
      },
      select: {
        receivedDate: true,
        amount: true,
        status: true,
        hasIssues: true
      },
      orderBy: {
        receivedDate: 'asc'
      }
    });

    // Group by date
    const dailyData: Record<string, any> = {};
    
    invoices.forEach(invoice => {
      const date = invoice.receivedDate.toISOString().split('T')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          totalAmount: 0,
          invoiceCount: 0,
          processedCount: 0,
          issueCount: 0
        };
      }
      
      dailyData[date].totalAmount += invoice.amount;
      dailyData[date].invoiceCount += 1;
      if (invoice.status === 'processed' || invoice.status === 'approved') {
        dailyData[date].processedCount += 1;
      }
      if (invoice.hasIssues) {
        dailyData[date].issueCount += 1;
      }
    });

    const timeSeriesData = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json(timeSeriesData);
  } catch (error) {
    console.error('Error fetching time series data:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

export default router;