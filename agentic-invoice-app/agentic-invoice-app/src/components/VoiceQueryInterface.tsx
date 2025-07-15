import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceQueryInterfaceProps {
  onQueryResult?: (query: string, result: any) => void;
  onInvoiceSelect?: (invoiceId: string) => void;
}

interface QueryResult {
  type: 'invoice_status' | 'invoice_search' | 'general_info' | 'error';
  data?: any;
  message: string;
  invoiceId?: string;
}

export default function VoiceQueryInterface({ onQueryResult, onInvoiceSelect }: VoiceQueryInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [lastResult, setLastResult] = useState<QueryResult | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [useElevenLabsSTT, setUseElevenLabsSTT] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setLastQuery(transcript);
        processVoiceQuery(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsProcessing(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Process voice query and determine intent
  const processVoiceQuery = async (query: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/voice/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      setLastResult(result);
      
      // Speak the result if not muted
      if (!isMuted && result.message) {
        await speakText(result.message);
      }

      // Trigger callbacks
      if (onQueryResult) {
        onQueryResult(query, result);
      }

      if (result.invoiceId && onInvoiceSelect) {
        onInvoiceSelect(result.invoiceId);
      }

    } catch (error) {
      console.error('Error processing voice query:', error);
      const errorResult: QueryResult = {
        type: 'error',
        message: 'Sorry, I couldn\'t process your request. Please try again.'
      };
      setLastResult(errorResult);
      
      if (!isMuted) {
        await speakText(errorResult.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Text-to-speech function with ElevenLabs fallback to browser
  const speakText = async (text: string) => {
    if (isMuted) return;

    try {
      // Try ElevenLabs first for high-quality voice
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/voice/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.audio) {
          // Play ElevenLabs audio
          const audioData = `data:audio/mp3;base64,${result.audio}`;
          const audio = new Audio(audioData);
          await audio.play();
          return;
        }
      }
    } catch (error) {
      console.log('ElevenLabs not available, falling back to browser TTS');
    }

    // Fallback to browser text-to-speech
    if (synthRef.current) {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      synthRef.current.speak(utterance);
    }
  };

  // Initialize ElevenLabs STT with MediaRecorder
  const initializeElevenLabsSTT = useCallback(async () => {
    try {
      console.log('🎤 Initializing ElevenLabs STT...');
      
      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaRecorder not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      console.log('✅ Got media stream');

      // Check supported mime types
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg'
      ];
      
      let mimeType = 'audio/webm';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      console.log(`📼 Using MIME type: ${mimeType}`);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log(`📊 Audio chunk received: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log(`🎵 Recording stopped, ${audioChunksRef.current.length} chunks collected`);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(`📦 Created audio blob: ${audioBlob.size} bytes`);
        
        await processAudioWithElevenLabs(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      console.log('✅ ElevenLabs STT initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing ElevenLabs STT:', error);
      setUseElevenLabsSTT(false);
      initializeSpeechRecognition();
    }
  }, []);

  // Process audio with ElevenLabs STT + OpenAI
  const processAudioWithElevenLabs = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      console.log(`🎤 Processing audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      
      console.log('🌐 Sending audio to ElevenLabs STT + OpenAI processing...');
      console.log(`📡 API URL: ${import.meta.env.VITE_API_BASE_URL}/api/voice/process-audio`);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/voice/process-audio`, {
        method: 'POST',
        body: formData,
      });

      console.log(`📥 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Server error: ${response.status} - ${errorText}`);
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Processing result:', result);
      
      if (result.success) {
        console.log(`✅ Transcribed: "${result.originalQuery}"`);
        console.log(`🤖 AI Response: "${result.response.substring(0, 100)}..."`);
        
        setLastQuery(result.originalQuery);
        setLastResult({
          type: result.type,
          message: result.response,
          data: result.data,
          invoiceId: result.invoiceId
        });
        
        // Speak the response if not muted
        if (!isMuted && result.response) {
          console.log('🔊 Speaking response...');
          await speakText(result.response);
        }

        // Trigger callbacks
        if (onQueryResult) {
          onQueryResult(result.originalQuery, result);
        }

        if (result.invoiceId && onInvoiceSelect) {
          onInvoiceSelect(result.invoiceId);
        }
      } else {
        console.error('❌ Processing failed:', result);
        throw new Error(result.error || 'Failed to process audio');
      }

    } catch (error) {
      console.error('❌ Error processing audio:', error);
      const errorResult: QueryResult = {
        type: 'error',
        message: 'Sorry, I couldn\'t process your audio. Please try again.'
      };
      setLastResult(errorResult);
      
      if (!isMuted) {
        await speakText(errorResult.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Start voice recognition
  const startListening = () => {
    if (useElevenLabsSTT) {
      startElevenLabsListening();
    } else {
      startBrowserListening();
    }
  };

  // Start ElevenLabs STT
  const startElevenLabsListening = async () => {
    try {
      console.log('🚀 Starting ElevenLabs listening...');
      
      if (!mediaRecorderRef.current) {
        console.log('📱 No MediaRecorder, initializing...');
        await initializeElevenLabsSTT();
      }

      if (mediaRecorderRef.current && !isListening) {
        setIsListening(true);
        setLastQuery('');
        setLastResult(null);
        
        console.log('🎤 Starting MediaRecorder...');
        mediaRecorderRef.current.start(1000); // Collect data every second
        console.log('✅ ElevenLabs STT recording started');
      } else {
        console.warn('⚠️ MediaRecorder not available or already listening');
      }
    } catch (error) {
      console.error('❌ Error starting ElevenLabs STT:', error);
      setUseElevenLabsSTT(false);
      startBrowserListening();
    }
  };

  // Start browser STT (fallback)
  const startBrowserListening = () => {
    if (!recognitionRef.current) {
      initializeSpeechRecognition();
    }

    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setLastQuery('');
      setLastResult(null);
      recognitionRef.current.start();
      console.log('🎤 Started browser STT...');
    }
  };

  // Stop voice recognition
  const stopListening = () => {
    if (useElevenLabsSTT && mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      console.log('🎤 Stopped ElevenLabs STT recording...');
    } else if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log('🎤 Stopped browser STT...');
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-purple-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">AI Voice Assistant</h3>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${useElevenLabsSTT ? 'bg-green-500' : 'bg-orange-500'}`}></span>
            <span className="text-xs text-gray-500">
              {useElevenLabsSTT ? 'ElevenLabs STT' : 'Browser STT'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setUseElevenLabsSTT(!useElevenLabsSTT)}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            title="Toggle STT provider"
          >
            Switch STT
          </button>
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition-colors ${
              isMuted ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* Voice Control Button */}
        <motion.button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`relative p-6 rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : isProcessing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
          whileHover={{ scale: isProcessing ? 1 : 1.05 }}
          whileTap={{ scale: isProcessing ? 1 : 0.95 }}
        >
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
                className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"
              />
            ) : isListening ? (
              <motion.div
                key="listening"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <MicOff size={32} />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Mic size={32} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Listening Animation */}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-red-300"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </motion.button>

        {/* Status Text */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {isProcessing
              ? useElevenLabsSTT 
                ? 'Processing with AI intelligence...'
                : 'Processing your request...'
              : isListening
              ? useElevenLabsSTT
                ? 'Recording with ElevenLabs... Speak now'
                : 'Listening... Speak now'
              : 'Ask anything about your invoices'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {useElevenLabsSTT 
              ? 'Powered by ElevenLabs STT + OpenAI Intelligence'
              : 'Try: "What\'s the status of invoice ABC-123?" or "Show me pending invoices"'
            }
          </p>
        </div>

        {/* Last Query and Result */}
        <AnimatePresence>
          {lastQuery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-3"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900">You asked:</p>
                <p className="text-blue-700">"{lastQuery}"</p>
              </div>

              {lastResult && (
                <div className={`border rounded-lg p-3 ${
                  lastResult.type === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    lastResult.type === 'error' ? 'text-red-900' : 'text-green-900'
                  }`}>
                    {lastResult.type === 'error' ? 'Error:' : 'Response:'}
                  </p>
                  <p className={lastResult.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                    {lastResult.message}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}