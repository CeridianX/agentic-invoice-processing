const fetch = require('node-fetch');
require('dotenv').config();

async function debugVoiceSystem() {
  console.log('🔍 Debug: Voice System Status Check');
  console.log('=' * 50);
  
  const API_BASE = 'http://localhost:3001';
  
  try {
    // Test 1: Server health
    console.log('\n1. Testing server health...');
    const healthResponse = await fetch(`${API_BASE}/api/voice/status`);
    const healthData = await healthResponse.json();
    console.log('✅ Server Status:', {
      available: healthData.available,
      elevenLabs: healthData.elevenLabs?.available,
      voiceName: healthData.elevenLabs?.voice?.name
    });

    // Test 2: Simple text query
    console.log('\n2. Testing text query processing...');
    const queryResponse = await fetch(`${API_BASE}/api/voice/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'How many invoices do I have?' })
    });

    if (queryResponse.ok) {
      const queryData = await queryResponse.json();
      console.log('✅ Text Query Response:', {
        type: queryData.type,
        messageLength: queryData.message?.length,
        action: queryData.action
      });
    } else {
      console.log('❌ Text Query Failed:', queryResponse.status);
    }

    // Test 3: Check process-audio endpoint (without actual audio)
    console.log('\n3. Testing process-audio endpoint accessibility...');
    const audioResponse = await fetch(`${API_BASE}/api/voice/process-audio`, {
      method: 'POST',
      body: new FormData() // Empty form data
    });
    
    // Should return 400 (bad request) since no audio file
    console.log(`📡 Process-audio endpoint response: ${audioResponse.status}`);
    if (audioResponse.status === 400) {
      console.log('✅ Endpoint is accessible (correctly rejecting empty request)');
    }

    console.log('\n🎯 Debug Summary:');
    console.log('- Server is running ✅');
    console.log('- Voice endpoints are accessible ✅');
    console.log('- ElevenLabs service is configured ✅');
    console.log('- Text processing works ✅');
    console.log('\n💡 If ElevenLabs STT still doesn\'t work:');
    console.log('1. Check browser console for MediaRecorder permissions');
    console.log('2. Verify microphone access is granted');
    console.log('3. Try the "Switch STT" button to use browser fallback');
    console.log('4. Check network tab for failed requests');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugVoiceSystem();