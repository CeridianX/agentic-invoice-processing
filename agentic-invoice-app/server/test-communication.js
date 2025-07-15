// Test script to manually trigger AI communication for missing PO invoice

async function testCommunication() {
  try {
    // First, get a missing PO invoice
    const invoicesResponse = await fetch('http://localhost:3001/api/invoices');
    const invoicesData = await invoicesResponse.json();
    
    const missingPoInvoice = invoicesData.find(inv => inv.scenario === 'missing_po');
    
    if (!missingPoInvoice) {
      console.log('No missing PO invoice found');
      return;
    }
    
    console.log('Found missing PO invoice:', missingPoInvoice.invoiceNumber, missingPoInvoice.id);
    
    // Trigger communication for this invoice
    const response = await fetch(`http://localhost:3001/api/communication/invoke/${missingPoInvoice.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scenario: 'missing_po'
      })
    });
    
    const result = await response.json();
    console.log('Communication result:', JSON.stringify(result, null, 2));
    
    // Check if conversation was created
    const conversationResponse = await fetch(`http://localhost:3001/api/communication/conversations/${missingPoInvoice.id}`);
    const conversationData = await conversationResponse.json();
    console.log('Conversation data:', JSON.stringify(conversationData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testCommunication();