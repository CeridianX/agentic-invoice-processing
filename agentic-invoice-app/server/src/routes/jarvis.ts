import express from 'express';
import { JarvisConversationalService } from '../services/JarvisConversationalService';

const router = express.Router();

// Initialize Jarvis service
const jarvisService = new JarvisConversationalService();

// Get Jarvis status and capabilities
router.get('/status', async (req, res) => {
  try {
    const isAvailable = jarvisService.isAvailable();
    const portfolioData = isAvailable ? await jarvisService.getInvoicePortfolioData() : null;
    
    res.json({
      available: isAvailable,
      service: 'ElevenLabs Conversational AI',
      agent: 'Jarvis - Accounts Payable Assistant',
      portfolio: portfolioData ? {
        totalInvoices: portfolioData.totalInvoices,
        pendingInvoices: portfolioData.pendingInvoices,
        approvedInvoices: portfolioData.approvedInvoices,
        exceptionsCount: portfolioData.exceptionsCount,
        urgentCount: portfolioData.urgentInvoices.length,
        totalValue: portfolioData.totalAmount
      } : null,
      capabilities: [
        'Real-time conversational interface',
        'Invoice portfolio analysis',
        'Payment prioritization',
        'Exception management',
        'Workflow optimization',
        'Vendor insights'
      ]
    });
  } catch (error) {
    console.error('Error getting Jarvis status:', error);
    res.status(500).json({
      available: false,
      error: 'Failed to get Jarvis status'
    });
  }
});

// Get current invoice portfolio data for Jarvis context
router.get('/portfolio', async (req, res) => {
  try {
    if (!jarvisService.isAvailable()) {
      return res.status(503).json({
        error: 'Jarvis service not available'
      });
    }

    const portfolioData = await jarvisService.getInvoicePortfolioData();
    res.json(portfolioData);
  } catch (error) {
    console.error('Error getting portfolio data for Jarvis:', error);
    res.status(500).json({
      error: 'Failed to get portfolio data'
    });
  }
});

// Create a new Jarvis conversational agent
router.post('/create-agent', async (req, res) => {
  try {
    if (!jarvisService.isAvailable()) {
      return res.status(503).json({
        error: 'ElevenLabs service not available'
      });
    }

    console.log('🚀 Creating new Jarvis agent...');
    const agentId = await jarvisService.createConversationalAgent();
    
    if (!agentId) {
      return res.status(500).json({
        error: 'Failed to create Jarvis agent'
      });
    }

    res.json({
      success: true,
      agentId: agentId,
      message: 'Jarvis agent created successfully'
    });
  } catch (error) {
    console.error('Error creating Jarvis agent:', error);
    res.status(500).json({
      error: 'Internal server error while creating agent'
    });
  }
});

// Get signed URL for Jarvis conversation
router.post('/signed-url', async (req, res) => {
  try {
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({
        error: 'Agent ID is required'
      });
    }

    if (!jarvisService.isAvailable()) {
      return res.status(503).json({
        error: 'ElevenLabs service not available'
      });
    }

    console.log(`🔗 Getting signed URL for agent: ${agentId}`);
    const signedUrl = await jarvisService.getSignedUrl(agentId);
    
    if (!signedUrl) {
      return res.status(500).json({
        error: 'Failed to get signed URL'
      });
    }

    res.json({
      success: true,
      signedUrl: signedUrl,
      agentId: agentId
    });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    res.status(500).json({
      error: 'Internal server error while getting signed URL'
    });
  }
});

// Get Jarvis agent configuration for debugging
router.get('/config', async (req, res) => {
  try {
    if (!jarvisService.isAvailable()) {
      return res.status(503).json({
        error: 'Jarvis service not available'
      });
    }

    const portfolioData = await jarvisService.getInvoicePortfolioData();
    const config = jarvisService.createJarvisAgentConfig(portfolioData);
    
    // Don't expose the full prompt for security, just metadata
    res.json({
      agentName: 'Jarvis',
      language: config.agent.language,
      voiceId: config.tts.voice_id,
      temperature: config.custom_llm_extra_body.temperature,
      maxTokens: config.custom_llm_extra_body.max_tokens,
      dynamicVariables: config.dynamic_variables,
      promptLength: config.agent.prompt.prompt.length,
      firstMessage: config.agent.first_message
    });
  } catch (error) {
    console.error('Error getting Jarvis config:', error);
    res.status(500).json({
      error: 'Failed to get agent configuration'
    });
  }
});

// Health check for Jarvis service
router.get('/health', async (req, res) => {
  try {
    const isHealthy = jarvisService.isAvailable();
    const portfolioAccessible = isHealthy ? await jarvisService.getInvoicePortfolioData() : null;
    
    res.json({
      status: isHealthy && portfolioAccessible ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        elevenLabs: isHealthy,
        database: !!portfolioAccessible,
        portfolioData: portfolioAccessible ? 'accessible' : 'inaccessible'
      }
    });
  } catch (error) {
    console.error('Jarvis health check failed:', error);
    res.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;