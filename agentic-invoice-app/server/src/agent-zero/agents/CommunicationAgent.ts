import { EventEmitter } from 'events';
import { BaseAgent } from './BaseAgent';
import { AgentContext, AgentConfig } from '../types';
import { OpenAIService } from '../../services/OpenAIService';
import { EmailService } from '../../services/EmailService';
import { 
  CommunicationContext, 
  CommunicationScenario,
  AIGenerationRequest,
  EmailMessage
} from '../../types/communication';

export class CommunicationAgent extends BaseAgent {
  private openAIService: OpenAIService;
  private emailService: EmailService;
  private eventEmitter: EventEmitter;

  constructor() {
    const config: AgentConfig = {
      name: 'CommunicationAgent',
      role: 'communication_specialist',
      description: 'Handles intelligent communication with internal teams and external vendors',
      systemPrompt: `You are a professional communication agent for an invoice processing system. 
        Your role is to generate contextual, professional communications that resolve invoice processing issues.
        You excel at crafting clear, actionable messages that get results while maintaining professional relationships.`,
      tools: [],
      maxTokens: 800,
      temperature: 0.3,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };

    super(config);
    
    // Initialize tools after super() call
    this.config.tools = [
      {
        name: 'generate_email',
        description: 'Generate contextual email using AI',
        execute: this.generateEmail.bind(this)
      },
      {
        name: 'send_email',
        description: 'Send email through the system',
        execute: this.sendEmail.bind(this)
      },
      {
        name: 'track_conversation',
        description: 'Track and manage email conversations',
        execute: this.trackConversation.bind(this)
      }
    ];
    
    this.eventEmitter = new EventEmitter();
    this.openAIService = new OpenAIService();
    this.emailService = new EmailService();
    this.setupEmailEventHandlers();
  }

  // Event emitter methods
  public on(event: string, listener: (...args: any[]) => void) {
    return this.eventEmitter.on(event, listener);
  }

  public emit(event: string, ...args: any[]) {
    return this.eventEmitter.emit(event, ...args);
  }

  protected async generateResponse(prompt: string, context?: any): Promise<string> {
    return `CommunicationAgent analyzing: ${prompt}`;
  }

  public async execute(task: string, context?: AgentContext): Promise<any> {
    if (context) {
      this.setContext(context);
    }
    this.updateState({ 
      status: 'working', 
      currentTask: 'Handling communication request' 
    });

    try {
      const reasoning = await this.think(task, context);
      
      // Parse the task to determine communication action
      const action = this.parseTask(task);
      let result;

      switch (action.type) {
        case 'generate_missing_po_communication':
          result = await this.handleMissingPOCommunication(action.data);
          break;
        case 'generate_follow_up':
          result = await this.handleFollowUpCommunication(action.data);
          break;
        case 'generate_escalation':
          result = await this.handleEscalationCommunication(action.data);
          break;
        default:
          result = await this.handleGenericCommunication(action.data);
      }

      this.updateState({ 
        status: 'idle', 
        currentTask: undefined,
        confidence: result.confidence || 0.85
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ 
        status: 'error', 
        currentTask: `Communication error: ${errorMessage}` 
      });
      throw error;
    }
  }

  public async handleMissingPOCommunication(invoiceData: any): Promise<any> {
    console.log('🤖 CommunicationAgent: Handling missing PO communication for invoice:', invoiceData.invoiceNumber);

    const context: CommunicationContext = {
      scenario: 'missing_po',
      invoiceId: invoiceData.id,
      invoiceNumber: invoiceData.invoiceNumber,
      vendor: {
        name: invoiceData.vendor.name,
        id: invoiceData.vendor.id,
        trustLevel: invoiceData.vendor.trustLevel
      },
      amount: invoiceData.amount,
      issueDetails: {
        description: `Invoice references PO "${invoiceData.missingPO || 'PO-2024-7839'}" which is not found in our system`,
        severity: 'medium',
        actionRequired: [
          'Verify if this PO number is correct',
          'Provide the correct PO if there was a typo',
          'Confirm if this purchase was authorized without a PO'
        ]
      },
      recipientInfo: {
        type: 'internal_procurement',
        email: process.env.EMAIL_PROCUREMENT_TEAM || 'procurement.team@company.com',
        name: 'Procurement Team',
        department: 'Procurement'
      },
      urgency: 'normal',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    };

    // Generate AI-powered email
    const generationRequest: AIGenerationRequest = {
      context,
      customInstructions: 'Be collaborative and helpful. This is an internal communication with our procurement team.'
    };

    const aiResult = await this.openAIService.generateEmail(generationRequest);
    
    // Send the email
    const emailMessage = await this.emailService.sendEmail(
      [context.recipientInfo.email],
      aiResult.content.subject,
      aiResult.content.body,
      context
    );

    this.addMessage({
      type: 'assistant',
      content: `Generated and sent missing PO inquiry email`,
      metadata: {
        emailId: emailMessage.id,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning
      }
    });

    return {
      success: true,
      emailMessage,
      aiGeneration: aiResult,
      context,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      nextSteps: {
        followUp: aiResult.suggestedFollowUp,
        escalation: aiResult.suggestedEscalation
      }
    };
  }

  public async handleFollowUpCommunication(data: any): Promise<any> {
    console.log('🤖 CommunicationAgent: Generating follow-up communication');

    // Get the original conversation
    const conversation = this.emailService.getConversationByInvoice(data.invoiceId);
    if (!conversation) {
      throw new Error('No conversation found for follow-up');
    }

    const context: CommunicationContext = {
      scenario: 'follow_up',
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      vendor: data.vendor,
      amount: data.amount,
      issueDetails: {
        description: 'Following up on previous inquiry',
        severity: 'medium',
        actionRequired: ['Please provide status update']
      },
      recipientInfo: {
        type: 'internal_procurement',
        email: process.env.EMAIL_PROCUREMENT_TEAM || 'procurement.team@company.com',
        name: 'Procurement Team'
      },
      urgency: 'normal',
      previousCommunications: conversation.messages
    };

    const generationRequest: AIGenerationRequest = {
      context,
      customInstructions: 'This is a follow-up to a previous inquiry. Be polite but indicate the urgency of getting a response.'
    };

    const aiResult = await this.openAIService.generateEmail(generationRequest);
    
    const emailMessage = await this.emailService.sendEmail(
      [context.recipientInfo.email],
      aiResult.content.subject,
      aiResult.content.body,
      context
    );

    return {
      success: true,
      emailMessage,
      aiGeneration: aiResult,
      confidence: aiResult.confidence
    };
  }

  public async handleEscalationCommunication(data: any): Promise<any> {
    console.log('🤖 CommunicationAgent: Generating escalation communication');

    const context: CommunicationContext = {
      scenario: 'escalation',
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      vendor: data.vendor,
      amount: data.amount,
      issueDetails: {
        description: 'Escalating unresolved invoice issue to management',
        severity: 'high',
        actionRequired: ['Immediate attention required', 'Resolve procurement team delay']
      },
      recipientInfo: {
        type: 'manager',
        email: 'manager@company.com',
        name: 'Procurement Manager'
      },
      urgency: 'urgent'
    };

    const generationRequest: AIGenerationRequest = {
      context,
      customInstructions: 'This is an escalation to management. Be professional but indicate the urgency and business impact.'
    };

    const aiResult = await this.openAIService.generateEmail(generationRequest);
    
    const emailMessage = await this.emailService.sendEmail(
      [context.recipientInfo.email],
      aiResult.content.subject,
      aiResult.content.body,
      context
    );

    return {
      success: true,
      emailMessage,
      aiGeneration: aiResult,
      confidence: aiResult.confidence
    };
  }

  private async handleGenericCommunication(data: any): Promise<any> {
    // Fallback for other communication types
    return {
      success: true,
      message: 'Generic communication handled',
      confidence: 0.7
    };
  }

  private parseTask(task: string): { type: string; data: any } {
    // Simple task parsing - in a real system this would be more sophisticated
    if (task.includes('missing_po') || task.includes('missing PO')) {
      return {
        type: 'generate_missing_po_communication',
        data: this.context?.metadata || {}
      };
    } else if (task.includes('follow_up')) {
      return {
        type: 'generate_follow_up',
        data: this.context?.metadata || {}
      };
    } else if (task.includes('escalation')) {
      return {
        type: 'generate_escalation',
        data: this.context?.metadata || {}
      };
    }
    
    return {
      type: 'generic_communication',
      data: this.context?.metadata || {}
    };
  }

  private setupEmailEventHandlers(): void {
    this.emailService.on('email_sent', (data) => {
      console.log(`📧 Email sent event: ${data.subject}`);
      // Emit to AgentZeroService for WebSocket broadcasting
      this.emit('communication_sent', data);
    });

    this.emailService.on('email_received', (data) => {
      console.log(`📨 Email response received: ${data.scenario}`);
      // Emit to AgentZeroService for WebSocket broadcasting
      this.emit('communication_received', data);
    });

    this.emailService.on('conversation_resolved', (data) => {
      console.log(`✅ Conversation resolved: ${data.conversationId}`);
      // Emit to AgentZeroService for WebSocket broadcasting
      this.emit('communication_resolved', data);
    });
  }

  // Tool implementations
  private async generateEmail(params: any): Promise<any> {
    const request: AIGenerationRequest = {
      context: params.context,
      customInstructions: params.instructions
    };
    
    return await this.openAIService.generateEmail(request);
  }

  private async sendEmail(params: any): Promise<EmailMessage> {
    return await this.emailService.sendEmail(
      params.to,
      params.subject,
      params.body,
      params.context
    );
  }

  private async trackConversation(params: any): Promise<any> {
    if (params.conversationId) {
      return this.emailService.getConversation(params.conversationId);
    } else if (params.invoiceId) {
      return this.emailService.getConversationByInvoice(params.invoiceId);
    }
    return null;
  }

  public getEmailService(): EmailService {
    return this.emailService;
  }

  public isAIEnabled(): boolean {
    return this.openAIService.isEnabled();
  }
}