require('dotenv').config();

async function checkVoice() {
  const API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = 'cgSgspJ2msm6clMCkdW9';
  
  if (!API_KEY) {
    console.log('❌ No API key found');
    return;
  }
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${VOICE_ID}`, {
      headers: { 'xi-api-key': API_KEY }
    });
    
    if (response.ok) {
      const voice = await response.json();
      console.log(`🗣️ Voice: ${voice.name}`);
      console.log(`📝 Description: ${voice.description || 'No description'}`);
      console.log(`🎭 Category: ${voice.category}`);
    } else {
      console.log(`❌ Voice lookup failed: ${response.status}`);
      // Let's check available voices
      const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': API_KEY }
      });
      
      if (voicesResponse.ok) {
        const voicesData = await voicesResponse.json();
        console.log('\n🎵 Available voices:');
        voicesData.voices.slice(0, 5).forEach(v => {
          console.log(`- ${v.name} (${v.voice_id})`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkVoice();