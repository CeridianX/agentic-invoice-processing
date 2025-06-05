import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all purchase orders
router.get('/', async (req, res) => {
  try {
    const { vendorId, status } = req.query;
    
    const where: any = {};
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: true,
        _count: {
          select: {
            invoices: true,
            lineItems: true
          }
        }
      },
      orderBy: { createdDate: 'desc' }
    });

    res.json(purchaseOrders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// Get purchase order by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: true,
        lineItems: true,
        invoices: {
          include: {
            lineItems: true
          }
        },
        goodsReceipts: {
          include: {
            lineItems: true
          }
        }
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

export default router;