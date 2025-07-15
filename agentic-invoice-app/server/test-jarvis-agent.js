require('dotenv').config();

async function testJarvisAgent() {
  console.log('🤖 Testing Jarvis Agent Configuration');
  console.log('=' * 50);
  
  const AGENT_ID = 'agent_01jz5vr08afyqv30awpxmv2nxz';
  const API_KEY = process.env.ELEVENLABS_API_KEY;
  
  console.log(`🎯 Agent ID: ${AGENT_ID}`);
  console.log(`🔑 API Key: ${API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT FOUND'}`);
  
  if (!API_KEY) {
    console.log('❌ ElevenLabs API key not found in server/.env file');
    console.log('💡 Please add ELEVENLABS_API_KEY to your server/.env file');
    return;
  }
  
  try {
    // Test agent accessibility
    console.log('\n🔍 Testing agent accessibility...');
    
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': API_KEY
      }
    });
    
    if (response.ok) {
      const agentData = await response.json();
      console.log('✅ Agent found successfully!');
      console.log(`📝 Agent Name: ${agentData.name || 'Unknown'}`);
      console.log(`🗣️ Voice ID: ${agentData.conversation_config?.tts?.voice_id || 'Not configured'}`);
      console.log(`🎭 First Message: "${agentData.conversation_config?.agent?.first_message || 'Not configured'}"`);
      
    } else {
      const errorText = await response.text();
      console.log(`❌ Agent not accessible: ${response.status}`);
      console.log(`Error: ${errorText}`);
      
      if (response.status === 401) {
        console.log('💡 Check your ElevenLabs API key permissions');
      } else if (response.status === 404) {
        console.log('💡 Verify the agent ID is correct');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Restart your frontend server if it\'s running');
  console.log('2. Navigate to the Invoice List page');
  console.log('3. Click "Activate Jarvis" in the AI Assistant section');
  console.log('4. Grant microphone permission when prompted');
  console.log('5. Start chatting with Jarvis!');
  
  console.log('\n💬 Try saying:');
  console.log('• "Hello Jarvis, give me a status update"');
  console.log('• "What invoices need my attention?"');
  console.log('• "Show me the pending invoices"');
  console.log('• "How is our cash flow looking?"');
}

testJarvisAgent();