import { MCPServerConfig } from '../types';
import { PrismaClient } from '@prisma/client';

export class DatabaseMCP {
  private prisma: PrismaClient;
  private config: MCPServerConfig;

  constructor() {
    this.prisma = new PrismaClient();
    this.config = {
      name: 'DatabaseMCP',
      description: 'MCP server for database operations and data management',
      tools: [
        'store_invoice',
        'get_invoice',
        'check_duplicates',
        'get_vendor_info',
        'store_agent_activity',
        'get_processing_history',
        'update_invoice_status'
      ],
      capabilities: ['data_storage', 'duplicate_detection', 'vendor_lookup', 'activity_tracking']
    };
  }

  public getConfig(): MCPServerConfig {
    return this.config;
  }

  public async storeInvoice(params: {
    extractedData: any;
    confidence: number;
    processingMethod: string;
  }): Promise<any> {
    try {
      const { extractedData, confidence, processingMethod } = params;

      // First, find or create vendor
      let vendor = null;
      if (extractedData.vendor) {
        vendor = await this.prisma.vendor.upsert({
          where: { name: extractedData.vendor },
          update: {},
          create: {
            name: extractedData.vendor,
            category: 'General',
            trustLevel: 'medium',
            averageProcessingTime: 30,
            paymentTerms: 'Net 30',
            preferredPaymentMethod: 'ACH'
          }
        });
      }

      // Create the invoice
      const invoice = await this.prisma.invoice.create({
        data: {
          vendorId: vendor?.id || 'default-vendor',
          invoiceNumber: extractedData.invoiceNumber || `INV-${Date.now()}`,
          invoiceDate: extractedData.date ? new Date(extractedData.date) : new Date(),
          amount: extractedData.amount || 0,
          currency: 'USD',
          status: 'pending',
          approvalStatus: 'pending',
          dueDate: extractedData.dueDate ? new Date(extractedData.dueDate) : 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentTerms: 'Net 30',
          hasIssues: confidence < 0.8,
          receivedDate: new Date(),
          notes: `Processed using ${processingMethod} with ${(confidence * 100).toFixed(1)}% confidence`
        },
        include: {
          vendor: true
        }
      });

      return {
        success: true,
        invoice,
        confidence,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  public async getInvoice(params: { invoiceId: string }): Promise<any> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: params.invoiceId },
        include: {
          vendor: true,
          purchaseOrder: true,
          agentActivities: {
            orderBy: { timestamp: 'desc' },
            take: 10
          },
          exceptions: true
        }
      });

      return {
        success: true,
        invoice,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  public async checkDuplicates(params: {
    invoiceNumber?: string;
    vendorId?: string;
    amount?: number;
    dateRange?: { start: Date; end: Date };
  }): Promise<any> {
    try {
      const { invoiceNumber, vendorId, amount, dateRange } = params;
      
      const whereClause: any = {};
      
      if (invoiceNumber) {
        whereClause.invoiceNumber = invoiceNumber;
      }
      
      if (vendorId) {
        whereClause.vendorId = vendorId;
      }
      
      if (amount) {
        // Check for similar amounts (within 5%)
        const variance = amount * 0.05;
        whereClause.amount = {
          gte: amount - variance,
          lte: amount + variance
        };
      }
      
      if (dateRange) {
        whereClause.invoiceDate = {
          gte: dateRange.start,
          lte: dateRange.end
        };
      } else {
        // Default to last 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        whereClause.invoiceDate = {
          gte: ninetyDaysAgo
        };
      }

      const duplicates = await this.prisma.invoice.findMany({
        where: whereClause,
        include: {
          vendor: {
            select: { name: true }
          }
        },
        orderBy: { invoiceDate: 'desc' }
      });

      const isDuplicate = duplicates.length > 0;
      const confidence = isDuplicate ? 0.9 : 0.95;

      return {
        success: true,
        isDuplicate,
        duplicateCount: duplicates.length,
        duplicates,
        confidence,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  public async getVendorInfo(params: { vendorId?: string; vendorName?: string }): Promise<any> {
    try {
      let vendor = null;
      
      if (params.vendorId) {
        vendor = await this.prisma.vendor.findUnique({
          where: { id: params.vendorId },
          include: {
            invoices: {
              take: 10,
              orderBy: { invoiceDate: 'desc' }
            },
            _count: {
              select: {
                invoices: true
              }
            }
          }
        });
      } else if (params.vendorName) {
        vendor = await this.prisma.vendor.findFirst({
          where: { 
            name: {
              contains: params.vendorName,
              mode: 'insensitive'
            }
          },
          include: {
            invoices: {
              take: 10,
              orderBy: { invoiceDate: 'desc' }
            },
            _count: {
              select: {
                invoices: true
              }
            }
          }
        });
      }

      if (vendor) {
        // Calculate vendor statistics
        const totalInvoices = vendor._count.invoices;
        const avgAmount = vendor.invoices.length > 0 ? 
          vendor.invoices.reduce((sum, inv) => sum + inv.amount, 0) / vendor.invoices.length : 0;
        
        const issueRate = vendor.invoices.length > 0 ?
          vendor.invoices.filter(inv => inv.hasIssues).length / vendor.invoices.length : 0;

        return {
          success: true,
          vendor: {
            ...vendor,
            statistics: {
              totalInvoices,
              averageAmount: avgAmount,
              issueRate,
              lastInvoiceDate: vendor.invoices[0]?.invoiceDate
            }
          },
          timestamp: new Date()
        };
      } else {
        return {
          success: true,
          vendor: null,
          isNewVendor: true,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  public async storeAgentActivity(params: {
    agentName: string;
    activityType: string;
    description: string;
    invoiceId?: string;
    confidence?: number;
    metadata?: any;
  }): Promise<any> {
    try {
      const activity = await this.prisma.agentActivity.create({
        data: {
          activityType: params.activityType,
          description: params.description,
          invoiceId: params.invoiceId,
          confidenceLevel: params.confidence,
          metadata: {
            agentName: params.agentName,
            ...params.metadata
          }
        }
      });

      return {
        success: true,
        activity,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  public async getProcessingHistory(params: {
    invoiceId?: string;
    agentName?: string;
    limit?: number;
  }): Promise<any> {
    try {
      const { invoiceId, agentName, limit = 50 } = params;
      
      const whereClause: any = {};
      
      if (invoiceId) {
        whereClause.invoiceId = invoiceId;
      }
      
      if (agentName) {
        whereClause.metadata = {
          path: ['agentName'],
          equals: agentName
        };
      }

      const activities = await this.prisma.agentActivity.findMany({
        where: whereClause,
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              vendor: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return {
        success: true,
        activities,
        count: activities.length,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  public async updateInvoiceStatus(params: {
    invoiceId: string;
    status?: string;
    approvalStatus?: string;
    assignedTo?: string;
    notes?: string;
  }): Promise<any> {
    try {
      const updateData: any = {};
      
      if (params.status) updateData.status = params.status;
      if (params.approvalStatus) updateData.approvalStatus = params.approvalStatus;
      if (params.assignedTo) updateData.assignedTo = params.assignedTo;
      if (params.notes) updateData.notes = params.notes;

      const invoice = await this.prisma.invoice.update({
        where: { id: params.invoiceId },
        data: updateData,
        include: {
          vendor: true
        }
      });

      return {
        success: true,
        invoice,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  public async getBusinessRules(): Promise<any> {
    try {
      // For now, return hardcoded rules
      // In a full implementation, these would be stored in the database
      const rules = [
        {
          id: '1',
          name: 'Auto-approval limit',
          description: 'Auto-approve invoices under $1000 from trusted vendors',
          conditions: { maxAmount: 1000, minTrustLevel: 'high' },
          active: true
        },
        {
          id: '2',
          name: 'High-value approval',
          description: 'Require executive approval for invoices over $5000',
          conditions: { minAmount: 5000 },
          active: true
        }
      ];

      return {
        success: true,
        rules,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  public async shutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}