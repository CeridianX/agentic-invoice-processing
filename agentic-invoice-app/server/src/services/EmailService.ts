import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  EmailMessage, 
  EmailConversation, 
  EmailServiceConfig,
  CommunicationScenario,
  CommunicationContext
} from '../types/communication';

export class EmailService extends EventEmitter {
  private conversations: Map<string, EmailConversation> = new Map();
  private messages: Map<string, EmailMessage> = new Map();
  private config: EmailServiceConfig;

  constructor(config: Partial<EmailServiceConfig> = {}) {
    super();
    this.config = {
      enabled: true,
      mockMode: true,
      responseDelay: { min: 5, max: 30 }, // 5-30 seconds for demo
      simulateResponses: false, // Disable auto responses for interactive mode
      autoResponse: {
        enabled: false, // Disable auto responses
        scenarios: ['missing_po', 'duplicate_invoice'],
        successRate: 0.8
      },
      ...config
    };
  }

  public async sendEmail(
    to: string[],
    subject: string,
    body: string,
    context: CommunicationContext,
    options?: { isInteractive?: boolean; responseMode?: 'agent' | 'procurement' }
  ): Promise<EmailMessage> {
    const messageId = uuidv4();
    const conversationId = this.findOrCreateConversation(context, options?.isInteractive ?? true);
    
    const fromEmail = options?.responseMode === 'procurement' 
      ? context.recipientInfo.email
      : (process.env.EMAIL_FROM || 'ai-invoice-system@xelix.com');
    
    const toEmails = options?.responseMode === 'procurement'
      ? [process.env.EMAIL_FROM || 'ai-invoice-system@xelix.com']
      : to;

    const message: EmailMessage = {
      id: messageId,
      from: fromEmail,
      to: toEmails,
      content: {
        subject,
        body,
        priority: this.getPriorityFromContext(context),
        actionItems: context.issueDetails.actionRequired
      },
      timestamp: new Date(),
      status: 'sent',
      conversationId,
      relatedInvoiceId: context.invoiceId,
      relatedScenario: context.scenario
    };

    this.messages.set(messageId, message);
    this.addMessageToConversation(conversationId, message);

    // Emit email sent event
    this.emit('email_sent', {
      messageId,
      conversationId,
      to: toEmails,
      subject,
      invoiceId: context.invoiceId,
      scenario: context.scenario,
      responseMode: options?.responseMode
    });

    console.log(`📧 Email sent: ${subject} to ${toEmails.join(', ')}`);

    // No automatic responses for interactive mode
    return message;
  }

  public getConversation(conversationId: string): EmailConversation | undefined {
    return this.conversations.get(conversationId);
  }

  public getConversationByInvoice(invoiceId: string): EmailConversation | undefined {
    for (const conversation of this.conversations.values()) {
      if (conversation.relatedInvoiceId === invoiceId) {
        return conversation;
      }
    }
    return undefined;
  }

  public getAllConversations(): EmailConversation[] {
    return Array.from(this.conversations.values());
  }

  public getAllMessages(): EmailMessage[] {
    return Array.from(this.messages.values());
  }

  public getConversationById(conversationId: string): EmailConversation | undefined {
    return this.conversations.get(conversationId);
  }

  public getMessage(messageId: string): EmailMessage | undefined {
    return this.messages.get(messageId);
  }

  public getConversationMessages(conversationId: string): EmailMessage[] {
    const conversation = this.conversations.get(conversationId);
    return conversation?.messages || [];
  }

  private findOrCreateConversation(context: CommunicationContext, isInteractive: boolean = true): string {
    // Check for existing conversation for this invoice
    for (const [id, conversation] of this.conversations) {
      if (conversation.relatedInvoiceId === context.invoiceId && 
          conversation.status === 'active') {
        console.log(`📧 Found existing conversation ${id} for invoice ${context.invoiceId}`);
        return id;
      }
    }

    // Create new conversation
    const conversationId = uuidv4();
    const conversation: EmailConversation = {
      id: conversationId,
      subject: `Invoice ${context.invoiceNumber} - ${context.scenario.replace('_', ' ')}`,
      participants: [
        process.env.EMAIL_FROM || 'ai-invoice-system@xelix.com',
        context.recipientInfo.email
      ],
      messages: [],
      status: 'active',
      relatedInvoiceId: context.invoiceId,
      scenario: context.scenario,
      createdAt: new Date(),
      lastActivity: new Date(),
      expectedResponseBy: context.deadline,
      currentStep: 0, // Start at step 0 (initial message)
      maxSteps: 3, // 0=initial, 1=first_response, 2=follow_up, 3=resolution
      isInteractive: isInteractive
    };

    this.conversations.set(conversationId, conversation);
    return conversationId;
  }

  private addMessageToConversation(conversationId: string, message: EmailMessage): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.messages.push(message);
      conversation.lastActivity = new Date();
      this.conversations.set(conversationId, conversation);
    }
  }

  private getPriorityFromContext(context: CommunicationContext): 'low' | 'normal' | 'high' | 'urgent' {
    switch (context.urgency) {
      case 'critical': return 'urgent';
      case 'urgent': return 'high';
      case 'normal': return 'normal';
      case 'routine': return 'low';
      default: return 'normal';
    }
  }

  private shouldGenerateResponse(scenario: CommunicationScenario): boolean {
    if (!this.config.autoResponse.enabled) return false;
    if (!this.config.autoResponse.scenarios.includes(scenario)) return false;
    return Math.random() < this.config.autoResponse.successRate;
  }

  private scheduleResponse(originalMessage: EmailMessage, context: CommunicationContext): void {
    const delay = Math.random() * 
      (this.config.responseDelay.max - this.config.responseDelay.min) + 
      this.config.responseDelay.min;

    setTimeout(() => {
      this.generateMockResponse(originalMessage, context);
    }, delay * 1000);
  }

  private generateMockResponse(originalMessage: EmailMessage, context: CommunicationContext): void {
    const responseId = uuidv4();
    
    const responses = this.getMockResponses(context.scenario);
    const selectedResponse = responses[Math.floor(Math.random() * responses.length)];

    const responseMessage: EmailMessage = {
      id: responseId,
      from: context.recipientInfo.email,
      to: [originalMessage.from],
      content: {
        subject: `Re: ${originalMessage.content.subject}`,
        body: selectedResponse.body.replace('{invoiceNumber}', context.invoiceNumber),
        priority: 'normal'
      },
      timestamp: new Date(),
      status: 'sent',
      conversationId: originalMessage.conversationId!,
      relatedInvoiceId: context.invoiceId,
      relatedScenario: context.scenario
    };

    this.messages.set(responseId, responseMessage);
    this.addMessageToConversation(originalMessage.conversationId!, responseMessage);

    // Update conversation status based on response
    const conversation = this.conversations.get(originalMessage.conversationId!);
    if (conversation) {
      conversation.status = selectedResponse.resolves ? 'resolved' : 'active';
      this.conversations.set(originalMessage.conversationId!, conversation);
    }

    // Emit response received event
    this.emit('email_received', {
      messageId: responseId,
      conversationId: originalMessage.conversationId,
      from: context.recipientInfo.email,
      invoiceId: context.invoiceId,
      scenario: context.scenario,
      resolves: selectedResponse.resolves,
      response: selectedResponse
    });

    console.log(`📨 Mock response received from ${context.recipientInfo.email}: ${selectedResponse.type}`);
  }

  private getMockResponses(scenario: CommunicationScenario) {
    const responses: Record<CommunicationScenario, any[]> = {
      missing_po: [
        {
          type: 'po_found',
          body: `Hi,

Thanks for flagging this. I found the PO - it's actually PO-2024-7840 (not 7839). There was a typo in the original invoice.

The correct PO covers this expense and has been approved. You can proceed with processing invoice {invoiceNumber}.

Best regards,
Sarah Chen
Procurement Team`,
          resolves: true,
          data: { correctPO: 'PO-2024-7840' }
        },
        {
          type: 'po_not_needed',
          body: `Hello,

This purchase was pre-approved under our Q1 marketing services blanket agreement with this vendor. No specific PO is required.

You can process this invoice under contract reference: MKT-Q1-2025.

Thanks,
Mike Rodriguez
Procurement Manager`,
          resolves: true,
          data: { contractReference: 'MKT-Q1-2025' }
        },
        {
          type: 'po_needed',
          body: `Hi,

I don't see any authorization for this purchase. This looks like it might be unauthorized.

Can you please hold this invoice while I investigate? I'll get back to you within 24 hours.

Thanks,
Sarah Chen
Procurement Team`,
          resolves: false,
          data: { needsInvestigation: true }
        }
      ],
      duplicate_invoice: [
        {
          type: 'confirmed_duplicate',
          body: `You're right, this is a duplicate. We already processed and paid this invoice last month (Payment ref: PAY-2024-1234).

Please reject this second invoice.

Thanks for catching this!

Best,
Accounts Payable Team`,
          resolves: true,
          data: { originalPayment: 'PAY-2024-1234' }
        }
      ],
      amount_variance: [],
      vendor_verification: [],
      approval_request: [],
      follow_up: [],
      escalation: []
    };

    return responses[scenario] || responses.missing_po;
  }

  public markConversationResolved(conversationId: string, resolution: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'resolved';
      this.conversations.set(conversationId, conversation);
      
      this.emit('conversation_resolved', {
        conversationId,
        invoiceId: conversation.relatedInvoiceId,
        resolution
      });
    }
  }

  public advanceConversationStep(conversationId: string): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || !conversation.isInteractive) {
      return false;
    }

    if (conversation.currentStep < conversation.maxSteps) {
      conversation.currentStep += 1;
      conversation.lastActivity = new Date();
      
      // Mark as resolved if we've reached the final step
      if (conversation.currentStep >= conversation.maxSteps) {
        conversation.status = 'resolved';
      }
      
      this.conversations.set(conversationId, conversation);
      return true;
    }
    
    return false;
  }

  public canAdvanceConversation(conversationId: string): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || !conversation.isInteractive) {
      return false;
    }
    
    return conversation.currentStep < conversation.maxSteps && conversation.status === 'active';
  }

  public getConversationStepInfo(conversationId: string): { 
    currentStep: number; 
    maxSteps: number; 
    nextStepName: string; 
    canAdvance: boolean;
  } | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const stepNames = [
      'Initial inquiry sent',
      'Waiting for procurement response',
      'Waiting for AI follow-up',
      'Conversation resolved'
    ];

    return {
      currentStep: conversation.currentStep,
      maxSteps: conversation.maxSteps,
      nextStepName: stepNames[conversation.currentStep + 1] || 'Complete',
      canAdvance: this.canAdvanceConversation(conversationId)
    };
  }

  public getMetrics() {
    const conversations = Array.from(this.conversations.values());
    const messages = Array.from(this.messages.values());

    return {
      totalConversations: conversations.length,
      activeConversations: conversations.filter(c => c.status === 'active').length,
      resolvedConversations: conversations.filter(c => c.status === 'resolved').length,
      totalMessages: messages.length,
      averageResponseTime: this.calculateAverageResponseTime(conversations),
      byScenario: this.getConversationsByScenario(conversations)
    };
  }

  private calculateAverageResponseTime(conversations: EmailConversation[]): number {
    const responseTimes: number[] = [];
    
    conversations.forEach(conv => {
      for (let i = 0; i < conv.messages.length - 1; i++) {
        const sent = conv.messages[i];
        const response = conv.messages[i + 1];
        if (sent.from !== response.from) {
          const responseTime = response.timestamp.getTime() - sent.timestamp.getTime();
          responseTimes.push(responseTime / (1000 * 60 * 60)); // Convert to hours
        }
      }
    });

    return responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
  }

  private getConversationsByScenario(conversations: EmailConversation[]): Record<string, number> {
    const byScenario: Record<string, number> = {};
    conversations.forEach(conv => {
      byScenario[conv.scenario] = (byScenario[conv.scenario] || 0) + 1;
    });
    return byScenario;
  }
}