export interface VoiceConfig {
  language: 'ko-KR' | 'en-US';
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

export class VoiceService {
  private recognition: any;
  private synthesis: SpeechSynthesisUtterance | null = null;
  private isListening: boolean = false;
  private config: VoiceConfig;

  constructor(config?: Partial<VoiceConfig>) {
    this.config = {
      language: config?.language || 'ko-KR',
      continuous: config?.continuous ?? false,
      interimResults: config?.interimResults ?? true,
      maxAlternatives: config?.maxAlternatives || 1
    };

    this.initializeSpeechRecognition();
  }

  /**
   * 음성 인식 초기화
   */
  private initializeSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
  }

  /**
   * 음성 인식 시작
   */
  startListening(
    onResult?: (transcript: string, isFinal: boolean) => void,
    onError?: (error: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech Recognition not available'));
        return;
      }

      if (this.isListening) {
        console.warn('Already listening');
        resolve();
        return;
      }

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('Voice recognition started');
        resolve();
      };

      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        const isFinal = event.results[last].isFinal;

        if (onResult) {
          onResult(transcript, isFinal);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        this.isListening = false;
        
        if (onError) {
          onError(event.error);
        }
        
        // 특정 에러에 대한 자동 재시작
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          setTimeout(() => {
            if (this.config.continuous) {
              this.startListening(onResult, onError);
            }
          }, 1000);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        console.log('Voice recognition ended');
        
        // continuous 모드에서 자동 재시작
        if (this.config.continuous) {
          setTimeout(() => {
            this.startListening(onResult, onError);
          }, 100);
        }
      };

      try {
        this.recognition.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 음성 인식 중지
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * 텍스트를 음성으로 변환 (TTS)
   */
  speak(
    text: string,
    options?: {
      voice?: SpeechSynthesisVoice;
      rate?: number;
      pitch?: number;
      volume?: number;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        reject(new Error('Speech Synthesis not available'));
        return;
      }

      // 이전 음성 중지
      window.speechSynthesis.cancel();

      this.synthesis = new SpeechSynthesisUtterance(text);
      this.synthesis.lang = this.config.language;
      
      if (options?.voice) {
        this.synthesis.voice = options.voice;
      } else {
        // 한국어 음성 찾기
        const voices = window.speechSynthesis.getVoices();
        const koreanVoice = voices.find(v => v.lang.startsWith('ko'));
        if (koreanVoice) {
          this.synthesis.voice = koreanVoice;
        }
      }

      this.synthesis.rate = options?.rate || 1.0;
      this.synthesis.pitch = options?.pitch || 1.0;
      this.synthesis.volume = options?.volume || 1.0;

      this.synthesis.onend = () => {
        resolve();
      };

      this.synthesis.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        reject(event);
      };

      window.speechSynthesis.speak(this.synthesis);
    });
  }

  /**
   * 음성 출력 중지
   */
  stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * 사용 가능한 음성 목록 가져오기
   */
  getVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve([]);
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        // 음성이 로드되지 않은 경우 대기
        window.speechSynthesis.onvoiceschanged = () => {
          resolve(window.speechSynthesis.getVoices());
        };
      }
    });
  }

  /**
   * 언어 설정 변경
   */
  setLanguage(language: 'ko-KR' | 'en-US') {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * 현재 듣고 있는지 확인
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * 음성 명령 파서
   */
  parseVoiceCommand(transcript: string): {
    command: string;
    parameters: any;
  } {
    const lowerTranscript = transcript.toLowerCase();
    
    // 일정 추가 명령
    if (lowerTranscript.includes('일정') && (
        lowerTranscript.includes('추가') || 
        lowerTranscript.includes('만들')
    )) {
      return {
        command: 'create_event',
        parameters: { text: transcript }
      };
    }
    
    // 일정 확인 명령
    if (lowerTranscript.includes('일정') && (
        lowerTranscript.includes('확인') || 
        lowerTranscript.includes('보여')
    )) {
      return {
        command: 'show_events',
        parameters: { text: transcript }
      };
    }
    
    // 일정 삭제 명령
    if (lowerTranscript.includes('일정') && (
        lowerTranscript.includes('삭제') || 
        lowerTranscript.includes('취소')
    )) {
      return {
        command: 'delete_event',
        parameters: { text: transcript }
      };
    }
    
    // 도움말 명령
    if (lowerTranscript.includes('도움말') || 
        lowerTranscript.includes('명령어')) {
      return {
        command: 'help',
        parameters: {}
      };
    }
    
    // 기본 대화
    return {
      command: 'conversation',
      parameters: { text: transcript }
    };
  }

  /**
   * 웨이크 워드 감지
   */
  detectWakeWord(transcript: string, wakeWords: string[] = ['헤이 캘린더', '안녕 캘린더']): boolean {
    const lowerTranscript = transcript.toLowerCase();
    return wakeWords.some(word => lowerTranscript.includes(word.toLowerCase()));
  }
}