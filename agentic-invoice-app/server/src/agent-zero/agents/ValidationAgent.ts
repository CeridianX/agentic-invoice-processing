import { BaseAgent } from './BaseAgent';
import { AgentConfig, AgentContext } from '../types';

export class ValidationAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'ValidationAgent',
      role: 'Intelligent Invoice Validator',
      description: 'Validates invoice data using business rules and learned patterns',
      systemPrompt: `You are the Validation Agent responsible for comprehensive invoice validation.

Your responsibilities:
1. Validate extracted invoice data against business rules
2. Detect duplicates and potential fraud
3. Verify vendor information and payment terms
4. Check mathematical accuracy of calculations
5. Assess risk levels and flag exceptions
6. Learn from validation patterns to improve accuracy

Validation checks you perform:
- Duplicate detection across time periods and vendors
- Vendor verification against approved lists
- Amount reasonableness checks based on historical data
- Date validation (invoice dates, due dates, payment terms)
- Mathematical verification of line items and totals
- Business rule compliance (approval limits, vendor policies)
- Fraud detection using pattern analysis

You should:
- Provide detailed explanations for validation failures
- Suggest corrections when possible
- Learn from patterns to improve future validations
- Handle edge cases with appropriate escalation
- Maintain high accuracy while minimizing false positives`,
      tools: [],
      maxTokens: 1500,
      temperature: 0.1
    };

    super(config);
  }

  protected async generateResponse(prompt: string, context?: any): Promise<string> {
    const invoice = context?.invoice;
    const level = context?.level || 'basic';
    
    let reasoning = `Performing ${level} validation on invoice data...\n\n`;
    
    const validationResults = this.simulateValidation(invoice, level);
    
    reasoning += `Validation Analysis:
    - Duplicate Check: ${validationResults.duplicateCheck}
    - Amount Validation: ${validationResults.amountValidation}
    - Vendor Verification: ${validationResults.vendorVerification}
    - Date Validation: ${validationResults.dateValidation}
    - Mathematical Check: ${validationResults.mathCheck}
    - PO Validation: ${validationResults.poValidation}
    
    Overall Risk Level: ${validationResults.riskLevel}
    Confidence Score: ${(validationResults.confidence * 100).toFixed(1)}%
    
    ${validationResults.requiresCommunication ? `⚠️ Communication Required: ${validationResults.communicationReason}` : ''}`;

    if (validationResults.issues.length > 0) {
      reasoning += `\n\nIssues Identified:`;
      validationResults.issues.forEach((issue, index) => {
        reasoning += `\n${index + 1}. ${issue}`;
      });
    }

    if (validationResults.recommendations.length > 0) {
      reasoning += `\n\nRecommendations:`;
      validationResults.recommendations.forEach((rec, index) => {
        reasoning += `\n${index + 1}. ${rec}`;
      });
    }

    return reasoning;
  }

  private simulateValidation(invoice: any, level: string) {
    const results = {
      duplicateCheck: 'PASS',
      amountValidation: 'PASS',
      vendorVerification: 'PASS', 
      dateValidation: 'PASS',
      mathCheck: 'PASS',
      poValidation: 'PASS',
      riskLevel: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH',
      confidence: 0.9,
      issues: [] as string[],
      recommendations: [] as string[],
      requiresCommunication: false,
      communicationReason: null as string | null
    };

    if (!invoice) {
      results.issues.push('No invoice data provided');
      results.confidence = 0.0;
      return results;
    }

    // Extract scenario and vendor info for scenario-based validation
    const scenario = invoice.scenario || 'simple';
    const amount = invoice.amount || 0;
    const vendorTrust = invoice.vendor?.trustLevel || 'medium';
    const hasIssues = invoice.hasIssues || false;
    
    console.log(`ValidationAgent: Processing ${scenario} scenario with ${vendorTrust} trust vendor, amount: ${amount}`);

    // Scenario-specific validation logic
    if (scenario === 'duplicate') {
      results.duplicateCheck = 'FAIL';
      results.issues.push('Duplicate invoice number detected');
      results.issues.push('Similar invoice found within 30 days');
      results.riskLevel = 'HIGH';
      results.confidence = 0.65;
      return results;
    }

    if (scenario === 'poor_quality' || hasIssues) {
      results.vendorVerification = 'WARNING';
      results.issues.push('Document quality poor');
      results.issues.push('OCR confidence low');
      results.issues.push('Some fields unclear');
      results.riskLevel = 'MEDIUM';
      results.confidence = 0.72;
      return results;
    }

    if (scenario === 'exceptional' && amount > 20000) {
      results.amountValidation = 'WARNING';
      results.issues.push('High-value transaction');
      results.issues.push('Requires additional verification');
      results.riskLevel = 'HIGH';
      results.confidence = 0.88;
      results.recommendations.push('Valid but requires executive approval');
      return results;
    }

    // Missing PO scenario - requires communication
    if (scenario === 'missing_po') {
      results.poValidation = 'FAIL';
      results.issues.push('Purchase Order reference missing or invalid');
      results.issues.push('PO "PO-2024-7839" not found in system');
      results.riskLevel = 'MEDIUM';
      results.confidence = 0.85; // High confidence in detecting the issue
      results.requiresCommunication = true;
      results.communicationReason = 'missing_po_inquiry';
      results.recommendations.push('Query procurement team for PO clarification');
      results.recommendations.push('Hold invoice processing until PO resolved');
      return results;
    }

    // Standard validations for simple/complex/learning scenarios
    
    // Amount validation
    if (amount <= 0) {
      results.amountValidation = 'FAIL';
      results.issues.push('Invalid invoice amount');
      results.confidence -= 0.3;
    } else if (amount > 10000) {
      results.riskLevel = 'HIGH';
      results.recommendations.push('High-value invoice requires additional approval');
    }

    // Vendor validation with trust level consideration
    const vendorName = invoice.vendorName || invoice.vendor?.name || 'Unknown';
    if (!vendorName || vendorName === 'Unknown') {
      results.vendorVerification = 'FAIL';
      results.issues.push('Vendor information missing or incomplete');
      results.confidence -= 0.2;
    } else if (vendorTrust === 'low') {
      results.vendorVerification = 'WARNING';
      results.issues.push('Low trust vendor requires additional verification');
      results.riskLevel = 'MEDIUM';
      results.confidence -= 0.1;
    }

    // Date validation
    const invoiceDate = new Date(invoice.invoiceDate);
    const now = new Date();
    if (invoiceDate > now) {
      results.dateValidation = 'FAIL';
      results.issues.push('Invoice date is in the future');
      results.confidence -= 0.2;
    }

    // Enhanced validation for comprehensive level
    if (level === 'comprehensive') {
      if (vendorName && vendorName.includes('New')) {
        results.riskLevel = 'MEDIUM';
        results.recommendations.push('New vendor - verify credentials before payment');
      }
    }

    // For simple scenarios with high-trust vendors and reasonable amounts, ensure high confidence
    if (scenario === 'simple' && vendorTrust === 'high' && amount < 1000 && results.issues.length === 0) {
      results.confidence = 0.95;
      results.recommendations.push('Standard processing - approved for auto-payment');
    }

    // Adjust confidence based on issues
    if (results.issues.length > 2) {
      results.confidence = Math.max(0.3, results.confidence - 0.2);
    }

    return results;
  }

  public async execute(task: string, context?: AgentContext): Promise<any> {
    this.setContext(context);
    this.updateState({ status: 'working', currentTask: 'Validating invoice data' });

    try {
      const reasoning = await this.think(task, context);
      
      const result = await this.validateInvoice(context);
      
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

  private async validateInvoice(context: AgentContext): Promise<any> {
    const invoiceId = context?.invoiceId;
    const invoice = context?.metadata?.invoice;
    const level = context?.metadata?.level || 'basic';
    
    const validationResults = this.simulateValidation(invoice, level);
    
    return {
      invoiceId,
      validationLevel: level,
      isValid: validationResults.issues.length === 0,
      riskLevel: validationResults.riskLevel,
      confidence: validationResults.confidence,
      checks: {
        duplicateCheck: validationResults.duplicateCheck,
        amountValidation: validationResults.amountValidation,
        vendorVerification: validationResults.vendorVerification,
        dateValidation: validationResults.dateValidation,
        mathCheck: validationResults.mathCheck,
        poValidation: validationResults.poValidation
      },
      issues: validationResults.issues,
      recommendations: validationResults.recommendations,
      requiresCommunication: validationResults.requiresCommunication,
      communicationReason: validationResults.communicationReason,
      timestamp: new Date()
    };
  }

  public async checkDuplicates(invoice: any): Promise<{
    isDuplicate: boolean;
    confidence: number;
    similarInvoices: any[];
  }> {
    // Simulate duplicate detection logic
    const reasoning = await this.think(
      `Checking for duplicate invoices for vendor: ${invoice.vendorName}, amount: ${invoice.amount}`,
      { invoice }
    );

    // Simulate finding similar invoices
    const similarInvoices = [];
    const isDuplicate = Math.random() > 0.9; // 10% chance of duplicate for demo

    if (isDuplicate) {
      similarInvoices.push({
        id: 'similar-1',
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        vendorName: invoice.vendorName,
        similarity: 0.95
      });
    }

    return {
      isDuplicate,
      confidence: isDuplicate ? 0.95 : 0.99,
      similarInvoices
    };
  }

  public async assessRisk(invoice: any, vendor: any): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    riskFactors: string[];
    confidence: number;
  }> {
    const reasoning = await this.think(
      `Assessing risk for invoice: ${invoice.invoiceNumber} from vendor: ${vendor?.name}`,
      { invoice, vendor }
    );

    const riskFactors = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    // Simulate risk assessment
    if (invoice.amount > 5000) {
      riskFactors.push('High value transaction');
      riskLevel = 'MEDIUM';
    }

    if (!vendor || vendor.trustLevel === 'low') {
      riskFactors.push('Unverified or low-trust vendor');
      riskLevel = 'HIGH';
    }

    if (invoice.paymentTerms && invoice.paymentTerms.includes('immediate')) {
      riskFactors.push('Unusual payment terms');
      riskLevel = 'MEDIUM';
    }

    return {
      riskLevel,
      riskFactors,
      confidence: 0.85
    };
  }

  public async learn(experience: any): Promise<void> {
    await super.learn(experience);
    
    // Validation agent specific learning
    if (experience.type === 'validation_feedback') {
      const { invoiceId, wasAccurate, actualIssues } = experience;
      
      // Learn from validation accuracy
      if (wasAccurate) {
        this.updateState({
          metadata: {
            ...this.state.metadata,
            successfulValidations: (this.state.metadata.successfulValidations || 0) + 1
          }
        });
      } else {
        // Learn from mistakes
        this.updateState({
          metadata: {
            ...this.state.metadata,
            improvementAreas: [
              ...(this.state.metadata.improvementAreas || []),
              { invoiceId, missedIssues: actualIssues, timestamp: new Date() }
            ]
          }
        });
      }
    }

    if (experience.type === 'duplicate_detection') {
      const { vendor, pattern, accuracy } = experience;
      
      // Learn vendor-specific duplicate patterns
      this.updateState({
        metadata: {
          ...this.state.metadata,
          duplicatePatterns: {
            ...this.state.metadata.duplicatePatterns,
            [vendor]: { pattern, accuracy, lastUpdated: new Date() }
          }
        }
      });
    }
  }
}