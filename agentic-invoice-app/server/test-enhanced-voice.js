const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');
require('dotenv').config();

const API_BASE = 'http://localhost:3001';

async function testEnhancedVoiceSystem() {
  console.log('🚀 Testing Enhanced Voice System with ElevenLabs STT + OpenAI');
  console.log('=' * 60);

  // Test 1: Check voice service status
  console.log('\n1. Testing voice service status...');
  try {
    const response = await fetch(`${API_BASE}/api/voice/status`);
    const status = await response.json();
    console.log('✅ Voice Status:', {
      available: status.available,
      elevenLabs: status.elevenLabs?.available,
      voice: status.elevenLabs?.voice?.name,
      features: status.features
    });
  } catch (error) {
    console.error('❌ Status test failed:', error.message);
  }

  // Test 2: Test OpenAI query processing
  console.log('\n2. Testing OpenAI intelligent query processing...');
  const testQueries = [
    "What's the status of invoice DEMO-2025-0001?",
    "Show me all pending invoices",
    "How many invoices do I have in total?",
    "Tell me about my invoice portfolio",
    "Which invoices need my attention?"
  ];

  for (const query of testQueries) {
    try {
      console.log(`\n🤖 Testing query: "${query}"`);
      const response = await fetch(`${API_BASE}/api/voice/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const result = await response.json();
      console.log(`📝 Response: ${result.message.substring(0, 100)}${result.message.length > 100 ? '...' : ''}`);
      if (result.action) {
        console.log(`🎯 Action: ${result.action}`);
      }
      if (result.invoiceId) {
        console.log(`📄 Invoice ID: ${result.invoiceId}`);
      }
    } catch (error) {
      console.error(`❌ Query failed for "${query}":`, error.message);
    }
  }

  // Test 3: Test ElevenLabs TTS
  console.log('\n3. Testing ElevenLabs TTS...');
  try {
    const response = await fetch(`${API_BASE}/api/voice/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: "Hello! I'm your AI voice assistant. I can help you manage your invoices using natural conversation." 
      })
    });

    const result = await response.json();
    if (result.success) {
      console.log(`✅ TTS generated ${result.audio.length} characters of base64 audio`);
      console.log(`🎵 Audio format: ${result.format}`);
    } else {
      console.log('⚠️ TTS service not available, falling back to browser TTS');
    }
  } catch (error) {
    console.error('❌ TTS test failed:', error.message);
  }

  // Test 4: Test voice processing pipeline
  console.log('\n4. Testing complete voice processing pipeline...');
  console.log('ℹ️ Note: STT test would require actual audio file');
  console.log('ℹ️ Frontend will handle MediaRecorder → FormData → /api/voice/process-audio');

  console.log('\n🎉 Enhanced Voice System Test Complete!');
  console.log('\nNew Features:');
  console.log('• ElevenLabs Speech-to-Text (high accuracy)');
  console.log('• OpenAI-powered natural language understanding');
  console.log('• Intelligent conversation about invoices');
  console.log('• Automatic action detection (show invoice, filter, etc.)');
  console.log('• Enhanced ElevenLabs TTS with Rachel voice');
  console.log('• Fallback to browser STT/TTS when needed');
}

// Run the test
testEnhancedVoiceSystem().catch(console.error);