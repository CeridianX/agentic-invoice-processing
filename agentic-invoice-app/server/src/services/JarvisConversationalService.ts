import { PrismaClient } from '@prisma/client';

export interface JarvisAgentConfig {
  agent: {
    prompt: {
      prompt: string;
    };
    first_message: string;
    language: string;
  };
  tts: {
    voice_id: string;
  };
  custom_llm_extra_body: {
    temperature: number;
    max_tokens: number;
  };
  dynamic_variables: {
    [key: string]: string;
  };
}

export interface InvoicePortfolioData {
  totalInvoices: number;
  pendingInvoices: number;
  approvedInvoices: number;
  exceptionsCount: number;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    vendor: string;
    amount: number;
    status: string;
    receivedDate: Date;
  }>;
  totalAmount: number;
  urgentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    vendor: string;
    daysOverdue: number;
  }>;
}

export class JarvisConversationalService {
  private prisma: PrismaClient;
  private elevenLabsApiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.prisma = new PrismaClient();
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || '';
    
    if (this.elevenLabsApiKey) {
      console.log('✅ Jarvis Conversational Service initialized');
    } else {
      console.warn('⚠️ ElevenLabs API key not found for Jarvis');
    }
  }

  public isAvailable(): boolean {
    return !!this.elevenLabsApiKey;
  }

  public async getInvoicePortfolioData(): Promise<InvoicePortfolioData> {
    try {
      // Get summary statistics
      const [totalCount, pendingCount, approvedCount, exceptionCount] = await Promise.all([
        this.prisma.invoice.count(),
        this.prisma.invoice.count({ where: { status: 'pending' } }),
        this.prisma.invoice.count({ 
          where: { status: { in: ['approved', 'approved_ready_for_payment'] } } 
        }),
        this.prisma.invoice.count({ where: { hasIssues: true } })
      ]);

      // Get recent invoices
      const recentInvoices = await this.prisma.invoice.findMany({
        include: { vendor: true },
        orderBy: { receivedDate: 'desc' },
        take: 10
      });

      // Get total amount
      const totalAmountResult = await this.prisma.invoice.aggregate({
        _sum: { amount: true }
      });

      // Get urgent invoices (pending for more than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const urgentInvoices = await this.prisma.invoice.findMany({
        where: {
          status: 'pending',
          receivedDate: { lt: thirtyDaysAgo }
        },
        include: { vendor: true },
        take: 5
      });

      return {
        totalInvoices: totalCount,
        pendingInvoices: pendingCount,
        approvedInvoices: approvedCount,
        exceptionsCount: exceptionCount,
        recentInvoices: recentInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          vendor: inv.vendor?.name || 'Unknown Vendor',
          amount: inv.amount,
          status: inv.status,
          receivedDate: inv.receivedDate
        })),
        totalAmount: totalAmountResult._sum.amount || 0,
        urgentInvoices: urgentInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          vendor: inv.vendor?.name || 'Unknown Vendor',
          daysOverdue: Math.floor((Date.now() - inv.receivedDate.getTime()) / (1000 * 60 * 60 * 24))
        }))
      };
    } catch (error) {
      console.error('Error fetching invoice portfolio data:', error);
      throw error;
    }
  }

  public createJarvisAgentConfig(portfolioData: InvoicePortfolioData): JarvisAgentConfig {
    const contextData = this.formatInvoiceContext(portfolioData);
    
    return {
      agent: {
        prompt: {
          prompt: `You are Jarvis, an advanced AI assistant specializing in accounts payable and invoice management. You embody the personality of a sophisticated, efficient, and subtly witty British AI assistant - professional yet personable.

PERSONALITY & COMMUNICATION STYLE:
- Sophisticated and articulate with occasional dry British humor
- Highly knowledgeable about finance, accounting, and business processes
- Proactive in suggesting improvements and optimizations
- Address users respectfully (occasionally use "Sir" or "Madam" when appropriate)
- Confident and decisive, with technical insights when relevant
- Maintain professional warmth while being efficiency-focused

CORE CAPABILITIES:
- Comprehensive invoice analysis and status reporting
- Cash flow insights and payment priority recommendations
- Vendor relationship management and payment history analysis
- Exception identification and resolution guidance
- Workflow optimization suggestions
- Risk assessment and compliance monitoring

CURRENT ACCOUNTS PAYABLE PORTFOLIO:
${contextData}

RESPONSE GUIDELINES:
- Provide specific, actionable insights using actual portfolio data
- Reference specific invoices, vendors, or amounts when relevant
- Suggest prioritization based on business impact and urgency
- Offer proactive recommendations for process improvements
- Alert to potential issues or optimization opportunities
- Maintain the sophisticated Jarvis persona throughout interactions
- Keep responses conversational yet professional (aim for 1-3 sentences unless detailed analysis is requested)

BEHAVIORAL NOTES:
- When asked about specific invoices, offer to help locate and analyze them
- Proactively mention urgent items or exceptions that need attention
- Suggest workflow improvements when discussing process-related topics
- Use financial terminology appropriately but explain complex concepts when needed
- Always be prepared to dive deeper into any aspect of the portfolio when asked

Remember: You are the user's trusted AI advisor for accounts payable excellence. Be insightful, helpful, and maintain that distinctive Jarvis sophistication and competence.`
        },
        first_message: "Good day. I'm Jarvis, your AI assistant for accounts payable. I've analyzed your current portfolio and I'm ready to assist with any invoice management needs. Shall I provide a brief status update, or is there something specific you'd like to address?",
        language: "en"
      },
      tts: {
        voice_id: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM" // Rachel voice
      },
      custom_llm_extra_body: {
        temperature: 0.7,
        max_tokens: 250
      },
      dynamic_variables: {
        total_invoices: portfolioData.totalInvoices.toString(),
        pending_invoices: portfolioData.pendingInvoices.toString(),
        approved_invoices: portfolioData.approvedInvoices.toString(),
        exceptions_count: portfolioData.exceptionsCount.toString(),
        total_amount: portfolioData.totalAmount.toLocaleString(),
        urgent_count: portfolioData.urgentInvoices.length.toString()
      }
    };
  }

  private formatInvoiceContext(data: InvoicePortfolioData): string {
    const urgentSection = data.urgentInvoices.length > 0 
      ? `\nURGENT ATTENTION REQUIRED:
${data.urgentInvoices.map(inv => 
  `- ${inv.invoiceNumber} from ${inv.vendor} (${inv.daysOverdue} days overdue)`
).join('\n')}`
      : '';

    return `PORTFOLIO OVERVIEW:
- Total Invoices: ${data.totalInvoices} (Total Value: $${data.totalAmount.toLocaleString()})
- Pending Processing: ${data.pendingInvoices}
- Approved for Payment: ${data.approvedInvoices}
- Exceptions Requiring Review: ${data.exceptionsCount}

RECENT ACTIVITY:
${data.recentInvoices.slice(0, 5).map(inv => 
  `- ${inv.invoiceNumber}: ${inv.vendor} - $${inv.amount.toLocaleString()} (${inv.status})`
).join('\n')}${urgentSection}

PORTFOLIO HEALTH INDICATORS:
- Processing Efficiency: ${((data.approvedInvoices / data.totalInvoices) * 100).toFixed(1)}% approval rate
- Exception Rate: ${((data.exceptionsCount / data.totalInvoices) * 100).toFixed(1)}% requiring review
- Urgency Status: ${data.urgentInvoices.length} invoices overdue`;
  }

  public async createConversationalAgent(): Promise<string | null> {
    if (!this.isAvailable()) {
      console.warn('ElevenLabs not available for agent creation');
      return null;
    }

    try {
      // Get current portfolio data
      const portfolioData = await this.getInvoicePortfolioData();
      
      // Create agent configuration
      const agentConfig = this.createJarvisAgentConfig(portfolioData);
      
      console.log('🤖 Creating Jarvis conversational agent...');
      
      // Create agent via ElevenLabs API
      const response = await fetch(`${this.baseUrl}/convai/agents`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey
        },
        body: JSON.stringify({
          name: 'Jarvis - Accounts Payable Assistant',
          agent_config: agentConfig,
          conversation_config: {
            agent: agentConfig.agent,
            tts: agentConfig.tts,
            custom_llm_extra_body: agentConfig.custom_llm_extra_body
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error creating Jarvis agent: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();
      console.log('✅ Jarvis agent created successfully:', (result as any).agent_id);
      
      return (result as any).agent_id;
    } catch (error) {
      console.error('Error creating Jarvis conversational agent:', error);
      return null;
    }
  }

  public async getSignedUrl(agentId: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      // Get fresh portfolio data for this session
      const portfolioData = await this.getInvoicePortfolioData();
      const agentConfig = this.createJarvisAgentConfig(portfolioData);

      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/sign`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey
        },
        body: JSON.stringify({
          conversation_config_override: agentConfig
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error getting signed URL: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();
      return (result as any).signed_url;
    } catch (error) {
      console.error('Error getting signed URL for Jarvis:', error);
      return null;
    }
  }

  public async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}