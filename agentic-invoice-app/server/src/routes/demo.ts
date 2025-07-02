import express from 'express';
import { SyntheticInvoiceGenerator } from '../demo/SyntheticInvoiceGenerator';
import { AgentZeroService } from '../agent-zero/AgentZeroService';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
let invoiceGenerator: SyntheticInvoiceGenerator | null = null;
let agentZeroService: AgentZeroService | null = null;

// Initialize services
const initializeServices = async () => {
  if (!invoiceGenerator) {
    invoiceGenerator = new SyntheticInvoiceGenerator();
  }
  if (!agentZeroService) {
    agentZeroService = AgentZeroService.getInstance();
  }
};

// Get available demo scenarios
router.get('/scenarios', async (req, res) => {
  try {
    await initializeServices();
    const scenarios = invoiceGenerator!.getAvailableScenarios();
    res.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// Create single invoice with specific scenario
router.post('/create-invoice/:scenario', async (req, res) => {
  try {
    await initializeServices();
    const { scenario } = req.params;
    const { customAmount, customVendor } = req.body;

    console.log(`🎬 Creating demo invoice with scenario: ${scenario}`);

    // Generate the invoice
    const invoice = await invoiceGenerator!.generateInvoice({
      scenario,
      customAmount,
      customVendor
    });

    // Emit invoice created event
    if (agentZeroService) {
      agentZeroService.emit('invoice_created', {
        invoice,
        scenario,
        timestamp: new Date()
      });
    }

    // Process with Agent Zero if service is available
    if (agentZeroService && agentZeroService.isInitialized()) {
      console.log(`🤖 Processing invoice ${invoice.invoiceNumber} with Agent Zero...`);
      
      // Emit processing started event
      agentZeroService.emit('invoice_processing_started', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        scenario,
        timestamp: new Date()
      });
      
      // Start Agent Zero processing in background
      agentZeroService.processInvoice(invoice.id).then(result => {
        console.log(`✅ Agent Zero processing completed for ${invoice.invoiceNumber}:`, result);
        
        // Emit processing completed event
        agentZeroService.emit('invoice_processing_completed', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          result,
          timestamp: new Date()
        });
        
        console.log(`📡 Emitted invoice_processing_completed event for ${invoice.invoiceNumber}`);
      }).catch(error => {
        console.error('Agent Zero processing error:', error);
        console.log(`⚠️ Processing failed for ${invoice.invoiceNumber}, emitting fallback completion event`);
        
        // For demo purposes, emit a completed event even on error to avoid showing errors in UI
        agentZeroService.emit('invoice_processing_completed', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          result: {
            success: false,
            confidence: 0.1,
            reasoning: 'Processing encountered issues - manual review required',
            workflowRoute: 'manual_review',
            status: 'requires_review',
            hasIssues: true
          },
          timestamp: new Date()
        });
      });
    }

    res.json({
      success: true,
      invoice,
      message: `Created ${scenario} scenario invoice: ${invoice.invoiceNumber}`
    });
  } catch (error) {
    console.error('Error creating demo invoice:', error);
    res.status(500).json({ 
      error: 'Failed to create demo invoice', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create batch of invoices with mixed scenarios
router.post('/create-batch/:count', async (req, res) => {
  try {
    await initializeServices();
    const count = parseInt(req.params.count);
    const { scenarios } = req.body;

    if (count > 20) {
      return res.status(400).json({ error: 'Maximum batch size is 20 invoices' });
    }

    console.log(`🎬 Creating batch of ${count} demo invoices...`);

    const invoices = await invoiceGenerator!.generateBatch(count, scenarios);

    // Emit batch created event
    if (agentZeroService) {
      agentZeroService.emit('invoice_created', {
        invoices,
        batchSize: invoices.length,
        scenarios,
        timestamp: new Date()
      });
    }

    // Process each invoice with Agent Zero if service is available
    if (agentZeroService && agentZeroService.isInitialized()) {
      for (const invoice of invoices) {
        console.log(`🤖 Processing invoice ${invoice.invoiceNumber} with Agent Zero...`);
        
        const processingDelay = invoices.indexOf(invoice) * 2000; // 2 second delay between each
        
        // Start Agent Zero processing in background with delay
        setTimeout(() => {
          agentZeroService.emit('invoice_processing_started', {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            scenario: invoice.scenario,
            batchIndex: invoices.indexOf(invoice) + 1,
            batchTotal: invoices.length,
            timestamp: new Date()
          });

          agentZeroService!.processInvoice(invoice.id).then(result => {
            agentZeroService.emit('invoice_processing_completed', {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              result,
              batchIndex: invoices.indexOf(invoice) + 1,
              batchTotal: invoices.length,
              timestamp: new Date()
            });
          }).catch(error => {
            console.error('Agent Zero processing error:', error);
            // For demo purposes, emit a completed event even on error
            agentZeroService.emit('invoice_processing_completed', {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              result: {
                success: false,
                confidence: 0.1,
                reasoning: 'Processing encountered issues - manual review required',
                workflow: 'manual_review'
              },
              batchIndex: invoices.indexOf(invoice) + 1,
              batchTotal: invoices.length,
              timestamp: new Date()
            });
          });
        }, processingDelay);
      }
    }

    res.json({
      success: true,
      invoices,
      count: invoices.length,
      message: `Created ${invoices.length} demo invoices`
    });
  } catch (error) {
    console.error('Error creating batch invoices:', error);
    res.status(500).json({ 
      error: 'Failed to create batch invoices', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create realistic demo scenarios
router.post('/create-realistic-scenarios', async (req, res) => {
  try {
    await initializeServices();
    
    console.log('🎬 Creating realistic demo scenarios...');
    const invoices = await invoiceGenerator!.createRealisticScenarios();

    // Process each invoice with Agent Zero
    if (agentZeroService && agentZeroService.isInitialized()) {
      for (const invoice of invoices) {
        console.log(`🤖 Processing invoice ${invoice.invoiceNumber} with Agent Zero...`);
        
        // Missing PO invoices are now properly configured in the SyntheticInvoiceGenerator
        if (invoice.scenario === 'missing_po') {
          console.log(`📝 Missing PO invoice created: ${invoice.invoiceNumber} - ready for AI Agent assignment and communication`);
        }
        
        // Skip Agent Zero processing for missing PO invoices since they're handled by frontend communication
        if (invoice.scenario === 'missing_po') {
          console.log(`⏭️ Skipping Agent Zero processing for missing PO invoice ${invoice.invoiceNumber} - will be handled by frontend`);
          continue;
        }
        
        // Start processing with staggered timing for visual effect
        setTimeout(() => {
          // Emit processing started event
          agentZeroService!.emit('invoice_processing_started', {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            scenario: invoice.scenario,
            timestamp: new Date()
          });
          
          // Start Agent Zero processing in background
          agentZeroService!.processInvoice(invoice.id).then(result => {
            // Emit processing completed event
            agentZeroService!.emit('invoice_processing_completed', {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              result,
              timestamp: new Date()
            });
          }).catch(error => {
            console.error('Agent Zero processing error:', error);
            // For demo purposes, emit a completed event even on error
            agentZeroService!.emit('invoice_processing_completed', {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              result: {
                success: false,
                confidence: 0.1,
                reasoning: 'Processing encountered issues - manual review required',
                workflow: 'manual_review'
              },
              timestamp: new Date()
            });
          });
        }, invoices.indexOf(invoice) * 3000); // 3 second delay between each
      }
    }

    res.json({
      success: true,
      invoices,
      count: invoices.length,
      message: 'Created realistic demo scenarios'
    });
  } catch (error) {
    console.error('Error creating realistic scenarios:', error);
    res.status(500).json({ 
      error: 'Failed to create realistic scenarios', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reset demo data (clear all invoices but keep vendors)
router.delete('/reset-data', async (req, res) => {
  try {
    console.log('🧹 Resetting demo data...');

    // Delete in correct order due to foreign key constraints
    await prisma.matchingActivity.deleteMany();
    await prisma.exception.deleteMany();
    await prisma.agentActivity.deleteMany();
    await prisma.goodsReceiptLineItem.deleteMany();
    await prisma.goodsReceipt.deleteMany();
    await prisma.invoiceLineItem.deleteMany();
    await prisma.pOLineItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.purchaseOrder.deleteMany();

    console.log('✅ Demo data reset completed');

    res.json({
      success: true,
      message: 'Demo data reset successfully. Vendors preserved.'
    });
  } catch (error) {
    console.error('Error resetting demo data:', error);
    res.status(500).json({ 
      error: 'Failed to reset demo data', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get demo statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await prisma.invoice.groupBy({
      by: ['scenario'],
      _count: {
        id: true
      },
      where: {
        scenario: {
          not: null
        }
      }
    });

    const totalInvoices = await prisma.invoice.count();
    const processedInvoices = await prisma.invoice.count({
      where: {
        agentProcessingCompleted: {
          not: null
        }
      }
    });

    res.json({
      success: true,
      stats: {
        totalInvoices,
        processedInvoices,
        scenarioBreakdown: stats.reduce((acc, stat) => {
          acc[stat.scenario!] = stat._count.id;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    console.error('Error fetching demo stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch demo stats', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Restart Agent Zero service
router.post('/restart-agent-zero', async (req, res) => {
  try {
    console.log('🔄 Restarting Agent Zero service...');

    // Get current instance
    const currentService = AgentZeroService.getInstance();
    
    // Clear any active processing
    if (currentService) {
      // Reset the service state
      await currentService.cleanup?.();
    }

    // Create new instance (will replace the singleton)
    const newService = new AgentZeroService();
    await newService.initialize(); // Properly initialize the new service
    
    // Update singleton instance
    AgentZeroService.setInstance(newService);
    
    // Update global reference
    (global as any).agentZeroInstance = newService;
    agentZeroService = newService;

    console.log('✅ Agent Zero service restarted successfully');

    res.json({
      success: true,
      message: 'Agent Zero service restarted successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error restarting Agent Zero:', error);
    res.status(500).json({ 
      error: 'Failed to restart Agent Zero service', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Trigger Agent Zero learning demonstration
router.post('/trigger-learning', async (req, res) => {
  try {
    await initializeServices();
    
    if (!agentZeroService || !agentZeroService.isInitialized()) {
      return res.status(503).json({ error: 'Agent Zero service not available' });
    }

    console.log('🧠 Triggering Agent Zero learning demonstration...');

    // Create a series of similar invoices to show learning progression
    const learningInvoices = [];
    for (let i = 0; i < 3; i++) {
      const invoice = await invoiceGenerator!.generateInvoice({ scenario: 'learning' });
      learningInvoices.push(invoice);
      
      // Process each with increasing efficiency (simulated learning)
      setTimeout(() => {
        agentZeroService!.processInvoice(invoice.id, { 
          learningIteration: i + 1,
          expectedImprovement: true 
        }).catch(error => {
          console.error('Learning demo error:', error);
        });
      }, i * 4000); // 4 second intervals
    }

    res.json({
      success: true,
      invoices: learningInvoices,
      message: 'Learning demonstration started - watch processing times improve!'
    });
  } catch (error) {
    console.error('Error triggering learning demo:', error);
    res.status(500).json({ 
      error: 'Failed to trigger learning demo', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;