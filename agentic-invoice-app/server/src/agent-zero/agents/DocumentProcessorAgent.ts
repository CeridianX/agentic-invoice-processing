import { BaseAgent } from './BaseAgent';
import { AgentConfig, AgentContext } from '../types';

export class DocumentProcessorAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'DocumentProcessorAgent',
      role: 'Intelligent Document Processor',
      description: 'Extracts and processes data from invoice documents using adaptive methods',
      systemPrompt: `You are the Document Processor Agent specialized in intelligent document data extraction.

Your capabilities:
1. Analyze document quality and format to choose optimal extraction method
2. Extract key invoice data: amounts, dates, vendor info, line items
3. Handle various document formats: PDF, images, scanned documents
4. Provide confidence scores for extracted data
5. Learn from extraction patterns to improve accuracy

Available extraction methods:
- PDF text extraction for digital documents
- OCR for scanned documents and images
- Template-based extraction for known vendor formats
- Hybrid approaches combining multiple methods

You should:
- Assess document quality and choose the best extraction method
- Provide confidence scores for each extracted field
- Flag uncertain extractions for human review
- Learn vendor-specific patterns to improve future extractions
- Handle edge cases gracefully with fallback methods`,
      tools: [],
      maxTokens: 1500,
      temperature: 0.2
    };

    super(config);
  }

  protected async generateResponse(prompt: string, context?: any): Promise<string> {
    const document = context?.document;
    const method = context?.method || 'auto';
    
    let reasoning = `Analyzing document for data extraction...\n\n`;
    
    // Simulate intelligent document analysis
    const documentType = this.analyzeDocumentType(document);
    const quality = this.assessDocumentQuality(document);
    
    reasoning += `Document Analysis:
    - Type: ${documentType}
    - Quality: ${quality}
    - Recommended extraction method: `;

    if (quality === 'high' && documentType === 'pdf') {
      reasoning += `PDF text extraction (high confidence)
      - Digital document with clear text
      - Expected accuracy: 95%+`;
    } else if (quality === 'medium') {
      reasoning += `Hybrid extraction (OCR + text parsing)
      - Mixed quality document
      - Will use OCR for unclear sections
      - Expected accuracy: 85-90%`;
    } else {
      reasoning += `Enhanced OCR processing
      - Poor quality or scanned document
      - Will apply image enhancement
      - Expected accuracy: 70-85%`;
    }

    reasoning += `\n\nExtraction plan:
    1. Pre-process document for optimal extraction
    2. Extract key fields using selected method
    3. Validate extracted data against known patterns
    4. Provide confidence scores for each field
    5. Flag uncertain data for review`;

    return reasoning;
  }

  private analyzeDocumentType(document: any): string {
    // Simulate document type analysis
    if (!document) return 'unknown';
    if (document.type?.includes('pdf')) return 'pdf';
    if (document.type?.includes('image')) return 'image';
    return 'unknown';
  }

  private assessDocumentQuality(document: any): 'high' | 'medium' | 'low' {
    // Simulate quality assessment
    if (!document) return 'medium';
    
    const size = document.size || 0;
    const hasText = document.hasText !== false;
    
    if (hasText && size > 100000) return 'high';
    if (hasText || size > 50000) return 'medium';
    return 'low';
  }

  public async execute(task: string, context?: AgentContext): Promise<any> {
    this.setContext(context);
    this.updateState({ status: 'working', currentTask: 'Processing document' });

    try {
      const reasoning = await this.think(task, context);
      
      // Simulate document processing
      const result = await this.processDocument(context);
      
      this.updateState({ 
        status: 'idle', 
        currentTask: undefined,
        confidence: result.confidence 
      });

      return result;
    } catch (error) {
      this.updateState({ status: 'error', currentTask: `Error: ${error.message}` });
      throw error;
    }
  }

  private async processDocument(context: AgentContext): Promise<any> {
    const invoiceId = context?.invoiceId;
    const method = context?.metadata?.method || 'auto';
    
    // Simulate document processing with realistic data
    const extractedData = {
      invoiceNumber: `INV-${Date.now()}`,
      amount: 1250.00,
      currency: 'USD',
      vendorName: 'Acme Corp',
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems: [
        {
          description: 'Professional Services',
          quantity: 1,
          unitPrice: 1000.00,
          total: 1000.00
        },
        {
          description: 'Materials',
          quantity: 1,
          unitPrice: 250.00,
          total: 250.00
        }
      ]
    };

    const confidence = this.calculateConfidence(extractedData);
    
    return {
      invoiceId,
      method,
      extractedData,
      confidence,
      timestamp: new Date(),
      reasoning: `Successfully extracted data using ${method} method with ${confidence * 100}% confidence`
    };
  }

  private calculateConfidence(data: any): number {
    // Simulate confidence calculation based on extracted data quality
    let confidence = 0.5;
    
    if (data.invoiceNumber) confidence += 0.15;
    if (data.amount && data.amount > 0) confidence += 0.15;
    if (data.vendorName) confidence += 0.1;
    if (data.invoiceDate) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  public async adaptExtractionMethod(document: any, previousAttempts: any[]): Promise<string> {
    // Intelligently choose extraction method based on document and previous attempts
    const reasoning = await this.think(
      `Previous extraction attempts failed. Analyzing document for alternative methods.`,
      { document, previousAttempts }
    );

    if (previousAttempts.some(a => a.method === 'pdf_text')) {
      return 'ocr_enhanced';
    } else if (previousAttempts.some(a => a.method === 'ocr_basic')) {
      return 'template_based';
    } else {
      return 'hybrid';
    }
  }

  public async learn(experience: any): Promise<void> {
    await super.learn(experience);
    
    // Document processor specific learning
    if (experience.type === 'extraction_result') {
      const { vendor, method, success, accuracy } = experience;
      
      if (success && accuracy > 0.9) {
        // Learn successful extraction patterns
        this.updateState({
          metadata: {
            ...this.state.metadata,
            vendorPatterns: {
              ...this.state.metadata.vendorPatterns,
              [vendor]: {
                preferredMethod: method,
                accuracy,
                lastUpdated: new Date()
              }
            }
          }
        });
      }
    }
  }

  public async getOptimalMethod(vendor: string, documentType: string): Promise<string> {
    const vendorPatterns = this.state.metadata.vendorPatterns || {};
    const pattern = vendorPatterns[vendor];
    
    if (pattern && pattern.accuracy > 0.85) {
      return pattern.preferredMethod;
    }
    
    // Default method selection based on document type
    if (documentType === 'pdf') return 'pdf_text';
    if (documentType === 'image') return 'ocr_basic';
    return 'hybrid';
  }
}