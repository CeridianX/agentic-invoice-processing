#!/usr/bin/env node

// Simple test script to validate Cara API endpoints
const API_BASE_URL = 'https://agentic-invoice-processing-production-d734.up.railway.app';

async function testEndpoint(endpoint, body = {}) {
  console.log(`\n🔧 Testing: ${endpoint}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const status = response.status;
    const data = await response.json();
    
    console.log(`  Status: ${status}`);
    console.log(`  Response:`, data);
    
    return { status, data };
  } catch (error) {
    console.error(`  Error:`, error.message);
    return { error: error.message };
  }
}

async function testCaraEndpoints() {
  console.log('🤖 Testing Cara API endpoints...');
  
  const endpoints = [
    { path: '/api/jarvis-tools/get-portfolio-summary', body: {} },
    { path: '/api/jarvis-tools/get-recent-activity', body: {} },
    { path: '/api/jarvis-tools/get-urgent-invoices', body: {} },
    { path: '/api/jarvis-tools/get-invoices-by-status', body: { status: 'pending' } }
  ];
  
  for (const { path, body } of endpoints) {
    await testEndpoint(path, body);
  }
  
  console.log('\n✅ Test completed!');
}

// Run tests
testCaraEndpoints().catch(console.error);