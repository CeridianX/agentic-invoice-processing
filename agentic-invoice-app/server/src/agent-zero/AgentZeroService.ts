import { EventEmitter } from 'events';
import { AgentOrchestrator } from './orchestration/AgentOrchestrator';
import { PrismaClient } from '@prisma/client';
import { InvoiceProcessingResult } from './types';
import { AdaptiveLearningSystem } from './learning/AdaptiveLearningSystem';

export class AgentZeroService extends EventEmitter {
  private static instance: AgentZeroService;
  public orchestrator: AgentOrchestrator;
  public prisma: PrismaClient;
  private learningSystem: AdaptiveLearningSystem;
  private initialized = false;

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.orchestrator = new AgentOrchestrator();
    this.learningSystem = new AdaptiveLearningSystem();
    this.setupEventHandlers();
  }

  public static getInstance(): AgentZeroService {
    if (!AgentZeroService.instance) {
      AgentZeroService.instance = new AgentZeroService();
    }
    return AgentZeroService.instance;
  }

  public static setInstance(instance: AgentZeroService): void {
    AgentZeroService.instance = instance;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async cleanup(): Promise<void> {
    try {
      console.log('Cleaning up Agent Zero service...');
      this.initialized = false;
      
      // Clear any ongoing processing
      this.removeAllListeners();
      
      // Disconnect Prisma
      if (this.prisma) {
        await this.prisma.$disconnect();
      }
      
      console.log('Agent Zero service cleanup completed');
    } catch (error) {
      console.error('Error during Agent Zero cleanup:', error);
    }
  }

  private setupEventHandlers(): void {
    // Forward orchestrator events
    this.orchestrator.on('processing_started', (data) => {
      console.log(`Agent Zero: Processing started for invoice ${data.invoiceId}`);
      this.emit('processing_started', data);
    });

    this.orchestrator.on('plan_created', (data) => {
      console.log(`Agent Zero: Orchestration plan created`, data.plan);
      this.emit('plan_created', data);
    });

    this.orchestrator.on('coordinator_started', (data) => {
      console.log(`Agent Zero: Coordinator started - ${data.action}`);
      this.emit('coordinator_started', data);
    });

    this.orchestrator.on('coordinator_completed', (data) => {
      console.log(`Agent Zero: Coordinator completed - Plan created with ${data.result.stepsCount} steps`);
      this.emit('coordinator_completed', data);
    });

    this.orchestrator.on('step_started', (data) => {
      console.log(`Agent Zero: Step started - ${data.step.agentName}: ${data.step.action}`);
      this.emit('step_started', data);
    });

    this.orchestrator.on('step_completed', (data) => {
      console.log(`Agent Zero: Step completed - ${data.stepId}`);
      this.emit('step_completed', data);
    });

    this.orchestrator.on('step_failed', (data) => {
      console.error(`Agent Zero: Step failed - ${data.stepId}: ${data.error}`);
      this.emit('step_failed', data);
    });

    this.orchestrator.on('processing_completed', (data) => {
      console.log(`Agent Zero: Processing completed for invoice ${data.invoiceId}`);
      this.emit('processing_completed', data);
    });

    this.orchestrator.on('processing_error', (data) => {
      console.error(`Agent Zero: Processing error for invoice ${data.invoiceId}: ${data.error}`);
      this.emit('processing_error', data);
    });

    // Communication event handlers
    this.orchestrator.on('communication_initiated', (data) => {
      console.log(`Agent Zero: Communication initiated for invoice ${data.invoiceId}`);
      this.emit('communication_initiated', data);
    });

    this.orchestrator.on('communication_sent', (data) => {
      console.log(`Agent Zero: Communication sent - ${data.subject}`);
      this.emit('communication_sent', data);
    });

    this.orchestrator.on('communication_received', (data) => {
      console.log(`Agent Zero: Communication response received for ${data.scenario}`);
      this.emit('communication_received', data);
    });

    this.orchestrator.on('communication_resolved', (data) => {
      console.log(`Agent Zero: Communication resolved for invoice ${data.invoiceId}`);
      this.emit('communication_resolved', data);
    });
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing Agent Zero service...');
      
      // Verify database connection
      await this.prisma.$connect();
      console.log('Database connection established');

      // Initialize orchestrator (already done in constructor)
      console.log('Agent orchestrator ready');

      this.initialized = true;
      console.log('Agent Zero service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Agent Zero service:', error);
      throw error;
    }
  }

  public async processInvoice(invoiceId: string, options?: { learningIteration?: number; expectedImprovement?: boolean }): Promise<InvoiceProcessingResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    let invoiceData: any = null;

    try {
      // Fetch invoice data from database
      invoiceData = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { vendor: true, lineItems: true }
      });

      if (!invoiceData) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      // Update invoice status to processing and set processing started timestamp
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { 
          agentProcessingStarted: new Date(),
          status: 'processing' // Change from 'queued' to 'processing'
        }
      });

      console.log(`Agent Zero: Starting intelligent processing for invoice ${invoiceData.invoiceNumber}${options?.learningIteration ? ` (Learning iteration ${options.learningIteration})` : ''}`);
      
      // Get predictive insights before processing
      const insights = await this.learningSystem.getPredictiveInsights({
        amount: invoiceData.amount,
        vendor: invoiceData.vendor,
        learningIteration: options?.learningIteration
      });
      
      console.log(`Agent Zero: Predictive insights - ${insights.reasoning} (confidence: ${insights.confidence})`);
      
      const result = await this.orchestrator.processInvoice(invoiceData);
      
      // Update invoice in database with results
      await this.updateInvoiceWithResults(invoiceId, result);
      
      // Record learning experience
      const processingTime = Date.now() - startTime;
      await this.recordProcessingExperience(invoiceData, result, processingTime, insights);
      
      return result;
    } catch (error) {
      console.error('Agent Zero processing failed:', error);
      
      // Record failure for learning
      try {
        await this.learningSystem.recordExperience({
          type: 'processing_efficiency',
          context: {
            invoiceId: invoiceId,
            amount: invoiceData?.amount || 0,
            vendor: invoiceData?.vendor || { name: 'Unknown' }
          },
          outcome: {
            success: false,
            error: error.message,
            processingTime: Date.now() - startTime
          },
          confidence: 0.2
        });
      } catch (learningError) {
        console.warn('Failed to record learning experience:', learningError.message);
      }

      // Update invoice with error status but don't fail completely
      try {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { 
            agentProcessingCompleted: new Date(),
            agentConfidence: 0.1,
            agentReasoning: `Processing failed: ${error.message}`,
            processingTimeMs: Date.now() - startTime
          }
        });
      } catch (dbError) {
        console.warn('Failed to update invoice with error status:', dbError.message);
      }

      // For demo purposes, return a graceful failure result instead of throwing
      return {
        invoiceId: invoiceData.id || 'unknown',
        extractedData: {},
        validation: { 
          isValid: false, 
          confidence: 0.1, 
          issues: [`Processing error: ${error.message}`] 
        },
        workflow: { 
          recommendedActions: ['Manual review required'], 
          approvalRequired: true, 
          priority: 'medium' 
        },
        agentInsights: { 
          recommendations: ['Processing error - manual review required'], 
          patterns: [], 
          learnings: [] 
        }
      };
    }
  }

  private async updateInvoiceWithResults(
    invoiceId: string, 
    result: InvoiceProcessingResult
  ): Promise<void> {
    try {
      // Update invoice status based on Agent Zero results
      let status = 'processed';
      let approvalStatus = 'pending';

      // Handle validation issues - require review but don't auto-reject
      if (!result.validation.isValid) {
        status = 'requires_review';
        approvalStatus = 'pending'; // Requires human review, not auto-rejected
      } 
      // Handle cases where validation passed but approval is needed
      else if (result.workflow.approvalRequired) {
        status = 'pending_approval';
        approvalStatus = 'pending';
      } 
      // Handle auto-approval cases (small amounts from trusted vendors)
      else {
        status = 'approved';
        approvalStatus = 'approved';
      }

      // Extract assignee from workflow result
      let assignedTo = null;
      if (result.workflow.priority === 'high') {
        assignedTo = 'executive-team';
      } else if (result.workflow.approvalRequired) {
        assignedTo = 'manager';
      }

      // Compile notes from Agent Zero insights
      const notes = [
        `Agent Zero Processing Results:`,
        `- Validation Confidence: ${(result.validation.confidence * 100).toFixed(1)}%`,
        `- Workflow Priority: ${result.workflow.priority}`,
        `- Approval Required: ${result.workflow.approvalRequired ? 'Yes' : 'No'}`,
        ''
      ];

      if (result.validation.issues.length > 0) {
        notes.push('Issues Found:');
        result.validation.issues.forEach(issue => {
          notes.push(`- ${issue}`);
        });
        notes.push('');
      }

      if (result.agentInsights.recommendations.length > 0) {
        notes.push('Recommendations:');
        result.agentInsights.recommendations.forEach(rec => {
          notes.push(`- ${rec}`);
        });
        notes.push('');
      }

      if (result.agentInsights.patterns.length > 0) {
        notes.push('Patterns Identified:');
        result.agentInsights.patterns.forEach(pattern => {
          notes.push(`- ${pattern}`);
        });
      }

      const updateData: any = {
        status,
        approvalStatus,
        notes: notes.join('\n'),
        agentProcessingCompleted: new Date()
      };

      if (assignedTo) {
        updateData.assignedTo = assignedTo;
      }

      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: updateData
      });

      console.log(`Invoice ${invoiceId} updated with Agent Zero results`);
    } catch (error) {
      console.error('Failed to update invoice with Agent Zero results:', error);
      // Don't throw - this is not critical to the main processing flow
    }
  }

  public async getAgentStatus(): Promise<any> {
    if (!this.initialized) {
      return { status: 'not_initialized' };
    }

    const activeAgents = this.orchestrator.getActiveAgents();
    const activePlans = this.orchestrator.getActivePlans();

    const agentStatuses = {};
    for (const agentName of activeAgents) {
      agentStatuses[agentName] = this.orchestrator.getAgentStatus(agentName);
    }

    return {
      status: 'running',
      initialized: this.initialized,
      activeAgents: activeAgents.length,
      activePlans: activePlans.length,
      agentStatuses
    };
  }

  public async getProcessingInsights(): Promise<any> {
    try {
      // Get recent agent activities
      const activities = await this.prisma.agentActivity.findMany({
        orderBy: { timestamp: 'desc' },
        take: 50,
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              amount: true,
              vendor: {
                select: { name: true }
              }
            }
          }
        }
      });

      // Calculate processing statistics
      const totalProcessed = activities.length;
      const avgConfidence = activities
        .filter(a => a.confidenceLevel !== null)
        .reduce((sum, a) => sum + (a.confidenceLevel || 0), 0) / totalProcessed;

      const agentActivityCounts = activities.reduce((counts, activity) => {
        const agentName = (activity.metadata as any)?.agentName || 'Unknown';
        counts[agentName] = (counts[agentName] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      // Get recent successful processing patterns
      const recentSuccesses = activities.filter(a => 
        a.activityType === 'processing_completed' && 
        a.confidenceLevel > 0.8
      );

      return {
        summary: {
          totalProcessed,
          averageConfidence: avgConfidence,
          successRate: recentSuccesses.length / totalProcessed,
          agentUtilization: agentActivityCounts
        },
        recentActivities: activities.slice(0, 10),
        patterns: {
          highConfidenceProcessing: recentSuccesses.length,
          commonIssues: this.identifyCommonIssues(activities),
          processingTrends: this.analyzeProcessingTrends(activities)
        }
      };
    } catch (error) {
      console.error('Failed to get processing insights:', error);
      return { error: error.message };
    }
  }

  private identifyCommonIssues(activities: any[]): string[] {
    const issues = [];
    
    const validationFailures = activities.filter(a => 
      a.description?.includes('validation') && a.confidenceLevel < 0.7
    );
    
    if (validationFailures.length > 5) {
      issues.push('Frequent validation issues detected');
    }

    const documentProcessingIssues = activities.filter(a =>
      a.description?.includes('document') && a.metadata?.error
    );

    if (documentProcessingIssues.length > 3) {
      issues.push('Document processing challenges identified');
    }

    return issues;
  }

  private analyzeProcessingTrends(activities: any[]): any {
    const last24h = activities.filter(a => 
      new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const last7d = activities.filter(a =>
      new Date(a.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return {
      daily: {
        processed: last24h.length,
        avgConfidence: last24h.length > 0 ? 
          last24h.reduce((sum, a) => sum + (a.confidenceLevel || 0), 0) / last24h.length : 0
      },
      weekly: {
        processed: last7d.length,
        avgConfidence: last7d.length > 0 ?
          last7d.reduce((sum, a) => sum + (a.confidenceLevel || 0), 0) / last7d.length : 0
      }
    };
  }

  private async recordProcessingExperience(
    invoiceData: any, 
    result: InvoiceProcessingResult, 
    processingTime: number,
    insights: any
  ): Promise<void> {
    try {
      // Record processing efficiency
      await this.learningSystem.recordExperience({
        type: 'processing_efficiency',
        context: {
          invoiceId: invoiceData.id,
          amount: invoiceData.amount,
          vendor: invoiceData.vendor,
          workflowType: result.workflow.approvalRequired ? 'manual_approval' : 'auto_approve',
          expectedTime: 5000 // Base expectation
        },
        outcome: {
          success: true,
          processingTime,
          completionTime: processingTime
        },
        confidence: result.validation.confidence
      });

      // Record validation accuracy
      await this.learningSystem.recordExperience({
        type: 'validation_accuracy',
        context: {
          documentType: 'invoice',
          extractionMethod: 'auto',
          vendor: invoiceData.vendor
        },
        outcome: {
          accuracy: result.validation.confidence,
          confidence: result.validation.confidence
        },
        confidence: result.validation.confidence
      });

      // Record approval outcome prediction
      const predictedCorrectly = 
        (insights.recommendedWorkflow === 'auto_approve' && !result.workflow.approvalRequired) ||
        (insights.recommendedWorkflow !== 'auto_approve' && result.workflow.approvalRequired);

      await this.learningSystem.recordExperience({
        type: 'approval_outcome',
        context: {
          amount: invoiceData.amount,
          vendor: invoiceData.vendor,
          amount_range: this.categorizeAmount(invoiceData.amount),
          predicted: insights.recommendedWorkflow
        },
        outcome: {
          approved: !result.workflow.approvalRequired,
          processingTime,
          predictionAccurate: predictedCorrectly
        },
        confidence: insights.confidence
      });

    } catch (error) {
      console.error('Failed to record processing experience:', error);
    }
  }

  private categorizeAmount(amount: number): string {
    if (amount < 500) return 'small';
    if (amount < 2000) return 'medium';
    if (amount < 10000) return 'large';
    return 'very_large';
  }

  public async triggerLearning(experience: any): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Record in adaptive learning system
    await this.learningSystem.recordExperience(experience);
    
    // Also send to orchestrator for agent-specific learning
    await this.orchestrator.learnFromExperience(experience);
    
    console.log('Learning experience processed by Agent Zero');
  }

  public async getLearningInsights(): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.learningSystem.getInsights();
  }

  public async getAdaptationRecommendations(): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.learningSystem.generateAdaptations();
  }

  public async applyAdaptation(adaptationId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.learningSystem.applyAdaptation(adaptationId);
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Agent Zero service...');
    
    if (this.orchestrator) {
      await this.orchestrator.shutdown();
    }
    
    if (this.learningSystem) {
      await this.learningSystem.shutdown();
    }
    
    if (this.prisma) {
      await this.prisma.$disconnect();
    }

    this.removeAllListeners();
    this.initialized = false;
    
    console.log('Agent Zero service shutdown complete');
  }
}