const ElevenLabsModule = require('@elevenlabs/client');
require('dotenv').config();

console.log('🔑 API Key:', process.env.ELEVENLABS_API_KEY ? `${process.env.ELEVENLABS_API_KEY.substring(0, 10)}...` : 'NOT FOUND');
console.log('📦 ElevenLabs module:', Object.keys(ElevenLabsModule));
console.log('📦 ElevenLabs default export:', ElevenLabsModule.default);

async function testElevenLabs() {
  try {
    const ElevenLabs = ElevenLabsModule.default || ElevenLabsModule.ElevenLabs || ElevenLabsModule;
    const client = new ElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    
    console.log('✅ ElevenLabs client created successfully');
    
    // Test voice generation
    const audio = await client.generate({
      voice: "21m00Tcm4TlvDq8ikWAM",
      text: "Hello, this is a test of ElevenLabs voice synthesis.",
      model_id: "eleven_multilingual_v2"
    });
    
    console.log('🎵 Audio generated successfully');
    
    // Count bytes
    let totalBytes = 0;
    for await (const chunk of audio) {
      totalBytes += chunk.length;
    }
    
    console.log(`📊 Generated ${totalBytes} bytes of audio`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testElevenLabs();