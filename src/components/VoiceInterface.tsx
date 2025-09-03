'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceService } from '@/services/voice/VoiceService';
import { useAIStore } from '@/store/aiStore';
import { useCalendarStore } from '@/store/calendarStore';

interface VoiceInterfaceProps {
  onCommand?: (command: string, parameters: any) => void;
  autoStart?: boolean;
  wakeWordEnabled?: boolean;
}

export function VoiceInterface({ 
  onCommand, 
  autoStart = false,
  wakeWordEnabled = false 
}: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingForCommand, setIsWaitingForCommand] = useState(false);
  
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { addMessage, setListening } = useAIStore();
  const { addEvent } = useCalendarStore();

  // Voice Service 초기화
  useEffect(() => {
    voiceServiceRef.current = new VoiceService({
      language: 'ko-KR',
      continuous: wakeWordEnabled,
      interimResults: true
    });

    // 음성 목록 로드
    voiceServiceRef.current.getVoices().then(voices => {
      console.log('Available voices:', voices.filter(v => v.lang.startsWith('ko')));
    });

    return () => {
      if (voiceServiceRef.current) {
        voiceServiceRef.current.stopListening();
        voiceServiceRef.current.stopSpeaking();
      }
    };
  }, [wakeWordEnabled]);

  // 자동 시작
  useEffect(() => {
    if (autoStart) {
      startListening();
    }
  }, [autoStart]);

  // 음성 인식 시작
  const startListening = useCallback(async () => {
    if (!voiceServiceRef.current) return;
    
    try {
      setError(null);
      setIsListening(true);
      setListening(true);
      
      await voiceServiceRef.current.startListening(
        (text, isFinal) => {
          if (isFinal) {
            setTranscript(text);
            setInterimTranscript('');
            handleVoiceInput(text);
          } else {
            setInterimTranscript(text);
          }
          
          // 침묵 감지를 위한 타이머 리셋
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          if (isFinal && !wakeWordEnabled) {
            // 3초 후 자동 중지 (웨이크 워드 모드가 아닐 때)
            silenceTimerRef.current = setTimeout(() => {
              stopListening();
            }, 3000);
          }
        },
        (error) => {
          setError(`음성 인식 오류: ${error}`);
          setIsListening(false);
          setListening(false);
        }
      );
    } catch (err) {
      console.error('Failed to start listening:', err);
      setError('음성 인식을 시작할 수 없습니다.');
      setIsListening(false);
      setListening(false);
    }
  }, [wakeWordEnabled]);

  // 음성 인식 중지
  const stopListening = useCallback(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.stopListening();
      setIsListening(false);
      setListening(false);
      setInterimTranscript('');
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    }
  }, []);

  // 음성 입력 처리
  const handleVoiceInput = useCallback(async (text: string) => {
    if (!voiceServiceRef.current) return;
    
    // 웨이크 워드 감지
    if (wakeWordEnabled && !isWaitingForCommand) {
      if (voiceServiceRef.current.detectWakeWord(text)) {
        setIsWaitingForCommand(true);
        await speak('네, 무엇을 도와드릴까요?');
        return;
      }
    }
    
    // 명령 처리
    if (!wakeWordEnabled || isWaitingForCommand) {
      const { command, parameters } = voiceServiceRef.current.parseVoiceCommand(text);
      
      // 사용자 메시지 저장
      addMessage({
        id: `voice-${Date.now()}`,
        role: 'user',
        content: text,
        type: 'voice',
        timestamp: new Date(),
        metadata: { source: 'voice' }
      });
      
      // 명령 처리
      await processCommand(command, parameters);
      
      // 외부 핸들러 호출
      if (onCommand) {
        onCommand(command, parameters);
      }
      
      setIsWaitingForCommand(false);
    }
  }, [wakeWordEnabled, isWaitingForCommand, onCommand]);

  // 명령 처리
  const processCommand = async (command: string, parameters: any) => {
    let response = '';
    
    switch (command) {
      case 'create_event':
        response = '일정을 추가하겠습니다.';
        // 실제 일정 추가 로직
        const mockEvent = {
          id: `voice-event-${Date.now()}`,
          summary: parameters.text,
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 60*60*1000).toISOString() }
        };
        addEvent(mockEvent);
        break;
        
      case 'show_events':
        response = '오늘의 일정을 확인하겠습니다.';
        break;
        
      case 'delete_event':
        response = '일정을 삭제하겠습니다.';
        break;
        
      case 'help':
        response = '사용 가능한 명령어는 일정 추가, 일정 확인, 일정 삭제입니다.';
        break;
        
      default:
        response = '알겠습니다. 처리하겠습니다.';
    }
    
    // AI 응답 저장
    addMessage({
      id: `voice-response-${Date.now()}`,
      role: 'assistant',
      content: response,
      type: 'voice',
      timestamp: new Date(),
      metadata: { source: 'voice' }
    });
    
    // 음성으로 응답
    await speak(response);
  };

  // TTS 실행
  const speak = async (text: string) => {
    if (!voiceServiceRef.current) return;
    
    try {
      setIsSpeaking(true);
      await voiceServiceRef.current.speak(text, {
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      });
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setIsSpeaking(false);
    }
  };

  // 토글 리스닝
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 메인 버튼 */}
      <button
        onClick={toggleListening}
        disabled={isSpeaking}
        className={`
          w-16 h-16 rounded-full shadow-lg transition-all duration-300
          ${isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
          }
          ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}
          flex items-center justify-center
        `}
        aria-label={isListening ? '음성 인식 중지' : '음성 인식 시작'}
      >
        {isListening ? (
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* 상태 표시 */}
      {(isListening || transcript || interimTranscript) && (
        <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-lg p-4 min-w-[250px] max-w-[350px]">
          {/* 상태 인디케이터 */}
          <div className="flex items-center gap-2 mb-2">
            {isListening && (
              <span className="flex items-center gap-1 text-sm text-red-600">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                듣는 중...
              </span>
            )}
            {isSpeaking && (
              <span className="flex items-center gap-1 text-sm text-blue-600">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                말하는 중...
              </span>
            )}
            {isWaitingForCommand && (
              <span className="text-sm text-green-600">
                명령 대기 중...
              </span>
            )}
          </div>

          {/* 음성 인식 결과 */}
          {(transcript || interimTranscript) && (
            <div className="text-sm">
              {transcript && (
                <p className="text-gray-900 mb-1">
                  {transcript}
                </p>
              )}
              {interimTranscript && (
                <p className="text-gray-500 italic">
                  {interimTranscript}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="absolute bottom-20 right-0 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* 웨이크 워드 상태 */}
      {wakeWordEnabled && !isWaitingForCommand && (
        <div className="absolute top-0 right-0 -mt-2 -mr-2">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>
      )}
    </div>
  );
}