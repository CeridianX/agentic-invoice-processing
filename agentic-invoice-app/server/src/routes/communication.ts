import express from 'express';
import { CommunicationAgent } from '../agent-zero/agents/CommunicationAgent';
import { EmailService } from '../services/EmailService';

const router = express.Router();

// Get the CommunicationAgent instance from global Agent Zero
function getCommunicationAgent(): CommunicationAgent | null {
  try {
    const agentZero = (global as any).agentZeroInstance;
    if (!agentZero || !agentZero.orchestrator) {
      return null;
    }
    
    const communicationAgent = agentZero.orchestrator.agents?.get('CommunicationAgent');
    return communicationAgent || null;
  } catch (error) {
    console.error('Error getting CommunicationAgent:', error);
    return null;
  }
}

// Get conversation data for a specific invoice
router.get('/conversations/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const communicationAgent = getCommunicationAgent();
    if (!communicationAgent) {
      return res.status(503).json({ 
        error: 'Communication service not available',
        message: 'Agent Zero communication system is not initialized'
      });
    }

    const emailService = communicationAgent.getEmailService();
    
    // Get all conversations and find by invoice ID
    const allConversations = emailService.getAllConversations();
    const conversation = allConversations.find(c => c.relatedInvoiceId === invoiceId);
    
    if (!conversation) {
      return res.json({
        hasConversation: false,
        conversation: null,
        messages: []
      });
    }

    const messages = emailService.getConversationMessages(conversation.id);
    
    res.json({
      hasConversation: !!conversation,
      conversation: conversation ? {
        id: conversation.id,
        subject: conversation.subject,
        status: conversation.status,
        scenario: conversation.scenario,
        participants: conversation.participants,
        createdAt: conversation.createdAt,
        lastActivity: conversation.lastActivity,
        expectedResponseBy: conversation.expectedResponseBy,
        currentStep: conversation.currentStep,
        maxSteps: conversation.maxSteps,
        isInteractive: conversation.isInteractive
      } : null,
      messages: messages.map(msg => ({
        id: msg.id,
        from: msg.from,
        to: msg.to,
        content: msg.content,
        timestamp: msg.timestamp,
        status: msg.status
      })),
      aiEnabled: communicationAgent.isAIEnabled()
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversation data',
      message: error.message 
    });
  }
});

// Get all conversations with summary
router.get('/conversations', async (req, res) => {
  try {
    const communicationAgent = getCommunicationAgent();
    if (!communicationAgent) {
      return res.status(503).json({ 
        error: 'Communication service not available' 
      });
    }

    const emailService = communicationAgent.getEmailService();
    const conversations = emailService.getAllConversations();
    
    const conversationSummaries = conversations.map(conv => ({
      id: conv.id,
      subject: conv.subject,
      status: conv.status,
      scenario: conv.scenario,
      relatedInvoiceId: conv.relatedInvoiceId,
      participants: conv.participants,
      createdAt: conv.createdAt,
      lastActivity: conv.lastActivity,
      messageCount: conv.messages.length,
      lastMessage: conv.messages.length > 0 ? {
        from: conv.messages[conv.messages.length - 1].from,
        timestamp: conv.messages[conv.messages.length - 1].timestamp,
        preview: conv.messages[conv.messages.length - 1].content.subject
      } : null
    }));

    res.json({
      conversations: conversationSummaries,
      metrics: emailService.getMetrics(),
      aiEnabled: communicationAgent.isAIEnabled()
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversations',
      message: error.message 
    });
  }
});

// Trigger manual communication for an invoice
router.post('/invoke/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { scenario = 'missing_po', customInstructions } = req.body;
    
    const communicationAgent = getCommunicationAgent();
    if (!communicationAgent) {
      return res.status(503).json({ 
        error: 'Communication service not available' 
      });
    }

    // Get invoice data from database
    const agentZero = (global as any).agentZeroInstance;
    if (!agentZero || !agentZero.prisma) {
      return res.status(503).json({ 
        error: 'Database service not available' 
      });
    }

    const invoice = await agentZero.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { vendor: true }
    });

    if (!invoice) {
      return res.status(404).json({ 
        error: 'Invoice not found' 
      });
    }

    // Trigger appropriate communication based on scenario
    let result;
    switch (scenario) {
      case 'missing_po':
        result = await communicationAgent.handleMissingPOCommunication(invoice);
        break;
      case 'follow_up':
        result = await communicationAgent.handleFollowUpCommunication(invoice);
        break;
      case 'escalation':
        result = await communicationAgent.handleEscalationCommunication(invoice);
        break;
      default:
        return res.status(400).json({ 
          error: 'Unsupported communication scenario',
          supportedScenarios: ['missing_po', 'follow_up', 'escalation']
        });
    }

    res.json({
      success: true,
      scenario,
      result: {
        emailMessage: result.emailMessage,
        confidence: result.confidence,
        reasoning: result.reasoning,
        nextSteps: result.nextSteps
      },
      aiEnabled: communicationAgent.isAIEnabled()
    });
  } catch (error) {
    console.error('Error invoking communication:', error);
    res.status(500).json({ 
      error: 'Failed to invoke communication',
      message: error.message 
    });
  }
});

// Advance conversation to next step
router.post('/advance/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const communicationAgent = getCommunicationAgent();
    if (!communicationAgent) {
      return res.status(503).json({ 
        error: 'Communication service not available' 
      });
    }

    const emailService = communicationAgent.getEmailService();
    const conversation = emailService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ 
        error: 'Conversation not found' 
      });
    }

    if (!conversation.isInteractive) {
      return res.status(400).json({ 
        error: 'Conversation is not in interactive mode' 
      });
    }

    // Check if we can advance
    if (!emailService.canAdvanceConversation(conversationId)) {
      return res.status(400).json({ 
        error: 'Cannot advance conversation further',
        status: conversation.status,
        currentStep: conversation.currentStep,
        maxSteps: conversation.maxSteps
      });
    }

    // Advance the step
    const stepAdvanced = emailService.advanceConversationStep(conversationId);
    if (!stepAdvanced) {
      return res.status(500).json({ 
        error: 'Failed to advance conversation step' 
      });
    }

    // Generate next message based on current step
    const nextStep = conversation.currentStep + 1;
    let newMessage;

    try {
      newMessage = await generateStepMessage(conversation, nextStep, communicationAgent, emailService);
    } catch (aiError) {
      console.error('AI generation error during step advancement:', aiError);
      return res.status(500).json({ 
        error: 'Failed to generate next conversation step',
        message: aiError.message 
      });
    }

    res.json({
      success: true,
      conversationId,
      newStep: nextStep,
      message: newMessage,
      stepInfo: emailService.getConversationStepInfo(conversationId),
      aiEnabled: communicationAgent.isAIEnabled()
    });

  } catch (error) {
    console.error('Error advancing conversation:', error);
    res.status(500).json({ 
      error: 'Failed to advance conversation',
      message: error.message 
    });
  }
});

// Helper function to generate step-specific messages
async function generateStepMessage(
  conversation: any, 
  step: number, 
  communicationAgent: any, 
  emailService: any
) {
  const openAIService = communicationAgent.openAIService;
  const messages = emailService.getConversationMessages(conversation.id);
  
  // Get invoice data for context
  const agentZero = (global as any).agentZeroInstance;
  const invoice = await agentZero.prisma.invoice.findUnique({
    where: { id: conversation.relatedInvoiceId },
    include: { vendor: true }
  });

  const context = {
    scenario: conversation.scenario,
    invoiceId: conversation.relatedInvoiceId,
    invoiceNumber: invoice?.invoiceNumber || 'Unknown',
    vendor: {
      name: invoice?.vendor?.name || 'Unknown Vendor',
      id: invoice?.vendor?.id || '',
      trustLevel: invoice?.vendor?.trustLevel || 'medium'
    },
    amount: invoice?.amount || 0,
    issueDetails: {
      description: `Invoice references PO "PO-2024-7839" which is not found in our system`,
      severity: 'medium' as const,
      actionRequired: [
        'Verify if this PO number is correct',
        'Provide the correct PO if there was a typo',
        'Confirm if this purchase was authorized without a PO'
      ]
    },
    recipientInfo: {
      type: 'internal_procurement' as const,
      email: process.env.EMAIL_PROCUREMENT_TEAM || 'procurement@xelix.com',
      name: 'Procurement Team'
    },
    urgency: 'normal' as const
  };

  let responseMode: 'agent' | 'procurement';
  let customInstructions = '';

  // Determine message type based on step
  switch (step) {
    case 1: // Procurement responds
      responseMode = 'procurement';
      customInstructions = 'Respond as a helpful procurement team member. You found the issue - there was a typo in the PO number.';
      break;
    case 2: // AI agent follow-up
      responseMode = 'agent';
      customInstructions = 'Thank the procurement team for the clarification and confirm next steps for processing the invoice.';
      break;
    case 3: // Final procurement confirmation
      responseMode = 'procurement';
      customInstructions = 'Provide final confirmation that everything is resolved and the invoice can be processed.';
      break;
    default:
      throw new Error(`Invalid step: ${step}`);
  }

  // Generate AI response
  const aiResult = await openAIService.generateEmail({
    context,
    responseMode,
    conversationHistory: messages,
    conversationStep: step,
    customInstructions
  });

  // Send the message
  const emailMessage = await emailService.sendEmail(
    responseMode === 'procurement' 
      ? [process.env.EMAIL_FROM || 'ai-invoice-system@xelix.com']
      : [context.recipientInfo.email],
    aiResult.content.subject,
    aiResult.content.body,
    context,
    { isInteractive: true, responseMode }
  );

  return {
    message: emailMessage,
    aiGeneration: aiResult,
    step,
    responseMode
  };
}

// Get conversation step information
router.get('/step-info/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const communicationAgent = getCommunicationAgent();
    if (!communicationAgent) {
      return res.status(503).json({ 
        error: 'Communication service not available' 
      });
    }

    const emailService = communicationAgent.getEmailService();
    const stepInfo = emailService.getConversationStepInfo(conversationId);
    
    if (!stepInfo) {
      return res.status(404).json({ 
        error: 'Conversation not found' 
      });
    }

    res.json(stepInfo);
  } catch (error) {
    console.error('Error getting step info:', error);
    res.status(500).json({ 
      error: 'Failed to get step info',
      message: error.message 
    });
  }
});

// Test OpenAI connection
router.get('/ai-status', async (req, res) => {
  try {
    const communicationAgent = getCommunicationAgent();
    if (!communicationAgent) {
      return res.json({
        available: false,
        reason: 'Communication agent not initialized'
      });
    }

    const isAIEnabled = communicationAgent.isAIEnabled();
    
    res.json({
      available: isAIEnabled,
      status: isAIEnabled ? 'connected' : 'using_fallback_templates',
      reason: isAIEnabled ? 'OpenAI API key configured' : 'OpenAI API key not configured or invalid'
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    res.status(500).json({ 
      error: 'Failed to check AI status',
      message: error.message 
    });
  }
});

export default router;