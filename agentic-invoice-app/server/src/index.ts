import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';

import invoiceRoutes from './routes/invoices';
import vendorRoutes from './routes/vendors';
import purchaseOrderRoutes from './routes/purchaseOrders';
import agentRoutes from './routes/agents';
import dashboardRoutes from './routes/dashboard';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// WebSocket connection for real-time agent updates
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send initial agent status
  ws.send(JSON.stringify({
    type: 'agent_status',
    data: {
      status: 'active',
      currentActivity: 'Monitoring invoice queue',
      processingCount: 0
    }
  }));

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start agent simulation
let agentInterval: NodeJS.Timeout;

async function simulateAgentActivity() {
  const clients = Array.from(wss.clients);
  if (clients.length === 0) return;

  try {
    // Get a random pending invoice
    const pendingInvoices = await prisma.invoice.findMany({
      where: { status: 'pending' },
      take: 5
    });

    if (pendingInvoices.length > 0) {
      const invoice = pendingInvoices[Math.floor(Math.random() * pendingInvoices.length)];
      
      // Create agent activity
      const activity = await prisma.agentActivity.create({
        data: {
          activityType: 'processing',
          description: `Processing invoice ${invoice.invoiceNumber}`,
          invoiceId: invoice.id,
          confidenceLevel: 0.85 + Math.random() * 0.15
        }
      });

      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: 'agent_activity',
        data: {
          activity,
          processingCount: pendingInvoices.length
        }
      });

      clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });

      // Sometimes update invoice status
      if (Math.random() > 0.7) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'processed' }
        });

        // Send status update
        const statusMessage = JSON.stringify({
          type: 'invoice_processed',
          data: { invoiceId: invoice.id }
        });

        clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(statusMessage);
          }
        });
      }
    }
  } catch (error) {
    console.error('Agent simulation error:', error);
  }
}

// Start agent simulation when server starts
server.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT || 3001}`);
  
  // Start agent simulation every 3-5 seconds
  agentInterval = setInterval(() => {
    simulateAgentActivity();
  }, 3000 + Math.random() * 2000);
});

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  clearInterval(agentInterval);
  server.close();
  prisma.$disconnect();
});