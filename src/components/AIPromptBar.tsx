'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  ArrowUp, 
  Camera,
  Plus,
  RotateCcw,
  Layers,
  Home,
  Square,
  Image
} from 'lucide-react';

const SUGGESTIONS = [
  "내일 오후 3시 회의",
  "다음주 수요일 오후 4시 스타벅스에서 김철수님과 미팅",
  "매주 월요일 오전 10시 팀 정기회의",
  "오늘 오후 2시 회의실A에서 분기 보고",
  "이번주 금요일 하루종일 연차",
];

interface AIPromptBarProps {
  onSubmit?: (text: string, imageData?: string) => void | Promise<void>;
  className?: string;
  autoFocus?: boolean;
  isProcessing?: boolean;
  locale?: 'ko' | 'en';
  sessionId?: string;
  focusLevel?: 'background' | 'medium' | 'focus';
  onFocusLevelChange?: (level: 'background' | 'medium' | 'focus') => void;
}

export function AIPromptBar({ 
  onSubmit, 
  className = '', 
  autoFocus = false, 
  isProcessing = false,
  locale = 'ko',
  sessionId = `session-${Date.now()}`,
  focusLevel = 'background',
  onFocusLevelChange
}: AIPromptBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = useCallback(async (text?: string) => {
    const query = text || inputValue;
    if (!query.trim() || isProcessing) return;
    
    if (onSubmit) {
      await onSubmit(query);
    }
    
    setInputValue('');
    setShowSuggestions(false);
    setIsImportant(false);
  }, [inputValue, isProcessing, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceToggle = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = locale === 'ko' ? 'ko-KR' : 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      if (!isRecording) {
        setIsRecording(true);
        recognition.start();
        
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          
          setInputValue(transcript);
          
          if (event.results[0].isFinal) {
            handleSubmit(transcript);
            setIsRecording(false);
          }
        };
        
        recognition.onerror = () => {
          setIsRecording(false);
        };
        
        recognition.onend = () => {
          setIsRecording(false);
        };
      } else {
        recognition.stop();
        setIsRecording(false);
      }
    } else {
      alert(locale === 'ko' ? '음성 인식이 지원되지 않는 브라우저입니다.' : 'Speech recognition is not supported in this browser.');
    }
  };

  const priorityStyles = isImportant ? {
    bg: 'bg-amber-50/95 dark:bg-amber-950/95',
    border: 'border-amber-500/30',
    glow: 'ring-amber-500/30'
  } : {
    bg: 'bg-white/95 dark:bg-black/95',
    border: 'border-white/20 dark:border-white/10',
    glow: 'ring-primary/60'
  };

  return (
    <div className={`relative w-full ${className}`}>
      <motion.div
        className={`relative flex flex-col gap-0 p-2 rounded-2xl transition-all ${priorityStyles.bg} backdrop-blur-2xl shadow-lg border ${priorityStyles.border} ${isFocused ? `ring-2 ${priorityStyles.glow}` : ''}`}
        animate={{
          scale: isFocused ? 1.02 : 1,
          boxShadow: isImportant 
            ? '0 0 30px rgba(251, 191, 36, 0.2)' 
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
        <div className="flex items-center gap-3 px-2 py-1">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(e.target.value.length === 0 && isFocused);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isImportant 
              ? (locale === 'ko' ? "⭐ 중요한 일정을 입력하세요" : "⭐ Enter important event")
              : (locale === 'ko' ? "무엇이든 입력하세요" : "Enter anything")}
            className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground/60 py-2"
            disabled={isProcessing}
          />
        </div>
        
        <div className="h-px bg-border/20 mx-2" />
        
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
              onClick={() => {}}
              disabled={isProcessing}
            >
              <Plus className="h-4 w-4" />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
              onClick={() => {}}
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4 text-gray-400" />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className={`h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center ${
                focusLevel !== 'background' ? 'bg-primary/10' : ''
              }`}
              onClick={() => {
                if (onFocusLevelChange) {
                  // Cycle through focus levels: background -> medium -> focus -> background
                  const nextLevel = 
                    focusLevel === 'background' ? 'medium' :
                    focusLevel === 'medium' ? 'focus' : 'background';
                  onFocusLevelChange(nextLevel);
                }
              }}
              title={
                locale === 'ko' 
                  ? `캘린더 투명도 조절 (현재: ${
                      focusLevel === 'background' ? '흐림' : 
                      focusLevel === 'medium' ? '중간' : '선명'
                    })` 
                  : `Adjust Calendar Opacity (Current: ${
                      focusLevel === 'background' ? 'Faded' : 
                      focusLevel === 'medium' ? 'Medium' : 'Clear'
                    })`
              }
            >
              <Layers className={`h-4 w-4 ${
                focusLevel === 'focus' ? 'text-primary' :
                focusLevel === 'medium' ? 'text-primary/60' : ''
              }`} />
            </motion.button>
          </div>
          
          <div className="flex items-center gap-1">
            <motion.button
              onClick={() => setIsImportant(!isImportant)}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                isImportant 
                  ? "bg-amber-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {isImportant ? "⭐ " : ""}{locale === 'ko' ? "중요" : "Important"}
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Camera className="h-4 w-4" />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className={`h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center ${
                isRecording ? "bg-red-500/10" : ""
              }`}
              onClick={handleVoiceToggle}
              disabled={isProcessing}
            >
              <Mic className={`h-4 w-4 ${isRecording ? "text-red-500 animate-pulse" : ""}`} />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className={`h-8 px-3 rounded-lg ml-2 transition-all flex items-center justify-center ${
                isProcessing 
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-md"
                  : !inputValue.trim() 
                    ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                    : "bg-primary hover:bg-primary/90 text-white shadow-md"
              }`}
              onClick={() => {
                if (isProcessing) {
                  // Stop processing
                } else {
                  handleSubmit();
                }
              }}
              disabled={!inputValue.trim() && !isProcessing}
            >
              {isProcessing ? (
                <Square className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showSuggestions && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="absolute top-full mt-2 w-full z-50"
          >
            <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg overflow-hidden">
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-3 py-1">
                  {locale === 'ko' ? '제안' : 'Suggestions'}
                </p>
                {SUGGESTIONS.map((suggestion, index) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                    onClick={() => {
                      setInputValue(suggestion);
                      setShowSuggestions(false);
                      handleSubmit(suggestion);
                    }}
                  >
                    <span className="text-sm">{suggestion}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && onSubmit) {
            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = reader.result as string;
              
              // Send to parent component with image data
              const message = locale === 'ko' 
                ? '이 이미지에서 일정을 찾아줘' 
                : 'Find schedule in this image';
              
              await onSubmit(message, base64);
            };
            reader.readAsDataURL(file);
          }
        }}
      />
    </div>
  );
}