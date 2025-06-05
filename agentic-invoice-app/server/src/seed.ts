import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const vendors = [
  {
    name: 'TechCorp Solutions',
    category: 'IT Hardware',
    trustLevel: 'high',
    averageProcessingTime: 2,
    paymentTerms: 'Net 30',
    taxId: 'TC-123456',
    preferredPaymentMethod: 'ACH',
    typicalVariancePattern: '2-3% over-delivery common'
  },
  {
    name: 'Office Supplies Plus',
    category: 'Office Supplies',
    trustLevel: 'high',
    averageProcessingTime: 1,
    paymentTerms: 'Net 15',
    taxId: 'OS-789012',
    preferredPaymentMethod: 'Check',
    typicalVariancePattern: 'Exact matches typical'
  },
  {
    name: 'Global Marketing Agency',
    category: 'Marketing Services',
    trustLevel: 'medium',
    averageProcessingTime: 5,
    paymentTerms: 'Net 45',
    taxId: 'GM-345678',
    preferredPaymentMethod: 'Wire',
    typicalVariancePattern: 'Bundled services common'
  },
  {
    name: 'Facilities Management Co',
    category: 'Facilities',
    trustLevel: 'high',
    averageProcessingTime: 3,
    paymentTerms: 'Net 30',
    taxId: 'FM-901234',
    preferredPaymentMethod: 'ACH',
    typicalVariancePattern: 'Monthly service variations'
  },
  {
    name: 'Cloud Services Inc',
    category: 'IT Services',
    trustLevel: 'high',
    averageProcessingTime: 1,
    paymentTerms: 'Net 30',
    taxId: 'CS-567890',
    preferredPaymentMethod: 'Credit Card',
    typicalVariancePattern: 'Usage-based billing'
  }
];

const glAccounts = [
  '6100-Marketing-Advertising',
  '6200-Marketing-Events',
  '7100-IT-Hardware',
  '7200-IT-Software',
  '7300-IT-Services',
  '8100-Facilities-Maintenance',
  '8200-Facilities-Supplies',
  '9100-Office-Supplies',
  '9200-Office-Equipment'
];

const departments = ['Marketing', 'IT', 'Operations', 'Finance', 'HR', 'Sales'];
const costCenters = ['CC-100', 'CC-200', 'CC-300', 'CC-400', 'CC-500'];

async function seed() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.matchingActivity.deleteMany();
  await prisma.exception.deleteMany();
  await prisma.agentActivity.deleteMany();
  await prisma.goodsReceiptLineItem.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.pOLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.vendor.deleteMany();

  // Create vendors
  const createdVendors = await Promise.all(
    vendors.map(vendor => prisma.vendor.create({ data: vendor }))
  );

  console.log(`✅ Created ${createdVendors.length} vendors`);

  // Create purchase orders with line items
  const purchaseOrders = [];
  for (let i = 0; i < 30; i++) {
    const vendor = createdVendors[Math.floor(Math.random() * createdVendors.length)];
    const poDate = new Date();
    poDate.setDate(poDate.getDate() - Math.floor(Math.random() * 60) - 30);
    
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-2024-${String(i + 1000).padStart(4, '0')}`,
        vendorId: vendor.id,
        totalAmount: 0, // Will update after creating line items
        status: 'approved',
        createdDate: poDate,
        approvalDate: new Date(poDate.getTime() + 24 * 60 * 60 * 1000),
        requester: ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams'][Math.floor(Math.random() * 4)],
        department: departments[Math.floor(Math.random() * departments.length)],
        lineItems: {
          create: generatePOLineItems(vendor.category)
        }
      },
      include: {
        lineItems: true
      }
    });

    // Update total amount
    const totalAmount = po.lineItems.reduce((sum, item) => sum + item.totalAmount, 0);
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { totalAmount }
    });

    purchaseOrders.push(po);
  }

  console.log(`✅ Created ${purchaseOrders.length} purchase orders`);

  // Create goods receipts for some POs
  const goodsReceipts = [];
  for (const po of purchaseOrders.slice(0, 20)) {
    if (!po.approvalDate) continue;
    const receiptDate = new Date(po.approvalDate.getTime() + Math.floor(Math.random() * 14 + 7) * 24 * 60 * 60 * 1000);
    
    const receipt = await prisma.goodsReceipt.create({
      data: {
        poId: po.id,
        receiptDate,
        receivedBy: ['Warehouse Team', 'Receiving Dept', 'John Receiver'][Math.floor(Math.random() * 3)],
        status: 'completed',
        lineItems: {
          create: po.lineItems.map(poLine => ({
            poLineItemId: poLine.id,
            quantityReceived: poLine.quantityOrdered * (0.95 + Math.random() * 0.1), // 95-105% received
            condition: 'good',
            notes: Math.random() > 0.9 ? 'Minor packaging damage, contents OK' : null
          }))
        }
      },
      include: {
        lineItems: true
      }
    });

    // Update PO line items with received quantities
    for (const grLine of receipt.lineItems) {
      await prisma.pOLineItem.update({
        where: { id: grLine.poLineItemId },
        data: { quantityReceived: grLine.quantityReceived }
      });
    }

    goodsReceipts.push(receipt);
  }

  console.log(`✅ Created ${goodsReceipts.length} goods receipts`);

  // Create invoices with various matching scenarios
  const invoices = [];
  let invoiceCount = 0;

  // Perfect matches (40%)
  for (const po of purchaseOrders.slice(0, 12)) {
    const invoice = await createInvoiceWithScenario(po, 'perfect', invoiceCount++);
    invoices.push(invoice);
  }

  // Quantity variances (20%)
  for (const po of purchaseOrders.slice(12, 18)) {
    const invoice = await createInvoiceWithScenario(po, 'quantity_variance', invoiceCount++);
    invoices.push(invoice);
  }

  // Price variances (15%)
  for (const po of purchaseOrders.slice(18, 22)) {
    const invoice = await createInvoiceWithScenario(po, 'price_variance', invoiceCount++);
    invoices.push(invoice);
  }

  // Description mismatches (10%)
  for (const po of purchaseOrders.slice(22, 25)) {
    const invoice = await createInvoiceWithScenario(po, 'description_mismatch', invoiceCount++);
    invoices.push(invoice);
  }

  // Complex scenarios (15%)
  for (const po of purchaseOrders.slice(25, 30)) {
    const scenarioType = ['split_billing', 'bundled_items', 'substitute_items', 'partial_delivery'][Math.floor(Math.random() * 4)];
    const invoice = await createInvoiceWithScenario(po, scenarioType, invoiceCount++);
    invoices.push(invoice);
  }

  console.log(`✅ Created ${invoices.length} invoices`);

  // Create agent activities
  const agentActivities = [];
  for (const invoice of invoices) {
    // Initial processing
    agentActivities.push({
      activityType: 'processing_started',
      description: `Started processing invoice ${invoice.invoiceNumber}`,
      invoiceId: invoice.id,
      confidenceLevel: 1.0
    });

    // Line matching activities
    if (invoice.lineItems.length > 0) {
      agentActivities.push({
        activityType: 'line_matching',
        description: `Matching ${invoice.lineItems.length} line items to PO`,
        invoiceId: invoice.id,
        confidenceLevel: 0.85
      });
    }

    // Pattern detection
    if (Math.random() > 0.7) {
      agentActivities.push({
        activityType: 'pattern_detected',
        description: 'Detected typical variance pattern for this vendor',
        invoiceId: invoice.id,
        confidenceLevel: 0.92
      });
    }
  }

  await prisma.agentActivity.createMany({
    data: agentActivities
  });

  console.log(`✅ Created ${agentActivities.length} agent activities`);

  // Create exceptions for invoices with issues
  const exceptions = [];
  for (const invoice of invoices.filter(inv => inv.hasIssues)) {
    const exceptionTypes = [
      { type: 'price_variance', severity: 'medium', description: 'Price exceeds PO by 5%' },
      { type: 'quantity_mismatch', severity: 'low', description: 'Quantity differs from PO' },
      { type: 'missing_po_reference', severity: 'high', description: 'Cannot match to any PO' },
      { type: 'duplicate_invoice', severity: 'high', description: 'Possible duplicate invoice detected' }
    ];

    const exception = exceptionTypes[Math.floor(Math.random() * exceptionTypes.length)];
    exceptions.push({
      invoiceId: invoice.id,
      ...exception,
      suggestedAction: 'Review with purchasing team',
      agentConfidence: 0.75 + Math.random() * 0.25
    });
  }

  await prisma.exception.createMany({
    data: exceptions
  });

  console.log(`✅ Created ${exceptions.length} exceptions`);

  console.log('✅ Seed completed successfully!');
}

function generatePOLineItems(category: string) {
  const itemsByCategory: Record<string, any[]> = {
    'IT Hardware': [
      { itemCode: 'LAPTOP-001', description: 'Business Laptop - Intel i7', unitPrice: 1299.99, glAccount: '7100-IT-Hardware' },
      { itemCode: 'MONITOR-001', description: '27" 4K Monitor', unitPrice: 449.99, glAccount: '7100-IT-Hardware' },
      { itemCode: 'DOCK-001', description: 'USB-C Docking Station', unitPrice: 199.99, glAccount: '7100-IT-Hardware' },
      { itemCode: 'KEYBOARD-001', description: 'Wireless Keyboard & Mouse Set', unitPrice: 79.99, glAccount: '7100-IT-Hardware' }
    ],
    'Office Supplies': [
      { itemCode: 'PAPER-A4', description: 'A4 Paper (500 sheets)', unitPrice: 5.99, glAccount: '9100-Office-Supplies' },
      { itemCode: 'PEN-BLUE', description: 'Blue Ballpoint Pens (12 pack)', unitPrice: 8.99, glAccount: '9100-Office-Supplies' },
      { itemCode: 'FOLDER-HANG', description: 'Hanging Folders (25 pack)', unitPrice: 15.99, glAccount: '9100-Office-Supplies' },
      { itemCode: 'STAPLER-HD', description: 'Heavy Duty Stapler', unitPrice: 24.99, glAccount: '9100-Office-Supplies' }
    ],
    'Marketing Services': [
      { itemCode: 'DESIGN-LOGO', description: 'Logo Design Services', unitPrice: 2500.00, glAccount: '6100-Marketing-Advertising' },
      { itemCode: 'CAMPAIGN-SOCIAL', description: 'Social Media Campaign', unitPrice: 5000.00, glAccount: '6100-Marketing-Advertising' },
      { itemCode: 'EVENT-BOOTH', description: 'Trade Show Booth Design', unitPrice: 8000.00, glAccount: '6200-Marketing-Events' },
      { itemCode: 'CONTENT-BLOG', description: 'Blog Content Creation (10 posts)', unitPrice: 1500.00, glAccount: '6100-Marketing-Advertising' }
    ],
    'Facilities': [
      { itemCode: 'CLEAN-MONTHLY', description: 'Monthly Cleaning Service', unitPrice: 1200.00, glAccount: '8100-Facilities-Maintenance' },
      { itemCode: 'HVAC-MAINT', description: 'HVAC Maintenance', unitPrice: 450.00, glAccount: '8100-Facilities-Maintenance' },
      { itemCode: 'SUPPLIES-CLEAN', description: 'Cleaning Supplies Bundle', unitPrice: 299.99, glAccount: '8200-Facilities-Supplies' },
      { itemCode: 'REPAIR-ELECTRIC', description: 'Electrical Repairs', unitPrice: 850.00, glAccount: '8100-Facilities-Maintenance' }
    ],
    'IT Services': [
      { itemCode: 'CLOUD-COMPUTE', description: 'Cloud Computing - Standard', unitPrice: 499.99, glAccount: '7300-IT-Services' },
      { itemCode: 'CLOUD-STORAGE', description: 'Cloud Storage - 1TB', unitPrice: 99.99, glAccount: '7300-IT-Services' },
      { itemCode: 'LICENSE-OFFICE', description: 'Office 365 License', unitPrice: 29.99, glAccount: '7200-IT-Software' },
      { itemCode: 'SUPPORT-PREMIUM', description: 'Premium Support Hours', unitPrice: 150.00, glAccount: '7300-IT-Services' }
    ]
  };

  const items = itemsByCategory[category] || itemsByCategory['Office Supplies'];
  const lineCount = Math.floor(Math.random() * 4) + 1; // 1-4 lines
  const selectedItems = [];

  for (let i = 0; i < lineCount; i++) {
    const item = items[Math.floor(Math.random() * items.length)];
    const quantity = Math.floor(Math.random() * 20) + 1;
    
    selectedItems.push({
      lineNumber: i + 1,
      itemCode: item.itemCode,
      description: item.description,
      quantityOrdered: quantity,
      unitPrice: item.unitPrice,
      totalAmount: quantity * item.unitPrice,
      glAccountCode: item.glAccount,
      department: departments[Math.floor(Math.random() * departments.length)],
      costCenter: costCenters[Math.floor(Math.random() * costCenters.length)],
      budgetCategory: 'Operating Expenses',
      expectedDeliveryDate: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    });
  }

  return selectedItems;
}

async function createInvoiceWithScenario(po: any, scenario: string, invoiceNumber: number) {
  const vendor = await prisma.vendor.findUnique({ where: { id: po.vendorId } });
  const poWithLineItems = await prisma.purchaseOrder.findUnique({
    where: { id: po.id },
    include: { lineItems: true }
  });

  if (!vendor || !poWithLineItems) throw new Error('Vendor or PO not found');

  const approvalDate = po.approvalDate || new Date();
  const invoiceDate = new Date(approvalDate.getTime() + Math.floor(Math.random() * 30 + 10) * 24 * 60 * 60 * 1000);
  const dueDate = new Date(invoiceDate.getTime() + parseInt(vendor.paymentTerms.split(' ')[1]) * 24 * 60 * 60 * 1000);

  let lineItems: any[] = [];
  let hasIssues = false;
  let totalAmount = 0;
  let variancePercentage = 0;

  switch (scenario) {
    case 'perfect':
      // Exact match
      lineItems = poWithLineItems.lineItems.map((poLine, index) => {
        const amount = poLine.quantityOrdered * poLine.unitPrice;
        totalAmount += amount;
        return {
          lineNumber: index + 1,
          itemCode: poLine.itemCode,
          description: poLine.description,
          quantity: poLine.quantityOrdered,
          unitPrice: poLine.unitPrice,
          totalAmount: amount,
          taxRate: 0.08,
          taxAmount: amount * 0.08,
          glAccountCode: poLine.glAccountCode,
          department: poLine.department,
          costCenter: poLine.costCenter,
          poLineItemId: poLine.id,
          matchStatus: 'matched',
          varianceAmount: 0,
          variancePercentage: 0
        };
      });
      break;

    case 'quantity_variance':
      // 2-10% quantity variance
      lineItems = poWithLineItems.lineItems.map((poLine, index) => {
        const varianceFactor = 0.95 + Math.random() * 0.15; // 95-110%
        const quantity = poLine.quantityOrdered * varianceFactor;
        const amount = quantity * poLine.unitPrice;
        const variance = amount - (poLine.quantityOrdered * poLine.unitPrice);
        totalAmount += amount;
        variancePercentage = Math.max(variancePercentage, Math.abs(variance / (poLine.quantityOrdered * poLine.unitPrice) * 100));
        
        return {
          lineNumber: index + 1,
          itemCode: poLine.itemCode,
          description: poLine.description,
          quantity,
          unitPrice: poLine.unitPrice,
          totalAmount: amount,
          taxRate: 0.08,
          taxAmount: amount * 0.08,
          glAccountCode: poLine.glAccountCode,
          department: poLine.department,
          costCenter: poLine.costCenter,
          poLineItemId: poLine.id,
          matchStatus: 'partial',
          varianceAmount: variance,
          variancePercentage: variance / (poLine.quantityOrdered * poLine.unitPrice) * 100
        };
      });
      hasIssues = variancePercentage > 5;
      break;

    case 'price_variance':
      // 1-8% price variance
      lineItems = poWithLineItems.lineItems.map((poLine, index) => {
        const priceFactor = 0.98 + Math.random() * 0.1; // 98-108%
        const unitPrice = poLine.unitPrice * priceFactor;
        const amount = poLine.quantityOrdered * unitPrice;
        const variance = amount - (poLine.quantityOrdered * poLine.unitPrice);
        totalAmount += amount;
        variancePercentage = Math.max(variancePercentage, Math.abs(variance / (poLine.quantityOrdered * poLine.unitPrice) * 100));
        
        return {
          lineNumber: index + 1,
          itemCode: poLine.itemCode,
          description: poLine.description,
          quantity: poLine.quantityOrdered,
          unitPrice,
          totalAmount: amount,
          taxRate: 0.08,
          taxAmount: amount * 0.08,
          glAccountCode: poLine.glAccountCode,
          department: poLine.department,
          costCenter: poLine.costCenter,
          poLineItemId: poLine.id,
          matchStatus: 'partial',
          varianceAmount: variance,
          variancePercentage: variance / (poLine.quantityOrdered * poLine.unitPrice) * 100
        };
      });
      hasIssues = variancePercentage > 3;
      break;

    case 'description_mismatch':
      // Same item, different description
      lineItems = poWithLineItems.lineItems.map((poLine, index) => {
        const amount = poLine.quantityOrdered * poLine.unitPrice;
        totalAmount += amount;
        
        return {
          lineNumber: index + 1,
          itemCode: poLine.itemCode,
          description: poLine.description + ' - Updated Model', // Different description
          quantity: poLine.quantityOrdered,
          unitPrice: poLine.unitPrice,
          totalAmount: amount,
          taxRate: 0.08,
          taxAmount: amount * 0.08,
          glAccountCode: poLine.glAccountCode,
          department: poLine.department,
          costCenter: poLine.costCenter,
          poLineItemId: poLine.id,
          matchStatus: 'partial',
          varianceAmount: 0,
          variancePercentage: 0
        };
      });
      break;

    case 'split_billing':
      // One PO line split into multiple invoice lines
      if (poWithLineItems.lineItems.length > 0) {
        const poLine = poWithLineItems.lineItems[0];
        const splitCount = 3;
        const quantityPerSplit = poLine.quantityOrdered / splitCount;
        
        for (let i = 0; i < splitCount; i++) {
          const amount = quantityPerSplit * poLine.unitPrice;
          totalAmount += amount;
          
          lineItems.push({
            lineNumber: i + 1,
            itemCode: poLine.itemCode,
            description: `${poLine.description} - Part ${i + 1}/${splitCount}`,
            quantity: quantityPerSplit,
            unitPrice: poLine.unitPrice,
            totalAmount: amount,
            taxRate: 0.08,
            taxAmount: amount * 0.08,
            glAccountCode: poLine.glAccountCode,
            department: poLine.department,
            costCenter: poLine.costCenter,
            poLineItemId: poLine.id,
            matchStatus: 'partial',
            varianceAmount: 0,
            variancePercentage: 0
          });
        }
        
        // Add remaining PO lines normally
        for (let i = 1; i < poWithLineItems.lineItems.length; i++) {
          const poLine = poWithLineItems.lineItems[i];
          const amount = poLine.quantityOrdered * poLine.unitPrice;
          totalAmount += amount;
          
          lineItems.push({
            lineNumber: lineItems.length + 1,
            itemCode: poLine.itemCode,
            description: poLine.description,
            quantity: poLine.quantityOrdered,
            unitPrice: poLine.unitPrice,
            totalAmount: amount,
            taxRate: 0.08,
            taxAmount: amount * 0.08,
            glAccountCode: poLine.glAccountCode,
            department: poLine.department,
            costCenter: poLine.costCenter,
            poLineItemId: poLine.id,
            matchStatus: 'matched',
            varianceAmount: 0,
            variancePercentage: 0
          });
        }
      }
      break;

    case 'bundled_items':
      // Multiple PO lines combined into one invoice line
      if (poWithLineItems.lineItems.length >= 2) {
        const bundledAmount = poWithLineItems.lineItems.slice(0, 2).reduce(
          (sum, poLine) => sum + (poLine.quantityOrdered * poLine.unitPrice), 0
        );
        totalAmount += bundledAmount;
        
        lineItems.push({
          lineNumber: 1,
          itemCode: 'BUNDLE-001',
          description: 'Bundled Services Package',
          quantity: 1,
          unitPrice: bundledAmount,
          totalAmount: bundledAmount,
          taxRate: 0.08,
          taxAmount: bundledAmount * 0.08,
          glAccountCode: poWithLineItems.lineItems[0].glAccountCode,
          department: poWithLineItems.lineItems[0].department,
          costCenter: poWithLineItems.lineItems[0].costCenter,
          poLineItemId: poWithLineItems.lineItems[0].id,
          matchStatus: 'partial',
          varianceAmount: 0,
          variancePercentage: 0
        });
        
        // Add remaining lines normally
        for (let i = 2; i < poWithLineItems.lineItems.length; i++) {
          const poLine = poWithLineItems.lineItems[i];
          const amount = poLine.quantityOrdered * poLine.unitPrice;
          totalAmount += amount;
          
          lineItems.push({
            lineNumber: lineItems.length + 1,
            itemCode: poLine.itemCode,
            description: poLine.description,
            quantity: poLine.quantityOrdered,
            unitPrice: poLine.unitPrice,
            totalAmount: amount,
            taxRate: 0.08,
            taxAmount: amount * 0.08,
            glAccountCode: poLine.glAccountCode,
            department: poLine.department,
            costCenter: poLine.costCenter,
            poLineItemId: poLine.id,
            matchStatus: 'matched',
            varianceAmount: 0,
            variancePercentage: 0
          });
        }
      }
      hasIssues = true;
      break;

    case 'substitute_items':
      // Substitute items with notes
      lineItems = poWithLineItems.lineItems.map((poLine, index) => {
        const amount = poLine.quantityOrdered * poLine.unitPrice;
        totalAmount += amount;
        
        return {
          lineNumber: index + 1,
          itemCode: poLine.itemCode + '-SUB',
          description: poLine.description + ' (Substitute Model)',
          quantity: poLine.quantityOrdered,
          unitPrice: poLine.unitPrice,
          totalAmount: amount,
          taxRate: 0.08,
          taxAmount: amount * 0.08,
          glAccountCode: poLine.glAccountCode,
          department: poLine.department,
          costCenter: poLine.costCenter,
          poLineItemId: poLine.id,
          matchStatus: 'partial',
          varianceAmount: 0,
          variancePercentage: 0
        };
      });
      break;

    case 'partial_delivery':
      // Partial delivery - only some items invoiced
      const itemsToInvoice = Math.ceil(poWithLineItems.lineItems.length * 0.6);
      lineItems = poWithLineItems.lineItems.slice(0, itemsToInvoice).map((poLine, index) => {
        const amount = poLine.quantityOrdered * poLine.unitPrice;
        totalAmount += amount;
        
        return {
          lineNumber: index + 1,
          itemCode: poLine.itemCode,
          description: poLine.description,
          quantity: poLine.quantityOrdered,
          unitPrice: poLine.unitPrice,
          totalAmount: amount,
          taxRate: 0.08,
          taxAmount: amount * 0.08,
          glAccountCode: poLine.glAccountCode,
          department: poLine.department,
          costCenter: poLine.costCenter,
          poLineItemId: poLine.id,
          matchStatus: 'matched',
          varianceAmount: 0,
          variancePercentage: 0
        };
      });
      break;

    default:
      // Default to perfect match
      return createInvoiceWithScenario(po, 'perfect', invoiceNumber);
  }

  // Add tax to total
  const taxTotal = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  totalAmount += taxTotal;

  const invoice = await prisma.invoice.create({
    data: {
      vendorId: vendor.id,
      invoiceNumber: `INV-2024-${String(invoiceNumber + 1000).padStart(4, '0')}`,
      invoiceDate,
      amount: totalAmount,
      status: hasIssues ? 'pending_review' : 'pending_approval',
      approvalStatus: 'pending',
      assignedTo: Math.random() > 0.7 ? ['Alice Johnson', 'Bob Smith', 'Carol Davis'][Math.floor(Math.random() * 3)] : null,
      poId: po.id,
      receivedDate: invoiceDate,
      dueDate,
      paymentTerms: vendor.paymentTerms,
      hasIssues,
      variancePercentage,
      currency: 'USD',
      notes: scenario === 'substitute_items' || scenario === 'bundled_items' ? 'Special billing arrangement' : null,
      lineItems: {
        create: lineItems
      }
    },
    include: {
      lineItems: true
    }
  });

  // Create matching activities for matched lines
  for (const lineItem of invoice.lineItems) {
    if (lineItem.matchStatus === 'matched' || lineItem.matchStatus === 'partial') {
      await prisma.matchingActivity.create({
        data: {
          invoiceLineItemId: lineItem.id,
          poLineItemId: lineItem.poLineItemId!,
          matchType: lineItem.matchStatus === 'matched' ? 'exact' : 'fuzzy',
          confidenceScore: lineItem.matchStatus === 'matched' ? 1.0 : 0.85,
          matchedBy: 'system',
          matchNotes: scenario === 'description_mismatch' ? 'SKU matches but description varies' : null
        }
      });
    }
  }

  return invoice;
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });