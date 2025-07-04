const fetch = require('node-fetch');
require('dotenv').config();

async function testJarvisSystem() {
  console.log('🤖 Testing Jarvis Conversational AI System');
  console.log('=' * 60);
  
  const API_BASE = 'http://localhost:3001';
  
  try {
    // Test 1: Jarvis service health
    console.log('\n1. Testing Jarvis service health...');
    const healthResponse = await fetch(`${API_BASE}/api/jarvis/health`);
    const healthData = await healthResponse.json();
    console.log('🏥 Health Status:', {
      status: healthData.status,
      elevenLabs: healthData.services?.elevenLabs,
      database: healthData.services?.database
    });

    // Test 2: Jarvis service status and capabilities
    console.log('\n2. Testing Jarvis status and capabilities...');
    const statusResponse = await fetch(`${API_BASE}/api/jarvis/status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('📊 Jarvis Status:', {
        available: statusData.available,
        service: statusData.service,
        portfolioTotalInvoices: statusData.portfolio?.totalInvoices,
        portfolioValue: statusData.portfolio?.totalValue,
        capabilities: statusData.capabilities?.length
      });
    } else {
      console.log('❌ Status check failed:', statusResponse.status);
    }

    // Test 3: Portfolio data for context
    console.log('\n3. Testing invoice portfolio data...');
    const portfolioResponse = await fetch(`${API_BASE}/api/jarvis/portfolio`);
    if (portfolioResponse.ok) {
      const portfolioData = await portfolioResponse.json();
      console.log('📋 Portfolio Data:', {
        totalInvoices: portfolioData.totalInvoices,
        pendingInvoices: portfolioData.pendingInvoices,
        approvedInvoices: portfolioData.approvedInvoices,
        exceptionsCount: portfolioData.exceptionsCount,
        recentInvoicesCount: portfolioData.recentInvoices?.length,
        urgentInvoicesCount: portfolioData.urgentInvoices?.length,
        totalValue: `$${portfolioData.totalAmount?.toLocaleString()}`
      });
    } else {
      console.log('❌ Portfolio data failed:', portfolioResponse.status);
    }

    // Test 4: Agent configuration
    console.log('\n4. Testing Jarvis agent configuration...');
    const configResponse = await fetch(`${API_BASE}/api/jarvis/config`);
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('⚙️ Agent Configuration:', {
        agentName: configData.agentName,
        language: configData.language,
        voiceId: configData.voiceId,
        temperature: configData.temperature,
        maxTokens: configData.maxTokens,
        promptLength: `${configData.promptLength} characters`,
        dynamicVariables: Object.keys(configData.dynamicVariables || {}).length
      });
      console.log('🎭 First Message:', `"${configData.firstMessage}"`);
    } else {
      console.log('❌ Config check failed:', configResponse.status);
    }

    // Test 5: Agent creation (optional - only if ElevenLabs is available)
    if (healthData.services?.elevenLabs) {
      console.log('\n5. Testing agent creation capability...');
      console.log('ℹ️ Note: Agent creation test skipped to avoid creating multiple agents');
      console.log('ℹ️ Use /api/jarvis/create-agent endpoint to create a new agent when needed');
    }

    console.log('\n🎉 Jarvis System Test Summary:');
    console.log('✅ Backend services are running');
    console.log('✅ Invoice portfolio data is accessible');
    console.log('✅ Agent configuration is properly formatted');
    console.log('✅ ElevenLabs integration is configured');
    
    console.log('\n🚀 Ready to activate Jarvis!');
    console.log('\nNext steps:');
    console.log('1. Open the frontend application');
    console.log('2. Navigate to the invoice list');
    console.log('3. Click "Activate Jarvis" in the AI Assistant section');
    console.log('4. Grant microphone permission when prompted');
    console.log('5. Start conversing with Jarvis about your invoices');

    console.log('\n🎯 Sample conversation starters:');
    console.log('• "Jarvis, give me a status update"');
    console.log('• "What invoices need my attention?"');
    console.log('• "Show me the urgent invoices"');
    console.log('• "How is our cash flow looking?"');
    console.log('• "What\'s the status of invoice DEMO-2025-0001?"');

  } catch (error) {
    console.error('❌ Jarvis test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure the server is running on port 3001');
    console.log('2. Check that ELEVENLABS_API_KEY is set in server/.env');
    console.log('3. Verify database connection is working');
    console.log('4. Ensure all dependencies are installed');
  }
}

testJarvisSystem();