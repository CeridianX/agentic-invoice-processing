import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all vendors
router.get('/', async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        _count: {
          select: {
            invoices: true,
            purchaseOrders: true
          }
        }
      }
    });

    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Get vendor by ID with statistics
router.get('/:id', async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        invoices: {
          orderBy: { receivedDate: 'desc' },
          take: 10
        },
        purchaseOrders: {
          orderBy: { createdDate: 'desc' },
          take: 10
        }
      }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Calculate statistics
    const stats = await prisma.invoice.aggregate({
      where: { vendorId: req.params.id },
      _avg: {
        variancePercentage: true,
        amount: true
      },
      _count: {
        _all: true
      }
    });

    res.json({
      ...vendor,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

export default router;