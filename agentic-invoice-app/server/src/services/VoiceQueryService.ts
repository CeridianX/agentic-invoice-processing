import { PrismaClient } from '@prisma/client';

export interface VoiceQueryResult {
  type: 'invoice_status' | 'invoice_search' | 'general_info' | 'error';
  data?: any;
  message: string;
  invoiceId?: string;
}

export class VoiceQueryService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  public async processQuery(query: string): Promise<VoiceQueryResult> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      
      console.log(`🎤 Processing query: "${normalizedQuery}"`);
      console.log(`🔍 Is status query: ${this.isInvoiceStatusQuery(normalizedQuery)}`);
      console.log(`🔍 Is search query: ${this.isInvoiceSearchQuery(normalizedQuery)}`);
      console.log(`🔍 Is general query: ${this.isGeneralInfoQuery(normalizedQuery)}`);
      
      // Invoice status queries
      if (this.isInvoiceStatusQuery(normalizedQuery)) {
        console.log(`📊 Processing as status query`);
        return await this.handleInvoiceStatusQuery(normalizedQuery);
      }
      
      // Invoice search queries
      if (this.isInvoiceSearchQuery(normalizedQuery)) {
        console.log(`🔍 Processing as search query`);
        return await this.handleInvoiceSearchQuery(normalizedQuery);
      }
      
      // General information queries
      if (this.isGeneralInfoQuery(normalizedQuery)) {
        console.log(`📈 Processing as general info query`);
        return await this.handleGeneralInfoQuery(normalizedQuery);
      }
      
      // Fallback for unrecognized queries
      console.log(`❓ Query not recognized, using fallback`);
      return {
        type: 'error',
        message: 'I didn\'t understand that request. Try asking about a specific invoice status or searching for invoices.'
      };
      
    } catch (error) {
      console.error('Error processing voice query:', error);
      return {
        type: 'error',
        message: 'Sorry, I encountered an error processing your request. Please try again.'
      };
    }
  }

  private isInvoiceStatusQuery(query: string): boolean {
    const statusKeywords = ['status', 'what is', 'tell me about', 'what\'s'];
    const invoiceIdentifiers = ['demo-', 'inv-'];
    
    console.log(`🔍 Status query check - Keywords found: ${statusKeywords.filter(k => query.includes(k))}`);
    console.log(`🔍 Status query check - Identifiers found: ${invoiceIdentifiers.filter(i => query.includes(i))}`);
    console.log(`🔍 Status query check - Contains 'invoices': ${query.includes('invoices')}`);
    
    // Must have both status keywords and specific invoice identifiers
    return statusKeywords.some(keyword => query.includes(keyword)) &&
           invoiceIdentifiers.some(identifier => query.includes(identifier)) &&
           !query.includes('invoices'); // Don't match plural "invoices"
  }

  private isInvoiceSearchQuery(query: string): boolean {
    const searchKeywords = ['show me', 'list', 'find', 'get', 'display'];
    const statusKeywords = ['pending', 'approved', 'rejected', 'exception', 'ready', 'approval', 'review'];
    
    // Match if it's asking for multiple invoices or specific status
    return (searchKeywords.some(keyword => query.includes(keyword)) &&
           (statusKeywords.some(status => query.includes(status)) || query.includes('invoices'))) ||
           query.includes('pending invoices') ||
           query.includes('approved invoices') ||
           query.includes('in approval') ||
           query.includes('pending approval');
  }

  private isGeneralInfoQuery(query: string): boolean {
    const generalKeywords = ['how many', 'total', 'count', 'summary', 'dashboard', 'metrics'];
    return generalKeywords.some(keyword => query.includes(keyword));
  }

  private async handleInvoiceStatusQuery(query: string): Promise<VoiceQueryResult> {
    // Extract invoice identifier
    const invoiceId = this.extractInvoiceId(query);
    
    console.log(`🔍 Extracted invoice ID: "${invoiceId}" from query: "${query}"`);
    
    if (!invoiceId) {
      return {
        type: 'error',
        message: 'I couldn\'t find an invoice number in your request. Please specify the invoice ID.'
      };
    }

    try {
      console.log(`🔍 Searching for invoice with ID or number containing: "${invoiceId}"`);
      
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          OR: [
            { id: invoiceId },
            { invoiceNumber: { contains: invoiceId } }
          ]
        },
        include: {
          vendor: true
        }
      });

      console.log(`🔍 Found invoice:`, invoice ? `${invoice.invoiceNumber} (${invoice.id})` : 'null');

      if (!invoice) {
        return {
          type: 'error',
          message: `I couldn't find invoice ${invoiceId}. Please check the invoice number and try again.`
        };
      }

      const statusMessage = this.formatInvoiceStatus(invoice);
      
      return {
        type: 'invoice_status',
        data: invoice,
        message: statusMessage,
        invoiceId: invoice.id
      };

    } catch (error) {
      console.error('Error fetching invoice:', error);
      return {
        type: 'error',
        message: 'I encountered an error looking up that invoice. Please try again.'
      };
    }
  }

  private async handleInvoiceSearchQuery(query: string): Promise<VoiceQueryResult> {
    let whereClause: any = {};
    let statusFilter = '';

    // Determine status filter
    if (query.includes('pending') && !query.includes('approval')) {
      whereClause.status = 'pending';
      statusFilter = 'pending';
    } else if (query.includes('approval') || query.includes('pending approval') || query.includes('in approval')) {
      whereClause.status = 'pending_approval';
      statusFilter = 'pending approval';
    } else if (query.includes('approved') && !query.includes('approval')) {
      whereClause.status = { in: ['approved', 'approved_ready_for_payment'] };
      statusFilter = 'approved';
    } else if (query.includes('exception') || query.includes('issue')) {
      whereClause.hasIssues = true;
      statusFilter = 'with exceptions';
    } else if (query.includes('ready')) {
      whereClause.status = 'approved_ready_for_payment';
      statusFilter = 'ready for payment';
    } else if (query.includes('review') || query.includes('requires review')) {
      whereClause.status = 'requires_review';
      statusFilter = 'requiring review';
    }

    try {
      const invoices = await this.prisma.invoice.findMany({
        where: whereClause,
        include: {
          vendor: true
        },
        orderBy: {
          receivedDate: 'desc'
        },
        take: 10 // Limit results for voice response
      });

      if (invoices.length === 0) {
        return {
          type: 'invoice_search',
          data: [],
          message: `No invoices found ${statusFilter ? `with status ${statusFilter}` : ''}. All invoices may be processed or you may need to check your search criteria.`
        };
      }

      const message = this.formatSearchResults(invoices, statusFilter);
      
      return {
        type: 'invoice_search',
        data: invoices,
        message
      };

    } catch (error) {
      console.error('Error searching invoices:', error);
      return {
        type: 'error',
        message: 'I encountered an error searching for invoices. Please try again.'
      };
    }
  }

  private async handleGeneralInfoQuery(query: string): Promise<VoiceQueryResult> {
    try {
      const [totalCount, pendingCount, approvedCount, exceptionCount] = await Promise.all([
        this.prisma.invoice.count(),
        this.prisma.invoice.count({ where: { status: 'pending' } }),
        this.prisma.invoice.count({ where: { status: { in: ['approved', 'approved_ready_for_payment'] } } }),
        this.prisma.invoice.count({ where: { hasIssues: true } })
      ]);

      const message = `You have ${totalCount} total invoices. ${pendingCount} are pending processing, ${approvedCount} are approved, and ${exceptionCount} require attention due to exceptions.`;

      return {
        type: 'general_info',
        data: {
          total: totalCount,
          pending: pendingCount,
          approved: approvedCount,
          exceptions: exceptionCount
        },
        message
      };

    } catch (error) {
      console.error('Error getting general info:', error);
      return {
        type: 'error',
        message: 'I encountered an error getting the summary information. Please try again.'
      };
    }
  }

  private extractInvoiceId(query: string): string | null {
    // Look for patterns like "ABC-123", "DEMO-2024-0001", etc.
    const patterns = [
      /([A-Z]+-[A-Z0-9\-]+)/gi,
      /([A-Z]+\d+)/gi,
      /([A-Z]+-\d+)/gi,
      /(DEMO-\d{4}-\d{4})/gi
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return match[0].toUpperCase();
      }
    }

    return null;
  }

  private formatInvoiceStatus(invoice: any): string {
    const vendor = invoice.vendor?.name || 'Unknown Vendor';
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.amount);
    
    let statusText = '';
    switch (invoice.status) {
      case 'pending':
        statusText = 'is pending processing';
        break;
      case 'approved':
        statusText = 'has been approved';
        break;
      case 'approved_ready_for_payment':
        statusText = 'is approved and ready for payment';
        break;
      case 'pending_internal_review':
        statusText = 'is under internal review';
        break;
      case 'rejected':
        statusText = 'has been rejected';
        break;
      default:
        statusText = `has status ${invoice.status}`;
    }

    let message = `Invoice ${invoice.invoiceNumber} from ${vendor} for ${amount} ${statusText}.`;

    if (invoice.hasIssues) {
      message += ' This invoice has been flagged for review due to potential issues.';
    }

    if (invoice.agentReasoning) {
      message += ` AI analysis: ${invoice.agentReasoning}`;
    }

    return message;
  }

  private formatSearchResults(invoices: any[], statusFilter: string): string {
    const count = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount);

    let message = `I found ${count} invoice${count > 1 ? 's' : ''}`;
    
    if (statusFilter) {
      message += ` ${statusFilter}`;
    }
    
    message += ` totaling ${formattedAmount}.`;

    if (count <= 3) {
      const invoiceList = invoices.map(inv => 
        `${inv.invoiceNumber} from ${inv.vendor?.name || 'Unknown'} for ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inv.amount)}`
      ).join(', ');
      message += ` They are: ${invoiceList}.`;
    } else {
      message += ` The most recent ones include invoices from ${invoices.slice(0, 3).map(inv => inv.vendor?.name || 'Unknown').join(', ')}.`;
    }

    return message;
  }

  public async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}