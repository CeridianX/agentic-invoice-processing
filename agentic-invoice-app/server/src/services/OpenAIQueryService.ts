import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

export interface IntelligentQueryResult {
  response: string;
  action?: 'show_invoice' | 'show_list' | 'show_summary';
  data?: any;
  invoiceId?: string;
}

export class OpenAIQueryService {
  private openai: OpenAI;
  private prisma: PrismaClient;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.prisma = new PrismaClient();
  }

  public async processIntelligentQuery(query: string): Promise<IntelligentQueryResult> {
    try {
      // Get current invoice data for context
      const invoiceContext = await this.getInvoiceContext();
      
      console.log(`🧠 Processing intelligent query: "${query}"`);
      
      const systemPrompt = `You are an intelligent invoice management assistant. You have access to invoice data and can help users with natural conversation about their invoices.

AVAILABLE DATA:
${invoiceContext}

CAPABILITIES:
1. Answer questions about specific invoices by ID/number
2. Search and filter invoices by status, vendor, amount, date
3. Provide summaries and analytics
4. Handle natural conversation about invoice management

RESPONSE FORMAT:
Always respond in a natural, conversational tone. If the user asks about:
- A specific invoice: Include details and suggest actions
- Multiple invoices: Provide a summary with key insights
- General questions: Give helpful information about their invoice portfolio

ACTIONS YOU CAN TRIGGER:
- show_invoice: When discussing a specific invoice (include invoiceId)
- show_list: When the user wants to see filtered invoices
- show_summary: When providing overview/analytics

Respond naturally and helpfully to the user's query.`;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, but I had trouble processing your request.';
      
      // Analyze response to determine actions and extract data
      const result = await this.analyzeResponseForActions(query, response);
      
      console.log(`🤖 OpenAI Response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
      
      return {
        response,
        ...result
      };

    } catch (error) {
      console.error('Error processing intelligent query:', error);
      return {
        response: 'I apologize, but I encountered an error processing your request. Please try again.'
      };
    }
  }

  private async getInvoiceContext(): Promise<string> {
    try {
      // Get summary statistics
      const [totalCount, invoices] = await Promise.all([
        this.prisma.invoice.count(),
        this.prisma.invoice.findMany({
          include: { vendor: true },
          orderBy: { receivedDate: 'desc' },
          take: 20
        })
      ]);

      // Group by status
      const statusGroups = invoices.reduce((acc: any, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {});

      const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

      let context = `INVOICE PORTFOLIO SUMMARY:
- Total invoices: ${totalCount}
- Total amount: $${totalAmount.toLocaleString()}
- Status breakdown: ${Object.entries(statusGroups).map(([status, count]) => `${status}: ${count}`).join(', ')}

RECENT INVOICES:`;

      invoices.slice(0, 10).forEach(inv => {
        context += `\n- ${inv.invoiceNumber} | ${inv.vendor?.name || 'Unknown'} | $${inv.amount.toLocaleString()} | ${inv.status}`;
      });

      return context;
    } catch (error) {
      console.error('Error getting invoice context:', error);
      return 'Invoice data temporarily unavailable.';
    }
  }

  private async analyzeResponseForActions(query: string, response: string): Promise<{
    action?: 'show_invoice' | 'show_list' | 'show_summary';
    data?: any;
    invoiceId?: string;
  }> {
    const lowerQuery = query.toLowerCase();
    const lowerResponse = response.toLowerCase();

    // Extract invoice ID if mentioned
    const invoiceIdMatch = query.match(/([A-Z]+-[A-Z0-9\-]+|DEMO-\d{4}-\d{4})/i);
    
    if (invoiceIdMatch) {
      // Looking for specific invoice
      const invoiceId = invoiceIdMatch[0];
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          OR: [
            { id: invoiceId },
            { invoiceNumber: { contains: invoiceId } }
          ]
        },
        include: { vendor: true }
      });

      if (invoice) {
        return {
          action: 'show_invoice',
          invoiceId: invoice.id,
          data: invoice
        };
      }
    }

    // Check for list requests
    if (lowerQuery.includes('show') || lowerQuery.includes('list') || lowerQuery.includes('find')) {
      const statusKeywords = ['pending', 'approved', 'rejected', 'exception', 'review'];
      const statusMatch = statusKeywords.find(status => lowerQuery.includes(status));
      
      if (statusMatch || lowerQuery.includes('invoices')) {
        let whereClause: any = {};
        
        if (statusMatch === 'pending') {
          whereClause.status = lowerQuery.includes('approval') ? 'pending_approval' : 'pending';
        } else if (statusMatch === 'approved') {
          whereClause.status = { in: ['approved', 'approved_ready_for_payment'] };
        } else if (statusMatch === 'exception') {
          whereClause.hasIssues = true;
        }

        const filteredInvoices = await this.prisma.invoice.findMany({
          where: whereClause,
          include: { vendor: true },
          orderBy: { receivedDate: 'desc' },
          take: 10
        });

        return {
          action: 'show_list',
          data: filteredInvoices
        };
      }
    }

    // Check for summary requests
    if (lowerQuery.includes('summary') || lowerQuery.includes('overview') || lowerQuery.includes('how many') || lowerQuery.includes('total')) {
      const summaryData = await this.getSummaryData();
      return {
        action: 'show_summary',
        data: summaryData
      };
    }

    return {};
  }

  private async getSummaryData() {
    try {
      const [totalCount, pendingCount, approvedCount, exceptionCount, totalAmount] = await Promise.all([
        this.prisma.invoice.count(),
        this.prisma.invoice.count({ where: { status: 'pending' } }),
        this.prisma.invoice.count({ where: { status: { in: ['approved', 'approved_ready_for_payment'] } } }),
        this.prisma.invoice.count({ where: { hasIssues: true } }),
        this.prisma.invoice.aggregate({ _sum: { amount: true } })
      ]);

      return {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        exceptions: exceptionCount,
        totalAmount: totalAmount._sum.amount || 0
      };
    } catch (error) {
      console.error('Error getting summary data:', error);
      return null;
    }
  }

  public async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}