import OpenAI from 'openai';
import { 
  AIGenerationRequest, 
  AIGenerationResult, 
  EmailContent, 
  CommunicationContext 
} from '../types/communication';

export class OpenAIService {
  private openai: OpenAI | undefined;
  private model: string = 'gpt-4o-mini';
  private enabled: boolean = false;

  constructor() {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      this.enabled = true;
      console.log('✅ OpenAI service initialized with model:', this.model);
    } else {
      console.log('⚠️ OpenAI API key not configured, using fallback templates');
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async generateEmail(request: AIGenerationRequest & { 
    responseMode?: 'agent' | 'procurement';
    conversationHistory?: any[];
    conversationStep?: number;
  }): Promise<AIGenerationResult> {
    if (!this.enabled || !this.openai) {
      return this.generateFallbackEmail(request);
    }

    try {
      const systemPrompt = this.createSystemPrompt(request.context, request.responseMode, request.conversationHistory);
      const userPrompt = this.createUserPrompt(request);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: request.maxTokens || 800,
        temperature: request.temperature || (request.responseMode === 'procurement' ? 0.4 : 0.3),
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(responseText);
      
      return {
        content: {
          subject: parsed.subject,
          body: parsed.body,
          htmlBody: this.formatAsHTML(parsed.body, parsed.actionItems),
          priority: parsed.priority || 'normal',
          actionItems: parsed.actionItems || []
        },
        confidence: parsed.confidence || 0.85,
        reasoning: parsed.reasoning || 'AI-generated professional communication',
        suggestedFollowUp: parsed.suggestedFollowUp,
        suggestedEscalation: parsed.suggestedEscalation
      };

    } catch (error) {
      console.error('OpenAI generation error:', error);
      // Fallback to template-based generation
      return this.generateFallbackEmail(request);
    }
  }

  private createSystemPrompt(
    context: CommunicationContext, 
    responseMode: 'agent' | 'procurement' = 'agent',
    conversationHistory?: any[]
  ): string {
    const baseContext = `
COMMUNICATION CONTEXT:
- Scenario: ${context.scenario}
- Recipient Type: ${context.recipientInfo.type}
- Urgency Level: ${context.urgency}
- Issue Severity: ${context.issueDetails.severity}
- Invoice: ${context.invoiceNumber} from ${context.vendor.name} for $${context.amount.toLocaleString()}
`;

    const conversationContext = conversationHistory && conversationHistory.length > 0 
      ? `\nCONVERSATION HISTORY:\n${conversationHistory.map((msg, i) => 
          `${i + 1}. ${msg.from.includes('ai-invoice') ? 'AI Agent' : 'Procurement'}: ${msg.content.subject}\n${msg.content.body}`
        ).join('\n\n')}\n`
      : '';

    if (responseMode === 'procurement') {
      return `You are a professional procurement team member responding to an AI invoice processing system. You help resolve invoice processing issues efficiently.

${baseContext}${conversationContext}

YOUR ROLE:
- You work in the procurement department
- You have access to purchase order systems and vendor agreements
- You want to help resolve invoice processing issues quickly
- You communicate professionally but in a more conversational, human tone
- You provide specific information to help the AI system process invoices

RESPONSE GUIDELINES:
1. Be helpful and collaborative
2. Provide specific information (PO numbers, contract references, etc.)
3. Use a slightly more casual but still professional tone
4. Reference systems and processes you would actually use
5. Sometimes ask for clarification if needed
6. Include your name and role signature

RESPONSE FORMAT:
Return a JSON object with these fields:
{
  "subject": "Re: [previous subject] or new subject",
  "body": "Professional but conversational response with specific details",
  "priority": "low|normal|high|urgent", 
  "actionItems": ["Any actions you're requesting from the AI"],
  "confidence": 0.85,
  "reasoning": "Brief explanation of your response approach"
}`;
    } else {
      return `You are a professional AI assistant for an invoice processing system. Your role is to generate clear, professional, and actionable business communications.

${baseContext}${conversationContext}

GUIDELINES:
1. Always be professional and courteous
2. Be specific about the issue and required actions
3. Include relevant invoice details
4. Provide clear next steps and deadlines
5. Use appropriate urgency based on context
6. For internal communications, be direct but collaborative
7. For external communications, be diplomatic but firm
8. If this is a follow-up, acknowledge previous communication

RESPONSE FORMAT:
Return a JSON object with these fields:
{
  "subject": "Clear, specific subject line",
  "body": "Professional email body with proper formatting",
  "priority": "low|normal|high|urgent",
  "actionItems": ["Specific action item 1", "Specific action item 2"],
  "confidence": 0.85,
  "reasoning": "Brief explanation of communication approach",
  "suggestedFollowUp": {
    "days": 2,
    "reason": "Why follow-up is needed"
  },
  "suggestedEscalation": {
    "days": 5,
    "escalateTo": "manager",
    "reason": "When to escalate and why"
  }
}`;
    }
  }

  private createUserPrompt(request: AIGenerationRequest): string {
    const { context } = request;
    
    let prompt = `Generate a professional email for the following situation:

INVOICE DETAILS:
- Invoice Number: ${context.invoiceNumber}
- Vendor: ${context.vendor.name}
- Amount: $${context.amount.toLocaleString()}
- Issue: ${context.issueDetails.description}

RECIPIENT:
- Type: ${context.recipientInfo.type}
- Email: ${context.recipientInfo.email}`;

    if (context.recipientInfo.name) {
      prompt += `\n- Name: ${context.recipientInfo.name}`;
    }

    if (context.recipientInfo.department) {
      prompt += `\n- Department: ${context.recipientInfo.department}`;
    }

    prompt += `\n\nREQUIRED ACTIONS:`;
    context.issueDetails.actionRequired.forEach(action => {
      prompt += `\n- ${action}`;
    });

    if (context.deadline) {
      prompt += `\n\nDEADLINE: ${context.deadline.toDateString()}`;
    }

    if (context.previousCommunications && context.previousCommunications.length > 0) {
      prompt += `\n\nPREVIOUS COMMUNICATIONS: This is a follow-up to ${context.previousCommunications.length} previous message(s).`;
    }

    if (request.customInstructions) {
      prompt += `\n\nSPECIAL INSTRUCTIONS: ${request.customInstructions}`;
    }

    return prompt;
  }

  private formatAsHTML(body: string, actionItems: string[] = []): string {
    let html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">`;
    
    // Convert line breaks to paragraphs
    const paragraphs = body.split('\n\n');
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        html += `<p>${paragraph.trim()}</p>`;
      }
    });

    // Add action items if present
    if (actionItems.length > 0) {
      html += `<div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #007bff;">`;
      html += `<h4 style="margin: 0 0 10px 0; color: #007bff;">Action Items:</h4>`;
      html += `<ul style="margin: 0; padding-left: 20px;">`;
      actionItems.forEach(item => {
        html += `<li>${item}</li>`;
      });
      html += `</ul></div>`;
    }

    html += `</div>`;
    return html;
  }

  private generateFallbackEmail(request: AIGenerationRequest): AIGenerationResult {
    const { context } = request;
    
    // Template-based fallback for when OpenAI is not available
    const templates: Record<string, any> = {
      missing_po: {
        subject: `Action Required - Invoice ${context.invoiceNumber} Missing PO Reference`,
        body: `Hi ${context.recipientInfo.name || 'Team'},

I'm processing invoice ${context.invoiceNumber} from ${context.vendor.name} for $${context.amount.toLocaleString()}.

${context.issueDetails.description}

Could you please help by:
${context.issueDetails.actionRequired.map(action => `• ${action}`).join('\n')}

This invoice requires processing within our standard timeframe. Please let me know if you need any additional information.

Best regards,
AI Invoice Processing System`,
        actionItems: context.issueDetails.actionRequired,
        priority: context.urgency === 'urgent' ? 'high' : 'normal'
      }
    };

    const template = templates[context.scenario] || templates.missing_po;
    
    return {
      content: {
        subject: template.subject,
        body: template.body,
        htmlBody: this.formatAsHTML(template.body, template.actionItems),
        priority: template.priority as any,
        actionItems: template.actionItems
      },
      confidence: 0.75, // Lower confidence for templates
      reasoning: 'Generated using fallback template (OpenAI not available)',
      suggestedFollowUp: {
        days: 2,
        reason: 'Standard follow-up for missing information'
      },
      suggestedEscalation: {
        days: 5,
        escalateTo: 'manager',
        reason: 'No response to initial inquiry'
      }
    };
  }

  public async testConnection(): Promise<boolean> {
    if (!this.enabled || !this.openai) {
      return false;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10
      });
      
      return !!completion.choices[0]?.message?.content;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}