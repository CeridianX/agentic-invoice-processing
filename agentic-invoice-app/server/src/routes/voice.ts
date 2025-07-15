import express from 'express';
import multer from 'multer';
import { VoiceQueryService } from '../services/VoiceQueryService';
import { OpenAIQueryService } from '../services/OpenAIQueryService';
import { ElevenLabsService } from '../services/ElevenLabsService';

const router = express.Router();

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for ElevenLabs
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Initialize voice services
const voiceQueryService = new VoiceQueryService();
const openAIQueryService = new OpenAIQueryService();
const elevenLabsService = new ElevenLabsService();

// Process voice query with OpenAI intelligence
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        type: 'error',
        message: 'Query parameter is required and must be a string'
      });
    }

    console.log(`🧠 Processing intelligent voice query: "${query}"`);
    
    const result = await openAIQueryService.processIntelligentQuery(query);
    
    console.log(`🤖 AI query result: "${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}"`);
    
    res.json({
      type: 'intelligent_response',
      message: result.response,
      action: result.action,
      data: result.data,
      invoiceId: result.invoiceId
    });

  } catch (error) {
    console.error('Error in intelligent voice query endpoint:', error);
    res.status(500).json({
      type: 'error',
      message: 'Internal server error while processing voice query'
    });
  }
});

// Legacy endpoint for backward compatibility
router.post('/query-legacy', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        type: 'error',
        message: 'Query parameter is required and must be a string'
      });
    }

    console.log(`🎤 Processing legacy voice query: "${query}"`);
    
    const result = await voiceQueryService.processQuery(query);
    
    console.log(`🔊 Legacy query result: ${result.type} - ${result.message}`);
    
    res.json(result);

  } catch (error) {
    console.error('Error in legacy voice query endpoint:', error);
    res.status(500).json({
      type: 'error',
      message: 'Internal server error while processing voice query'
    });
  }
});

// ElevenLabs Speech-to-Text endpoint
router.post('/transcribe', upload.single('audio'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Audio file is required'
      });
    }

    console.log(`🎤 Received audio file: ${req.file.size} bytes, type: ${req.file.mimetype}`);

    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({
        error: 'ElevenLabs service not available',
        fallback: 'Use browser speech recognition instead'
      });
    }

    const transcriptionOptions = {
      temperature: req.body.temperature ? parseFloat(req.body.temperature) : 0.0,
      language: req.body.language || undefined,
      diarization: req.body.diarization === 'true'
    };

    const transcription = await elevenLabsService.transcribeAudio(req.file.buffer, transcriptionOptions);

    if (!transcription) {
      return res.status(500).json({
        error: 'Failed to transcribe audio'
      });
    }

    console.log(`📝 Transcription result: "${transcription.text}"`);

    res.json({
      success: true,
      text: transcription.text,
      language: transcription.language,
      speakers: transcription.speakers,
      originalSize: req.file.size,
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('Error in transcription endpoint:', error);
    res.status(500).json({
      error: 'Internal server error while transcribing audio'
    });
  }
});

// Combined STT + AI Processing endpoint
router.post('/process-audio', upload.single('audio'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Audio file is required'
      });
    }

    console.log(`🎤 Processing audio file: ${req.file.size} bytes`);

    // Step 1: Transcribe with ElevenLabs STT
    let transcriptionText = '';
    if (elevenLabsService.isAvailable()) {
      const transcription = await elevenLabsService.transcribeAudio(req.file.buffer);
      transcriptionText = transcription?.text || '';
      console.log(`📝 ElevenLabs transcribed: "${transcriptionText}"`);
    }

    if (!transcriptionText) {
      return res.status(500).json({
        error: 'Failed to transcribe audio'
      });
    }

    // Step 2: Process with OpenAI intelligence
    const aiResult = await openAIQueryService.processIntelligentQuery(transcriptionText);
    
    console.log(`🤖 AI processed result: "${aiResult.response.substring(0, 100)}"`);

    res.json({
      success: true,
      originalQuery: transcriptionText,
      response: aiResult.response,
      action: aiResult.action,
      data: aiResult.data,
      invoiceId: aiResult.invoiceId,
      type: 'intelligent_response'
    });

  } catch (error) {
    console.error('Error in audio processing endpoint:', error);
    res.status(500).json({
      error: 'Internal server error while processing audio'
    });
  }
});

// Generate high-quality speech using ElevenLabs
router.post('/speak', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Text parameter is required and must be a string'
      });
    }

    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({
        error: 'ElevenLabs service not available',
        fallback: 'Use browser text-to-speech instead'
      });
    }

    console.log(`🎤 Generating speech for: "${text}"`);
    
    const audioBuffer = await elevenLabsService.generateSpeech(text);
    
    if (!audioBuffer) {
      return res.status(500).json({
        error: 'Failed to generate speech'
      });
    }

    // Return audio as base64 for easy frontend consumption
    const audioBase64 = audioBuffer.toString('base64');
    
    res.json({
      success: true,
      audio: audioBase64,
      format: 'mp3',
      text: text
    });

  } catch (error) {
    console.error('Error in speech generation endpoint:', error);
    res.status(500).json({
      error: 'Internal server error while generating speech'
    });
  }
});

// Get voice service status
router.get('/status', async (req, res) => {
  try {
    const elevenLabsAvailable = elevenLabsService.isAvailable();
    const voiceInfo = elevenLabsAvailable ? await elevenLabsService.getVoiceInfo() : null;
    
    res.json({
      available: true,
      elevenLabs: {
        available: elevenLabsAvailable,
        voice: voiceInfo
      },
      features: {
        speechRecognition: 'browser-dependent',
        textToSpeech: elevenLabsAvailable ? 'elevenlabs' : 'browser-dependent',
        voiceQueries: true,
        invoiceSearch: true,
        highQualityVoice: elevenLabsAvailable
      },
      supportedQueries: [
        'Invoice status queries (e.g., "What\'s the status of invoice ABC-123?")',
        'Invoice search (e.g., "Show me pending invoices")',
        'General information (e.g., "How many invoices do I have?")'
      ]
    });
  } catch (error) {
    console.error('Error getting voice service status:', error);
    res.status(500).json({
      available: false,
      error: 'Failed to get voice service status'
    });
  }
});

// Get available voices
router.get('/voices', async (req, res) => {
  try {
    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({
        error: 'ElevenLabs service not available',
        voices: []
      });
    }

    const voices = await elevenLabsService.getAvailableVoices();
    res.json({
      voices,
      currentVoice: await elevenLabsService.getVoiceInfo()
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({
      error: 'Failed to fetch available voices'
    });
  }
});

// Test voice query processing (for development)
router.post('/test', async (req, res) => {
  try {
    const testQueries = [
      "What's the status of invoice DEMO-2025-0001?",
      "Show me pending invoices", 
      "How many invoices do I have?",
      "Find invoices with exceptions"
    ];

    const results = [];
    
    for (const query of testQueries) {
      const result = await voiceQueryService.processQuery(query);
      results.push({ query, result });
    }

    res.json({
      testResults: results,
      message: 'Voice query test completed successfully'
    });

  } catch (error) {
    console.error('Error in voice query test:', error);
    res.status(500).json({
      error: 'Failed to run voice query test'
    });
  }
});

export default router;