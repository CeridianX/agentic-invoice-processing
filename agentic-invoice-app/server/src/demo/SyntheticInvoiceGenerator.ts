import { PrismaClient } from '@prisma/client';

export interface DemoScenario {
  name: string;
  description: string;
  expectedOutcome: string;
  processingTime: string;
  complexity: 'simple' | 'complex' | 'exceptional';
}

export interface SyntheticInvoiceOptions {
  scenario?: string;
  vendorType?: 'trusted' | 'new' | 'risky';
  amountRange?: 'micro' | 'small' | 'medium' | 'large' | 'exceptional';
  documentQuality?: 'high' | 'medium' | 'poor';
  hasDuplicate?: boolean;
  customAmount?: number;
  customVendor?: string;
}

export class SyntheticInvoiceGenerator {
  private prisma: PrismaClient;
  private invoiceCounter = 1;

  constructor() {
    this.prisma = new PrismaClient();
  }

  public getAvailableScenarios(): DemoScenario[] {
    return [
      {
        name: 'simple',
        description: 'Small invoice from trusted vendor',
        expectedOutcome: 'Auto-approved in 2-3 seconds',
        processingTime: '2-3s',
        complexity: 'simple'
      },
      {
        name: 'complex',
        description: 'High-value invoice from new vendor',
        expectedOutcome: 'Manager approval required',
        processingTime: '3-5s',
        complexity: 'complex'
      },
      {
        name: 'duplicate',
        description: 'Duplicate invoice detection test',
        expectedOutcome: 'Flagged for review',
        processingTime: '4-6s',
        complexity: 'complex'
      },
      {
        name: 'exceptional',
        description: 'Very high-value from risky vendor',
        expectedOutcome: 'Executive approval + verification',
        processingTime: '5-8s',
        complexity: 'exceptional'
      },
      {
        name: 'learning',
        description: 'Series showing system improvement',
        expectedOutcome: 'Faster processing over time',
        processingTime: '5s → 2s',
        complexity: 'simple'
      },
      {
        name: 'poor_quality',
        description: 'Poor quality scanned document',
        expectedOutcome: 'Enhanced OCR processing',
        processingTime: '6-10s',
        complexity: 'complex'
      },
      {
        name: 'missing_po',
        description: 'Invoice with missing/invalid PO reference',
        expectedOutcome: 'AI queries procurement team',
        processingTime: 'Waiting for internal response',
        complexity: 'complex'
      }
    ];
  }

  public async generateInvoice(options: SyntheticInvoiceOptions = {}): Promise<any> {
    const scenario = options.scenario || 'simple';
    const vendors = await this.getVendors();

    if (vendors.length === 0) {
      throw new Error('No vendors found. Please seed vendor data first.');
    }

    const invoiceData = this.createInvoiceByScenario(scenario, vendors, options);
    
    // Create the invoice in database
    const invoice = await this.prisma.invoice.create({
      data: invoiceData,
      include: {
        vendor: true
      }
    });

    console.log(`📝 Created synthetic invoice: ${invoice.invoiceNumber} (${scenario})`);
    return invoice;
  }

  public async generateBatch(count: number, scenarios?: string[]): Promise<any[]> {
    const invoices = [];
    const availableScenarios = scenarios || ['simple', 'complex', 'duplicate'];

    for (let i = 0; i < count; i++) {
      const scenario = availableScenarios[i % availableScenarios.length];
      const invoice = await this.generateInvoice({ scenario });
      invoices.push(invoice);
      
      // Small delay to make sequential creation visible
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return invoices;
  }

  private createInvoiceByScenario(
    scenario: string, 
    vendors: any[], 
    options: SyntheticInvoiceOptions
  ): any {
    const baseInvoice = this.createBaseInvoice();

    switch (scenario) {
      case 'simple':
        return this.createSimpleInvoice(baseInvoice, vendors, options);
      
      case 'complex':
        return this.createComplexInvoice(baseInvoice, vendors, options);
      
      case 'duplicate':
        return this.createDuplicateInvoice(baseInvoice, vendors, options);
      
      case 'exceptional':
        return this.createExceptionalInvoice(baseInvoice, vendors, options);
      
      case 'learning':
        return this.createLearningInvoice(baseInvoice, vendors, options);
      
      case 'poor_quality':
        return this.createPoorQualityInvoice(baseInvoice, vendors, options);
      
      case 'missing_po':
        return this.createMissingPOInvoice(baseInvoice, vendors, options);
      
      default:
        return this.createSimpleInvoice(baseInvoice, vendors, options);
    }
  }

  private createBaseInvoice(): any {
    const now = new Date();
    const invoiceNumber = `DEMO-${now.getFullYear()}-${String(this.invoiceCounter++).padStart(4, '0')}`;
    
    return {
      invoiceNumber,
      invoiceDate: now,
      receivedDate: now,
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      currency: 'USD',
      paymentTerms: 'Net 30',
      status: 'pending'
    };
  }

  private createSimpleInvoice(base: any, vendors: any[], options: SyntheticInvoiceOptions): any {
    const trustedVendors = vendors.filter(v => v.trustLevel === 'high');
    const vendor = trustedVendors[Math.floor(Math.random() * trustedVendors.length)];
    
    return {
      ...base,
      vendorId: vendor.id,
      amount: options.customAmount || this.randomAmount(50, 800), // Under $1000 for auto-approval
      scenario: 'simple',
      notes: 'Demo: Simple invoice for fast auto-approval'
    };
  }

  private createComplexInvoice(base: any, vendors: any[], options: SyntheticInvoiceOptions): any {
    const mediumVendors = vendors.filter(v => v.trustLevel === 'medium');
    const vendor = mediumVendors.length > 0 
      ? mediumVendors[Math.floor(Math.random() * mediumVendors.length)]
      : vendors[Math.floor(Math.random() * vendors.length)];
    
    return {
      ...base,
      vendorId: vendor.id,
      amount: options.customAmount || this.randomAmount(2000, 8000), // Requires approval
      scenario: 'complex',
      notes: 'Demo: High-value invoice requiring manager approval'
    };
  }

  private createDuplicateInvoice(base: any, vendors: any[], options: SyntheticInvoiceOptions): any {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    
    // Use a recently used invoice number pattern to trigger duplicate detection
    const duplicateNumber = `DEMO-2024-${String(this.invoiceCounter - 2).padStart(4, '0')}`;
    
    return {
      ...base,
      invoiceNumber: duplicateNumber,
      vendorId: vendor.id,
      amount: options.customAmount || this.randomAmount(500, 2000),
      scenario: 'duplicate',
      notes: 'Demo: Duplicate invoice for fraud detection testing'
    };
  }

  private createExceptionalInvoice(base: any, vendors: any[], options: SyntheticInvoiceOptions): any {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    
    return {
      ...base,
      vendorId: vendor.id,
      amount: options.customAmount || this.randomAmount(15000, 50000), // Very high value
      scenario: 'exceptional',
      notes: 'Demo: Exceptional high-value invoice requiring executive approval',
      hasIssues: true // Flag for extra scrutiny
    };
  }

  private createLearningInvoice(base: any, vendors: any[], options: SyntheticInvoiceOptions): any {
    const vendor = vendors.find(v => v.name.includes('TechCorp')) || vendors[0];
    
    return {
      ...base,
      vendorId: vendor.id,
      amount: options.customAmount || this.randomAmount(800, 1200), // Consistent pattern
      scenario: 'learning',
      notes: 'Demo: Similar invoice to demonstrate learning progression'
    };
  }

  private createPoorQualityInvoice(base: any, vendors: any[], options: SyntheticInvoiceOptions): any {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    
    return {
      ...base,
      vendorId: vendor.id,
      amount: options.customAmount || this.randomAmount(300, 1500),
      scenario: 'poor_quality',
      notes: 'Demo: Poor quality document requiring enhanced OCR processing',
      hasIssues: true // Simulate document quality issues
    };
  }

  private createMissingPOInvoice(base: any, vendors: any[], options: SyntheticInvoiceOptions): any {
    // Use a mix of trusted and medium vendors for this scenario
    const eligibleVendors = vendors.filter(v => ['high', 'medium'].includes(v.trustLevel));
    const vendor = eligibleVendors[Math.floor(Math.random() * eligibleVendors.length)];
    
    return {
      ...base,
      vendorId: vendor.id,
      amount: options.customAmount || this.randomAmount(1500, 8000), // Medium amounts
      scenario: 'missing_po',
      hasIssues: true, // Mark as having issues for exception counting
      status: 'pending_internal_review', // New status for AI internal queries
      poId: null, // Explicitly no PO reference
      notes: 'Invoice references PO "PO-2024-7839" which is not found in our system. AI has queried procurement team for clarification.',
      // Agent Zero specific fields for this scenario
      agentProcessingStarted: new Date(), // Processing has started
      agentProcessingCompleted: null, // But not completed - waiting for response
      agentConfidence: 0.85, // High confidence that this is the issue
      agentReasoning: 'Invoice validation failed due to missing PO reference "PO-2024-7839". Automatically generated query to procurement team for clarification. Awaiting response.',
      workflowRoute: 'internal_query',
      processingTimeMs: null // Will be set when internal response is received
    };
  }

  private randomAmount(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  private async getVendors(): Promise<any[]> {
    return await this.prisma.vendor.findMany();
  }

  public async createRealisticScenarios(): Promise<any[]> {
    console.log('🎬 Creating realistic demo scenarios...');
    
    const scenarios = [
      { scenario: 'simple', description: 'Office supplies - auto approval' },
      { scenario: 'complex', description: 'New vendor equipment purchase' },
      { scenario: 'learning', description: 'Recurring service invoice' },
      { scenario: 'exceptional', description: 'Major infrastructure investment' },
      { scenario: 'missing_po', description: 'Invoice with missing PO - AI queries procurement' }
    ];

    const invoices = [];
    for (const scenarioConfig of scenarios) {
      const invoice = await this.generateInvoice(scenarioConfig);
      invoices.push(invoice);
      console.log(`  ✅ ${scenarioConfig.description}`);
    }

    console.log(`🚀 Created ${invoices.length} demo scenarios!`);
    return invoices;
  }

  public async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}