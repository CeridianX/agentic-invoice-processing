export class ElevenLabsService {
  private apiKey: string | null;
  private voiceId: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || null;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

    console.log(`🔑 ElevenLabs API Key: ${this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT FOUND'}`);
    console.log(`🗣️ Voice ID: ${this.voiceId}`);

    if (this.apiKey) {
      console.log('✅ ElevenLabs service initialized with STT and TTS support');
    } else {
      console.warn('⚠️ ElevenLabs API key not found. Voice features will use browser fallback.');
    }
  }

  public isAvailable(): boolean {
    return this.apiKey !== null;
  }

  public async generateSpeech(text: string): Promise<Buffer | null> {
    if (!this.isAvailable()) {
      console.warn('ElevenLabs not available, skipping speech generation');
      return null;
    }

    try {
      console.log(`🗣️ Generating speech for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey!
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        return null;
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`🎵 Generated ${audioBuffer.length} bytes of audio`);
      
      return audioBuffer;
    } catch (error) {
      console.error('Error generating speech with ElevenLabs:', error);
      return null;
    }
  }

  public async getAvailableVoices() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey!
        }
      });

      if (!response.ok) {
        console.error(`Error fetching voices: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return (data as any).voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description
      }));
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  public async getVoiceInfo(voiceId?: string) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const targetVoiceId = voiceId || this.voiceId;
      const response = await fetch(`${this.baseUrl}/voices/${targetVoiceId}`, {
        headers: {
          'xi-api-key': this.apiKey!
        }
      });

      if (!response.ok) {
        console.error(`Error fetching voice info: ${response.status}`);
        return null;
      }

      const voice = await response.json();
      return {
        id: (voice as any).voice_id,
        name: (voice as any).name,
        category: (voice as any).category,
        description: (voice as any).description,
        settings: (voice as any).settings
      };
    } catch (error) {
      console.error('Error fetching voice info:', error);
      return null;
    }
  }

  public async transcribeAudio(audioBuffer: Buffer, options?: {
    temperature?: number;
    language?: string;
    diarization?: boolean;
  }): Promise<{
    text: string;
    language?: string;
    speakers?: Array<{ text: string; speaker: string; timestamp: number }>;
  } | null> {
    if (!this.isAvailable()) {
      console.warn('ElevenLabs not available, skipping transcription');
      return null;
    }

    try {
      console.log(`🎤 Transcribing ${audioBuffer.length} bytes of audio`);
      
      const formData = new FormData();
      
      // Create a blob from the buffer
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
      formData.append('audio_file', audioBlob, 'audio.webm');
      
      // Add optional parameters
      if (options?.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }
      if (options?.language) {
        formData.append('language', options.language);
      }
      if (options?.diarization) {
        formData.append('diarization', 'true');
      }

      const response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey!
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs STT error: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();
      console.log(`📝 Transcribed: "${(result as any).text?.substring(0, 100)}${(result as any).text?.length > 100 ? '...' : ''}"`);
      
      return {
        text: (result as any).text || '',
        language: (result as any).detected_language,
        speakers: (result as any).speakers || []
      };
    } catch (error) {
      console.error('Error transcribing audio with ElevenLabs:', error);
      return null;
    }
  }
}