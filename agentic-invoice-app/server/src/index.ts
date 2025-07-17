import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

import invoiceRoutes from './routes/invoices';
import vendorRoutes from './routes/vendors';
import purchaseOrderRoutes from './routes/purchaseOrders';
import agentRoutes from './routes/agents';
import dashboardRoutes from './routes/dashboard';
import demoRoutes from './routes/demo';
import businessRulesRoutes from './routes/businessRules';
import communicationRoutes from './routes/communication';
// import voiceRoutes from './routes/voice';
// import jarvisRoutes from './routes/jarvis';
// import jarvisToolsRoutes from './routes/jarvis-tools';
// import jarvisToolsDebugRoutes from './routes/jarvis-tools-debug';

// Import Agent Zero
import { AgentZeroService } from './agent-zero/AgentZeroService';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const prisma = new PrismaClient();

// Initialize Agent Zero
let agentZero: AgentZeroService;
let agentInterval: NodeJS.Timeout;

// Import Agent Zero manager
import { AgentZeroManager } from './utils/AgentZeroManager';

// Initialize Agent Zero using the manager
const initializeAgentZero = async () => {
  try {
    console.log('🚀 Initializing Agent Zero via manager...');
    agentZero = await AgentZeroManager.getOrCreateInstance();
    setupAgentZeroListeners(); // Setup WebSocket listeners
    console.log('✅ Agent Zero initialized and listeners setup complete');
    
    // Broadcast initialization complete to all connected clients
    if (agentZero.isInitialized()) {
      try {
        const agentStatus = await agentZero.getAgentStatus();
        broadcastToClients({
          type: 'agent_zero_status',
          data: agentStatus
        });
        console.log('✅ Broadcasted Agent Zero ready status to all clients');
      } catch (error) {
        console.error('❌ Error broadcasting initial agent status:', error);
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize Agent Zero:', error);
  }
};

// Start Agent Zero initialization (with small delay to avoid blocking server startup)
setTimeout(initializeAgentZero, 100);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    agentZero: agentZero ? 'initializing' : 'not started'
  });
});


// Routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/business-rules', businessRulesRoutes);
app.use('/api/communication', communicationRoutes);
// app.use('/api/voice', voiceRoutes);
// app.use('/api/jarvis', jarvisRoutes);
// app.use('/api/jarvis-tools', jarvisToolsRoutes);
// app.use('/api/jarvis-debug', jarvisToolsDebugRoutes);

// Serve static files from frontend build
// Try multiple possible paths
const possiblePaths = [
  '/app/agentic-invoice-app/agentic-invoice-app/dist',
  path.join(__dirname, '../../agentic-invoice-app/dist'),
  path.join(__dirname, '../agentic-invoice-app/dist'),
  path.join(process.cwd(), 'agentic-invoice-app/agentic-invoice-app/dist'),
  path.join(process.cwd(), 'dist')
];

let frontendDistPath = possiblePaths[0]; // default

console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`__dirname: ${__dirname}`);
console.log(`process.cwd(): ${process.cwd()}`);
console.log('Checking possible frontend paths...');

for (const possiblePath of possiblePaths) {
  console.log(`Checking: ${possiblePath}`);
  if (fs.existsSync(possiblePath)) {
    frontendDistPath = possiblePath;
    console.log(`✅ Found frontend directory at: ${possiblePath}`);
    const files = fs.readdirSync(possiblePath);
    console.log(`Files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
    break;
  } else {
    console.log(`❌ Not found: ${possiblePath}`);
  }
}

console.log(`Using frontend path: ${frontendDistPath}`);
app.use(express.static(frontendDistPath));

// Handle React Router - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(frontendDistPath, 'index.html');
    console.log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).json({ 
          error: 'Frontend not found', 
          details: err.message,
          frontendPath: frontendDistPath,
          indexPath: indexPath,
          actualFrontendPath: frontendDistPath,
          dirname: __dirname,
          cwd: process.cwd()
        });
      }
    });
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// WebSocket connection for real-time Agent Zero updates
wss.on('connection', async (ws) => {
  console.log('Client connected');

  // Send initial Agent Zero status if available
  if (agentZero && agentZero.isInitialized && agentZero.isInitialized()) {
    try {
      const agentStatus = await agentZero.getAgentStatus();
      ws.send(JSON.stringify({
        type: 'agent_zero_status',
        data: agentStatus
      }));
    } catch (error) {
      console.error('Error getting agent status:', error);
    }
  } else {
    // Send a default status indicating Agent Zero is initializing
    ws.send(JSON.stringify({
      type: 'agent_zero_status',
      data: {
        status: 'initializing',
        agents: {
          'CoordinatorAgent': { status: 'initializing', currentTask: 'Starting up...', confidence: 0 },
          'DocumentProcessorAgent': { status: 'initializing', currentTask: 'Starting up...', confidence: 0 },
          'ValidationAgent': { status: 'initializing', currentTask: 'Starting up...', confidence: 0 },
          'WorkflowAgent': { status: 'initializing', currentTask: 'Starting up...', confidence: 0 }
        }
      }
    }));
  }

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Setup Agent Zero event listeners when ready
function setupAgentZeroListeners() {
  if (!agentZero) return;
  
  agentZero.on('processing_started', (data) => {
    broadcastToClients({
      type: 'agent_zero_processing_started',
      data
    });
  });

  agentZero.on('plan_created', (data) => {
    broadcastToClients({
      type: 'agent_zero_plan_created',
      data
    });
  });

  agentZero.on('coordinator_started', (data) => {
    broadcastToClients({
      type: 'agent_zero_coordinator_started',
      data
    });
  });

  agentZero.on('coordinator_completed', (data) => {
    broadcastToClients({
      type: 'agent_zero_coordinator_completed',
      data
    });
  });

  agentZero.on('step_started', (data) => {
    broadcastToClients({
      type: 'agent_zero_step_started',
      data
    });
  });

  agentZero.on('step_completed', (data) => {
    broadcastToClients({
      type: 'agent_zero_step_completed',
      data
    });
  });

  agentZero.on('processing_completed', (data) => {
    broadcastToClients({
      type: 'agent_zero_processing_completed',
      data
    });
  });

  agentZero.on('processing_error', (data) => {
    broadcastToClients({
      type: 'agent_zero_processing_error',
      data
    });
  });

  // Add invoice-specific events
  agentZero.on('invoice_created', (data) => {
    broadcastToClients({
      type: 'invoice_created',
      data
    });
  });

  agentZero.on('invoice_updated', (data) => {
    broadcastToClients({
      type: 'invoice_updated',
      data
    });
  });

  agentZero.on('invoice_processing_started', (data) => {
    broadcastToClients({
      type: 'invoice_processing_started',
      data
    });
  });

  agentZero.on('invoice_processing_completed', (data) => {
    broadcastToClients({
      type: 'invoice_processing_completed',
      data
    });
  });

  // Communication event listeners
  agentZero.on('communication_initiated', (data) => {
    broadcastToClients({
      type: 'communication_initiated',
      data
    });
  });

  agentZero.on('communication_sent', (data) => {
    broadcastToClients({
      type: 'communication_sent',
      data
    });
  });

  agentZero.on('communication_received', (data) => {
    broadcastToClients({
      type: 'communication_received',
      data
    });
  });

  agentZero.on('communication_resolved', (data) => {
    broadcastToClients({
      type: 'communication_resolved',
      data
    });
  });
}

function broadcastToClients(message: any) {
  const clients = Array.from(wss.clients);
  const openClients = clients.filter(client => client.readyState === 1);
  
  console.log(`📡 Broadcasting ${message.type} to ${openClients.length} connected clients`);
  
  openClients.forEach((client) => {
    try {
      client.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending WebSocket message to client:', error);
    }
  });
}

// Agent Zero intelligent processing
async function processInvoicesWithAgentZero() {
  try {
    // Get pending invoices that need Agent Zero processing
    const pendingInvoices = await prisma.invoice.findMany({
      where: { 
        status: 'pending',
        // Only process invoices that haven't been processed by Agent Zero yet
        agentActivities: {
          none: {
            activityType: 'processing_completed'
          }
        }
      },
      include: {
        vendor: true,
        purchaseOrder: true
      },
      take: 3 // Process in smaller batches for demo
    });

    if (pendingInvoices.length > 0) {
      console.log(`Agent Zero: Processing ${pendingInvoices.length} pending invoices`);
      
      // Process each invoice with Agent Zero
      for (const invoice of pendingInvoices) {
        try {
          console.log(`Agent Zero: Starting processing for invoice ${invoice.invoiceNumber}`);
          
          // Let Agent Zero intelligently process the invoice
          const result = await agentZero.processInvoice(invoice.id);
          
          console.log(`Agent Zero: Completed processing for invoice ${invoice.invoiceNumber}`, result);

          // Broadcast completion
          broadcastToClients({
            type: 'invoice_processed_by_agent_zero',
            data: { 
              invoiceId: invoice.id,
              result: {
                isValid: result.validation?.isValid || false,
                confidence: result.validation?.confidence || 0.8,
                approvalRequired: result.workflow?.approvalRequired || false,
                priority: result.workflow?.priority || 'normal',
                reasoning: result.validation?.issues?.[0] || 
                          result.agentInsights?.recommendations?.[0] || 
                          'Processing completed'
              }
            }
          });

        } catch (processingError) {
          console.error(`Agent Zero: Failed to process invoice ${invoice.id}:`, processingError);
          
          // Broadcast error
          broadcastToClients({
            type: 'agent_zero_processing_error',
            data: { 
              invoiceId: invoice.id,
              error: processingError.message
            }
          });
        }

        // Add delay between invoices to make the process visible
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error('Agent Zero processing cycle error:', error);
  }
}

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0';

console.log(`Starting server with PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV}`);

server.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`✅ Health check endpoint: http://${HOST}:${PORT}/health`);
  console.log(`✅ API endpoints available at http://${HOST}:${PORT}/api`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start Agent Zero processing cycle every 10 seconds (after initialization)
  setTimeout(() => {
    if (agentZero && agentZero.isInitialized()) {
      agentInterval = setInterval(() => {
        if (agentZero && agentZero.isInitialized()) {
          processInvoicesWithAgentZero().catch(err => {
            console.error('Agent Zero processing error:', err);
          });
        }
      }, 10000);
      
      console.log('Agent Zero processing cycle started');
    }
  }, 5000);
});

// Cleanup on server shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  clearInterval(agentInterval);
  
  try {
    if (agentZero && agentZero.shutdown) {
      await agentZero.shutdown();
      console.log('Agent Zero shutdown complete');
    }
  } catch (error) {
    console.error('Error shutting down Agent Zero:', error);
  }
  
  server.close();
  await prisma.$disconnect();
  console.log('Server shutdown complete');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});